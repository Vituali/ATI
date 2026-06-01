# Design Arquitetural — Banco de Dados Híbrido (RTDB + Firestore)

Este documento apresenta a proposta de modelagem para a migração do sistema da **Extensão ATI V2** para um modelo híbrido de banco de dados, utilizando o **Firebase Realtime Database** e o **Cloud Firestore** em conjunto. 

Esta é a arquitetura considerada padrão ouro no Firebase, extraindo o melhor de cada tecnologia:
* **Realtime Database:** Latência ultra-baixa, sincronização de presença em tempo real (online/offline) e cache volátil.
* **Cloud Firestore:** Escalabilidade para grandes volumes de dados (como os 22k+ clientes), buscas complexas indexadas e controle fino de permissões.

---

## 🗺️ Distribuição de Dados: O que vai para onde?

| Tipo de Dado | Onde Fica? | Por quê? |
| :--- | :--- | :--- |
| **Clientes (22k+)** | **Cloud Firestore** | Banco de dados escalável, indexação automática de múltiplos campos (nome, CPF, etc.) e custo por documento lido ($0.06 por 100k leituras). |
| **Atendentes (Perfil)** | **Cloud Firestore** | Segurança com regras de acesso por documento, facilidade de gerenciar permissões (`role`, `setor`, `email`). |
| **Presença (Online/Offline)** | **Realtime Database** | Possui suporte nativo à presença física (`onDisconnect`), que altera o status para offline automaticamente quando o atendente fecha o navegador. |
| **Modelos de O.S** | **Cloud Firestore** | Facilidade de buscas complexas e filtros por atendente proprietário. |
| **Respostas Rápidas** | **Cloud Firestore** | Permite queries estruturadas para unir respostas globais (`master`) e respostas individuais do atendente com uma única chamada. |
| **SGP Cache (Tipos Ocorrência)** | **Realtime Database** | Armazenamento de cache temporário do dia. Evita leituras redundantes no Firestore. |

---

## 📐 1. Estrutura no Cloud Firestore (Documental)

### Coleção: `clientes`
Cada cliente é um documento único dentro da coleção. O ID do documento será o próprio `Cliente ID` do SGP (ex: `135097`), tornando as buscas por ID diretas e sem custo de query.

* **ID do Documento:** `135097` (ID do Cliente no SGP)
```json
{
  "nome": "VICTOR HENRIQUE DE OLIVEIRA",
  "nomePesquisa": "victor henrique de oliveira", // Para busca case-insensitive parcial
  "cpf": "11392882702", // CPF sanitizado (sem pontos/traços) para busca exata rápida
  "contratos": [138848, 138849, 138850]
}
```

### Coleção: `atendentes`
Armazena a ficha cadastral do atendente. O ID do documento será o `UID` de autenticação do Firebase.
* **ID do Documento:** `UID_DO_ATENDENTE` (ex: `aB8cd3Efg...`)
```json
{
  "username": "suporte_05",
  "nomeCompleto": "Suporte da Silva",
  "email": "suporte05@ati.com.br",
  "role": "usuario", // usuario | supervisor | moderador | admin
  "setor": "suporte",
  "status": "ativo", // ativo | bloqueado
  "sgpUsername": "suporte_05",
  "avatarUrl": "https://..."
}
```

### Coleção: `respostas_rapidas`
Armazena modelos de mensagens rápidas. O ID do documento pode ser auto-gerado.
* **ID do Documento:** `AUTO_ID`
```json
{
  "username": "suporte_05", // "master" para respostas globais da empresa
  "category": "quick_reply",
  "title": "Aviso de Manutenção",
  "text": "Olá! Informamos que estamos realizando uma manutenção preventiva na sua região..."
}
```

---

## ⚡ 2. Estrutura no Realtime Database (Árvore JSON)

O Realtime Database manterá apenas a presença física instantânea dos usuários e os caches voláteis de sincronização diária.

```json
{
  "presenca": {
    "suporte_05": {
      "status": "online", // online | offline | ocupado
      "lastActive": 1773447132822
    }
  },
  "sgp_cache": {
    "updatedAt": "2026-05-31",
    "occurrenceTypes": [
      { "id": "12", "text": "Sem Conectividade" },
      { "id": "15", "text": "Lentidão Link Principal" }
    ]
  }
}
```

---

## 🛠️ Como Consultar o Firestore via REST API (Sem o SDK pesado)

Como a extensão ATI roda em um Service Worker Manifest V3, **não utilizamos o SDK pesado do Firebase** para economizar memória e garantir compatibilidade. Continuaremos usando requisições `fetch` via REST API.

Aqui estão os templates de consulta exatos do Firestore via REST:

### A. Buscar Cliente pelo ID (Consulta Instantânea - Custo: 1 Read)
Para buscar um cliente quando você já tem o ID dele (ex: `135097`):
* **Método:** `GET`
* **URL:** `https://firestore.googleapis.com/v1/projects/site-ati-75d83/databases/(default)/documents/clientes/135097`

---

### B. Buscar Cliente por CPF (Consulta Indexada - Custo: 1 Read)
Para pesquisar qual cliente tem o CPF `"11392882702"` (sanitizado):
* **Método:** `POST`
* **URL:** `https://firestore.googleapis.com/v1/projects/site-ati-75d83/databases/(default)/documents:runQuery`
* **Headers:** `'Content-Type': 'application/json'`
* **Corpo (Payload):**
```json
{
  "structuredQuery": {
    "from": [{ "collectionId": "clientes" }],
    "where": {
      "fieldFilter": {
        "field": { "fieldPath": "cpf" },
        "op": "EQUAL",
        "value": { "stringValue": "11392882702" }
      }
    },
    "limit": 1
  }
}
```

---

### C. Buscar Respostas Rápidas do Usuário + Respostas Globais (Custo: N Reads)
Para trazer em uma única requisição todas as respostas que pertencem ao usuário `"suporte_05"` **OU** que são globais (`"master"`):
* **Método:** `POST`
* **URL:** `https://firestore.googleapis.com/v1/projects/site-ati-75d83/databases/(default)/documents:runQuery`
* **Corpo (Payload):**
```json
{
  "structuredQuery": {
    "from": [{ "collectionId": "respostas_rapidas" }],
    "where": {
      "fieldFilter": {
        "field": { "fieldPath": "username" },
        "op": "IN",
        "value": {
          "arrayValue": {
            "values": [
              { "stringValue": "master" },
              { "stringValue": "suporte_05" }
            ]
          }
        }
      }
    }
  }
}
```

---

## 📈 Resumo de Benefícios de Custo

1. **Firestore Free Tier (50.000 leituras/dia):** A menos que você tenha centenas de operadores fazendo milhares de buscas por segundo, seu app operará **100% na faixa gratuita** do Firestore.
2. **Presença em Tempo Real de Graça:** O Realtime Database cobrará apenas os bytes das atualizações de status `online` (cerca de 20 bytes por evento), ficando bem longe dos limites de tráfego.
3. **Escalabilidade Sem Dor de Cabeça:** O Firestore criará índices automáticos para o CPF, permitindo buscas instantâneas mesmo quando o banco de dados crescer de 22k para 200k clientes.
