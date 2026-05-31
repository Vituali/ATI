# Firebase — Regras e Estrutura de Dados

Este arquivo documenta as regras de segurança e a estrutura do Realtime Database usado pela extensão.

## 🔒 Regras de Segurança (`.rules`)

```json
{
  "rules": {
    "admins": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "atendentes": {
      ".read": true,
      "$username": {
        ".write": "auth != null && ( (!data.exists() && newData.child('uid').val() === auth.uid) || (data.exists() && (root.child('admins').child(auth.uid).exists() || data.child('uid').val() === auth.uid)) )",
        ".validate": "newData.hasChildren(['uid', 'nomeCompleto', 'role', 'status', 'email'])"
      }
    },
    "respostas": {
      ".read": true,
      "$username": {
        ".write": "root.child('atendentes').child($username).child('uid').val() === auth.uid"
      }
    },
    "modelos_os": {
      ".read": true,
      "$username": {
        ".write": "root.child('atendentes').child($username).child('uid').val() === auth.uid"
      }
    },
    "os_templates_master": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('admins').child(auth.uid).exists()"
    },
    "sgp_cache": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

## 🗄️ Estrutura do Banco de Dados (Schema)

Abaixo está o mapeamento dos nós do banco de dados e os tipos de dados armazenados.

```json
{
  // Lista de administradores globais do sistema
  "admins": {
    "$uid": true // Ex: "E7tiKEeA5AhwWHeqI9ilzbN2ofe2": true
  },

  // Cadastro de atendentes associando Usuário do ChatMix (username) ao Firebase Auth UID
  "atendentes": {
    "$username": { // Ex: "victorh", "igormagalhaes", "helio"
      "email": "string",
      "nomeCompleto": "string",
      "role": "admin" | "usuario",
      "status": "ativo" | "inativo", // (Opcional)
      "uid": "string" // Firebase Auth UID associado ao username
    }
  },

  // Templates de Ordens de Serviço INDIVIDUAIS por atendente
  "modelos_os": {
    "$username": {
      "$templateId": { // ID gerado pelo Firebase ou customizado (ex: "-Oa_o7t1m41WsIs4lzba" ou "old_2")
        "id": "string",
        "category": "string", // Ex: "Suporte", "Financeiro", "GERAL"
        "title": "string",
        "text": "string", // Texto do template (pode conter placeholders [HOJE], [SAUDACAO])
        "occurrenceTypeId": "string", // ID numérico em string referente ao Tipo de Ocorrência no SGP (ex: "1", "3", "42")
        "keywords": ["string"] // (Opcional) Lista de palavras-chave para busca/integração
      }
    }
  },

  // Templates de O.S GLOBAIS (apenas leitura para usuários comuns, gravação para admins)
  "os_templates_master": {
    "os_templates": [
      {
        "title": "string",
        "category": "string",
        "text": "string",
        "occurrenceTypeId": "string",
        "keywords": ["string"] // (Opcional)
      }
    ]
  },

  // Respostas Rápidas (Quick Replies)
  "respostas": {
    "master": [ // Array de quick replies GLOBAIS (compartilhados entre todos)
      {
        "title": "string",
        "category": "quick_reply",
        "subCategory": "string",
        "text": "string"
      }
    ],
    "$username": [ // Array de quick replies INDIVIDUAIS por atendente
      {
        "title": "string",
        "category": "quick_reply",
        "subCategory": "string",
        "text": "string"
      }
    ]
  },

  // Cache gerenciado pelo script de background (Tipos de Ocorrência do SGP)
  // Alimenta também o criador de modelos de O.S no site.
  "sgp_cache": {
    "updatedAt": "YYYY-MM-DD", // Data da última sincronização com o SGP (formato ISO, ex: "2026-03-18")
    "occurrenceTypes": [
      { "id": "string", "text": "string" } // Ex: { "id": "1", "text": "Suporte - Sem Acesso" }
    ]
  }
}
```

### Notas sobre o Modelo Estrutural:

- O banco é centrado na chave `$username` (nome do usuário no ChatMix).
- A relação entre o `uid` (Firebase) e o `$username` (ChatMix) reside no nó `/atendentes/$username/uid`.
- Regras de gravação de segurança exigem que o usuário autenticado só possa escrever nas respostas e modelos de OS que pertençam ao `$username` correspondente ao seu `uid` mapeado no nó `atendentes`.
