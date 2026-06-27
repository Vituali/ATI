# Banco de Dados — ATI V3

Este documento define a estrutura completa do banco de dados PostgreSQL gerenciado via Prisma ORM para o ATI V3,
substituindo o Firebase Realtime Database.

---

## Índice

- [1. Visão Geral](#1-visão-geral)
- [2. Modelos](#2-modelos)
  - [Atendente](#atendente)
  - [SessaoAtendente](#sessaoatendente)
  - [ModeloOS](#modeloos)
  - [QuickReply](#quickreply)
  - [CategoriaOrdem](#categoriaordem)
  - [Anotacao](#anotacao)
  - [ChatRoom](#chatroom)
  - [Mensagem](#mensagem)
  - [LeituraMensagem](#leituramensagem)
  - [HistoricoPotencia](#historicopotencia)
  - [ResumoPotenciaDiario](#resumopotenciadiario)
  - [UsoTemplate](#usotemplate)
  - [AuditLog](#auditlog)
  - [Aviso](#aviso)
  - [BugReport](#bugreport)
  - [Configuracao](#configuracao)
- [3. Fluxo de Template Master](#3-fluxo-de-template-master)
- [4. Indicadores para Relatórios](#4-indicadores-para-relatórios)
- [5. Mapeamento Firebase → PostgreSQL](#5-mapeamento-firebase--postgresql)

---

## 1. Visão Geral

### Premissas

- O banco é 100% PostgreSQL, acessado via Prisma ORM.
- Autenticação permanece no Firebase Auth (login), todo o restante migra para o PostgreSQL.
- Dados do SGP (histórico de potências, tipos de ocorrência) são puxados via query direta no banco SGP (read-only), não via scraping.
- Credenciais de login SGP (`SgpCredential`) são mantidas apenas localmente no chrome.storage da Extension (autologin), não sobem para o servidor.
- Cache de tipos de ocorrência (`SgpCache`) foi removido — substituído por queries diretas ao SGP.
- `customAllowedSections` controla quais abas do Frontend cada usuário pode acessar (array de strings).

### Convenções

- **IDs**: UUID v4 gerado pelo Prisma (`@default(uuid())`).
- **Timestamps**: `DateTime` com `@default(now())` e `@updatedAt` onde aplicável.
- **Relações**: Cascade on delete para dados pertencentes a um usuário.
- **Índices**: `@@index` em colunas usadas em filtros, buscas por período e agrupamentos.

---

## 2. Modelos

### Atendente

```prisma
model Atendente {
  id                    String    @id @default(uuid())
  username              String    @unique
  nomeCompleto          String
  email                 String    @unique
  uid                   String    @unique        // Firebase Auth UID
  role                  String    @default("usuario")
  setor                 String    @default("geral")
  status                String    @default("ativo")
  sgpUsername           String?
  avatarUrl             String?
  customBg              String?
  customAllowedSections String[]                 // ex: ["home","chat_interno","relatorios"]
  ultimoAcesso          DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // Relações
  modelosOs      ModeloOS[]
  quickReplies   QuickReply[]
  categoriaOrdem CategoriaOrdem?
  anotacoes      Anotacao[]
  mensagens      Mensagem[]
  sessoes        SessaoAtendente[]
  avisosCriados  Aviso[]
  bugsReportados BugReport[]
  usoModelos     UsoTemplate[]
  auditoria      AuditLog[]
  leituras       LeituraMensagem[]

  @@index([setor, status])
  @@index([role])
}
```

---

### SessaoAtendente

Rastreia login/logout dos atendentes para relatórios de atividade (quantos ativos por turno, frequência de login, etc.).

```prisma
model SessaoAtendente {
  id          String    @id @default(uuid())
  atendenteId String
  loginAt     DateTime  @default(now())
  logoutAt    DateTime?
  ip          String?

  atendente   Atendente @relation(fields: [atendenteId], references: [id], onDelete: Cascade)

  @@index([atendenteId, loginAt])
  @@index([loginAt])
}
```

---

### ModeloOS

Templates de Ordem de Serviço. Suporta tanto templates individuais do usuário quanto templates base (master).

```prisma
model ModeloOS {
  id                 String    @id @default(uuid())
  atendenteId        String?                       // null = template master
  masterId           String?                       // id do master original (para sync)
  isMaster           Boolean   @default(false)     // true = template base (só admin/supervisor vê)
  category           String
  title              String
  text               String
  occurrenceTypeId   String?
  occurrenceTypeName String?
  occurrenceTypeId53 String?
  keywords           String[]
  usoCount           Int       @default(0)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  atendente          Atendente? @relation(fields: [atendenteId], references: [id], onDelete: Cascade)
  usos               UsoTemplate[]

  @@index([atendenteId, category])
  @@index([isMaster])
  @@index([masterId])
}
```

---

### QuickReply

Respostas rápidas, seguindo o mesmo padrão master + cópia do ModeloOS.

```prisma
model QuickReply {
  id          String    @id @default(uuid())
  atendenteId String?                       // null = master
  masterId    String?                       // id do master original (para sync)
  isMaster    Boolean   @default(false)
  category    String    @default("quick_reply")
  subCategory String
  title       String
  text        String
  ordem       Int       @default(0)         // ordenação dentro da categoria
  usoCount    Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  atendente   Atendente? @relation(fields: [atendenteId], references: [id], onDelete: Cascade)
  usos        UsoTemplate[]

  @@index([atendenteId, subCategory])
  @@index([isMaster])
  @@index([masterId])
}
```

---

### CategoriaOrdem

Armazena a ordem personalizada das categorias de Respostas Rápidas para cada usuário (substitui `categorias_ordem/{username}`).

```prisma
model CategoriaOrdem {
  id          String    @id @default(uuid())
  atendenteId String    @unique
  ordem       String[]                       // lista ordenada de nomes de categorias

  atendente   Atendente @relation(fields: [atendenteId], references: [id], onDelete: Cascade)
}
```

---

### Anotacao

Anotações pessoais do usuário.

```prisma
model Anotacao {
  id          String    @id @default(uuid())
  atendenteId String
  titulo      String?
  texto       String
  concluido   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  atendente   Atendente @relation(fields: [atendenteId], references: [id], onDelete: Cascade)
}
```

---

### ChatRoom

Metadados das salas de chat. As salas são fixas (geral, ti, financeiro, suporte, comercial).

```prisma
model ChatRoom {
  id                String    @id               // geral, ti, financeiro, suporte, comercial
  ultimaMensagem    Json?                        // { autor: "username", timestamp: 123456789 }
  ultimaAtualizacao DateTime  @default(now())

  mensagens         Mensagem[]
}
```

---

### Mensagem

Mensagens do chat interno. `autorNome`/`autorSetor`/`autorAvatar` são denormalizados para exibição em tempo real sem necessidade de JOIN.

```prisma
model Mensagem {
  id          String    @id @default(uuid())
  atendenteId String
  chatRoomId  String
  texto       String
  autorNome   String                           // denormalizado (performance em tempo real)
  autorSetor  String?
  autorAvatar String?
  createdAt   DateTime  @default(now())

  atendente   Atendente         @relation(fields: [atendenteId], references: [id], onDelete: Cascade)
  chatRoom    ChatRoom          @relation(fields: [chatRoomId], references: [id], onDelete: Cascade)
  leituras    LeituraMensagem[]

  @@index([chatRoomId, createdAt])
  @@index([atendenteId, createdAt])
  @@index([createdAt])
}
```

---

### LeituraMensagem

Rastreia quais mensagens foram lidas por quais atendentes. Permite relatórios de engajamento no chat.

```prisma
model LeituraMensagem {
  mensagemId  String
  atendenteId String
  lidaEm      DateTime  @default(now())

  mensagem    Mensagem  @relation(fields: [mensagemId], references: [id], onDelete: Cascade)
  atendente   Atendente @relation(fields: [atendenteId], references: [id], onDelete: Cascade)

  @@id([mensagemId, atendenteId])
}
```

---

### HistoricoPotencia

Registros de medição de potência de clientes. Os dados são populados via query direta ao SGP (não mais via scraping da Extension).

```prisma
model HistoricoPotencia {
  id              String    @id @default(uuid())
  olt             String
  pon             String
  vlan            String?
  clienteId       String
  rx              String?
  tx              String?
  rxOlt           String?
  login           String?
  contrato        String?
  nome            String?
  bairro          String?
  endereco        String?
  servicoId       String?
  contratoId      String?
  serviceUrl      String?
  status          String?                      // normal, alerta, critico — anotado pelo atendente
  statusUpdatedAt DateTime?                    // quando o status foi alterado
  retornoData     DateTime?                    // data de retorno do cliente
  coletadoPor     String?                      // username de quem coletou
  dataColeta      DateTime  @default(now())
  createdAt       DateTime  @default(now())

  @@index([dataColeta, status])
  @@index([clienteId, dataColeta])
  @@index([coletadoPor, dataColeta])
  @@index([dataColeta])
}
```

---

### ResumoPotenciaDiario

Tabela de agregação diária para acelerar dashboards de potência. Populada todo início da manhã via cron/agendador (busca locais com problemas, etc.). Volume estimado: ~12k contratos.

```prisma
model ResumoPotenciaDiario {
  id             String    @id @default(uuid())
  data           DateTime                        // data truncada (sem hora)
  totalRegistros Int
  statusNormal   Int
  statusAlerta   Int
  statusCritico  Int
  coletadoPor    String?

  @@unique([data, coletadoPor])
  @@index([data])
}
```

---

### UsoTemplate

Log detalhado de uso de templates e respostas rápidas. Permite responder "quais templates mais usados esta semana?" e "quem mais usou respostas rápidas?".

```prisma
model UsoTemplate {
  id           String    @id @default(uuid())
  modeloOsId   String?
  quickReplyId String?
  atendenteId  String
  usadoEm      DateTime  @default(now())

  modeloOs     ModeloOS?   @relation(fields: [modeloOsId], references: [id], onDelete: SetNull)
  quickReply   QuickReply? @relation(fields: [quickReplyId], references: [id], onDelete: SetNull)
  atendente    Atendente   @relation(fields: [atendenteId], references: [id], onDelete: Cascade)

  @@index([usadoEm])
  @@index([modeloOsId, usadoEm])
  @@index([quickReplyId, usadoEm])
}
```

---

### AuditLog

Log de auditoria para rastrear ações administrativas importantes:

- Quem alterou permissões de outro usuário?
- Quem criou/removeu um aviso?
- Quem alterou templates master?
- Quem alterou configurações?

```prisma
model AuditLog {
  id          String    @id @default(uuid())
  atendenteId String
  acao        String                         // "criar_modelo", "alterar_role", "criar_aviso", etc.
  entidade    String                         // "modelo_os", "atendente", "aviso", "configuracao"
  entidadeId  String?
  detalhes    Json?
  createdAt   DateTime  @default(now())

  atendente   Atendente @relation(fields: [atendenteId], references: [id], onDelete: Cascade)

  @@index([atendenteId, createdAt])
  @@index([acao, createdAt])
  @@index([createdAt])
}
```

---

### Aviso

Comunicados globais visíveis para todos os atendentes no painel.

```prisma
model Aviso {
  id          String    @id @default(uuid())
  autorId     String
  titulo      String
  texto       String
  tipo        String    @default("info")     // info, warning, critical
  ativo       Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  autor       Atendente @relation(fields: [autorId], references: [id], onDelete: Cascade)

  @@index([ativo, createdAt])
}
```

---

### BugReport

Relatos de bugs enviados pelos usuários.

```prisma
model BugReport {
  id          String    @id @default(uuid())
  autorId     String
  descricao   String
  pagina      String?
  status      String    @default("aberto")   // aberto, em_andamento, resolvido, fechado
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  autor       Atendente @relation(fields: [autorId], references: [id], onDelete: Cascade)

  @@index([status, createdAt])
}
```

---

### Configuracao

Armazenamento chave-valor para configurações globais (thresholds de potência, config da extensão, hosts SGP, etc.).

```prisma
model Configuracao {
  id    String @id @default(uuid())
  chave String @unique
  valor Json
}
```

**Chaves previstas:**

| Chave | Tipo | Descrição |
|---|---|---|
| `potencia_thresholds` | `{ alerta: number, critico: number }` | Limiares de potência |
| `extension` | `{ version: string, forceUpdate: boolean }` | Config da extensão |
| `sgp_hosts` | `[{ label, baseUrl, ... }]` | Hosts SGP disponíveis |

---

## 3. Fluxo de Template Master

### Conceito

- **Masters** (`isMaster = true`, `atendenteId = null`): Templates base criados por supervisores/admins. Não aparecem para usuários comuns.
- **Cópias** (`isMaster = false`, `atendenteId = {userId}`, `masterId = {masterId}`): Templates que pertencem ao usuário, copiados de um master ou criados do zero.

### Novo usuário chega

Quando um novo atendente é criado, o sistema:

1. Busca todos `ModeloOS WHERE isMaster = true`
2. Para cada master, cria uma cópia vinculada:

```typescript
for (const master of masters) {
  await prisma.modeloOS.create({
    data: {
      atendenteId: novoAtendente.id,
      masterId: master.id,
      isMaster: false,
      category: master.category,
      title: master.title,
      text: master.text,
      occurrenceTypeId: master.occurrenceTypeId,
      occurrenceTypeName: master.occurrenceTypeName,
      occurrenceTypeId53: master.occurrenceTypeId53,
      keywords: master.keywords,
    },
  })
}
```

### "Atualizar Modelos Base"

Quando o usuário clica em "Atualizar Modelos Base", o sistema:

1. Busca todos masters (`isMaster = true`)
2. Busca todos templates do usuário que possuem `masterId`
3. Para cada master:
   - Se o usuário já tem um template com aquele `masterId` → atualiza `text`, `title`, `category`, etc.
   - Se não tem → cria um novo copiando do master
4. Opcionalmente: detecta masters que foram deletados e informa o usuário

```typescript
for (const master of masters) {
  const existente = await prisma.modeloOS.findFirst({
    where: { atendenteId: userId, masterId: master.id },
  })

  if (existente) {
    await prisma.modeloOS.update({
      where: { id: existente.id },
      data: {
        title: master.title,
        text: master.text,
        category: master.category,
        // ... demais campos
      },
    })
  } else {
    await prisma.modeloOS.create({
      data: {
        atendenteId: userId,
        masterId: master.id,
        isMaster: false,
        // ... copia campos do master
      },
    })
  }
}
```

### Futuro: "Deseja popular com um template?"

O campo `masterId` permite implementar no futuro um prompt para o usuário escolher se quer importar os templates master ao se cadastrar, ou pular e criar os próprios do zero. Basta verificar se `count WHERE atendenteId = X AND masterId IS NOT NULL > 0`.

---

## 4. Indicadores para Relatórios

Com a estrutura atual, é possível gerar os seguintes relatórios:

| Relatório | Como | Modelo(s) |
|---|---|---|
| Clientes afetados por mês | `GROUP BY date_trunc('month', dataColeta)` | HistoricoPotencia |
| Status distribution (%) | `GROUP BY status` com índice em `(dataColeta, status)` | HistoricoPotencia |
| Por atendente (coletas realizadas) | `GROUP BY coletadoPor` com índice em `(coletadoPor, dataColeta)` | HistoricoPotencia |
| Resumo diário automático | Consultar `ResumoPotenciaDiario` por data | ResumoPotenciaDiario |
| Templates mais usados | `ORDER BY usoCount DESC` ou agregar UsoTemplate por período | ModeloOS, UsoTemplate |
| Respostas rápidas mais usadas | `ORDER BY usoCount DESC` ou agregar UsoTemplate por período | QuickReply, UsoTemplate |
| Quem mais usou templates | `GROUP BY atendenteId` em UsoTemplate | UsoTemplate |
| Atendentes mais ativos no chat | `GROUP BY atendenteId` em Mensagem | Mensagem |
| Horários de pico no chat | `GROUP BY EXTRACT(HOUR FROM createdAt)` em Mensagem | Mensagem |
| Taxa de login dos atendentes | `GROUP BY date_trunc('day', loginAt)` em SessaoAtendente | SessaoAtendente |
| Atendentes ativos agora | SessaoAtendente com `logoutAt IS NULL` | SessaoAtendente |
| Ações administrativas (auditoria) | `GROUP BY acao` ou filtro por período | AuditLog |
| Bugs por status | `GROUP BY status` | BugReport |
| Engajamento no chat (leitura) | Contar LeituraMensagem por sala/período | LeituraMensagem, Mensagem |

---

## 5. Mapeamento Firebase → PostgreSQL

| Firebase RTDB | PostgreSQL | Status |
|---|---|---|
| `atendentes/` | `Atendente` | Mantido + novos campos |
| `uid_index/` | `Atendente.uid` (unique) | Absorvido |
| `modelos_os/{username}` | `ModeloOS` (isMaster=false) | Mantido + novos campos |
| `os_templates_master/` | `ModeloOS` (isMaster=true) | Absorvido |
| `respostas/{username}` | `QuickReply` (isMaster=false) | Mantido + novos campos |
| `respostas/master` | `QuickReply` (isMaster=true) | Absorvido |
| `categorias_ordem/{username}` | `CategoriaOrdem` | Absorvido |
| `anotacoes/{username}` | `Anotacao` | Mantido |
| `chat/salas/{room}/mensagens` | `Mensagem` + `ChatRoom` | Reestruturado |
| `chat/meta/{room}` | `ChatRoom.ultimaMensagem` | Absorvido |
| `historico_potencias/` | `HistoricoPotencia` | Mantido + novos campos |
| `avisos/` | `Aviso` | Novo |
| `bugs/` | `BugReport` | Novo |
| `config/` | `Configuracao` | Novo |
| `credenciais/` | — | **Removido** (local apenas na Extension — chrome.storage) |
| `sgp_cache/` + `sgp_cache_53/` | — | **Removido** (substituído por query direta ao SGP) |
| `leitura/` + `leitura-catalog/` | — | Não migrado (fora do escopo) |
| `clientes_cadastro/` | — | Substituído por query direta ao SGP |
| `presenca/` | — | Substituído por WebSocket in-memory |

---

## Resumo de modelos

| # | Modelo | Finalidade |
|---|---|---|
| 1 | `Atendente` | Perfis de usuário |
| 2 | `SessaoAtendente` | Log de login/logout |
| 3 | `ModeloOS` | Templates de OS (master + cópia) |
| 4 | `QuickReply` | Respostas rápidas (master + cópia) |
| 5 | `CategoriaOrdem` | Ordem das categorias de quick reply |
| 6 | `Anotacao` | Anotações pessoais |
| 7 | `ChatRoom` | Salas de chat |
| 8 | `Mensagem` | Mensagens do chat |
| 9 | `LeituraMensagem` | Leitura de mensagens (engajamento) |
| 10 | `HistoricoPotencia` | Medições de potência |
| 11 | `ResumoPotenciaDiario` | Agregação diária de potências |
| 12 | `UsoTemplate` | Log de uso de templates/respostas |
| 13 | `AuditLog` | Auditoria de ações administrativas |
| 14 | `Aviso` | Comunicados globais |
| 15 | `BugReport` | Relatos de bugs |
| 16 | `Configuracao` | Configuração chave-valor |

> **Total: 16 modelos**
