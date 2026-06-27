# ATI Backend — Fastify API

API do ecossistema ATI V3. Substitui gradualmente o Firebase Realtime Database e Cloud Functions.

## Stack

- **Runtime:** Node.js 20 + TypeScript
- **Framework:** Fastify 5
- **ORM:** Prisma + PostgreSQL
- **Validação:** Zod
- **Auth:** Firebase Admin SDK (valida JWT)
- **Real-time:** `@fastify/websocket`

## Desenvolvimento Local

```bash
# 1. Subir PostgreSQL (Docker)
docker compose up -d postgres

# 2. Copiar .env
cp .env.example .env

# 3. Instalar deps
npm install

# 4. Gerar Prisma Client e criar tabelas
npm run db:generate
npm run db:push

# 5. Rodar em dev (hot-reload)
npm run dev

# Ou pela raiz do monorepo:
npm run dev:api
```

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Dev com hot-reload (tsx watch) |
| `npm run build` | Compila TypeScript |
| `npm run start` | Sobe build de produção |
| `npm run db:generate` | Gera Prisma Client |
| `npm run db:push` | Sincroniza schema com o banco |
| `npm run db:migrate` | Cria migration |
| `npm run db:studio` | Prisma Studio (GUI do banco) |

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/health` | ❌ | Health check |
| (mais rotas serão adicionadas nas próximas fases) |

## Estrutura

```
Backend/
├── src/
│   ├── index.ts          # Entry point
│   ├── app.ts            # App setup
│   ├── config/env.ts     # Variáveis de ambiente (Zod)
│   ├── plugins/
│   │   ├── auth.ts       # Firebase JWT validation
│   │   └── cors.ts       # CORS
│   ├── routes/
│   │   └── health.ts     # Health check
│   └── lib/
│       └── prisma.ts     # Prisma client
├── prisma/
│   └── schema.prisma     # Database schema
├── docker-compose.yml    # PostgreSQL + API
└── Dockerfile
```

## Modelo Híbrido (Migração)

Durante o desenvolvimento, Frontend e Extensão continuam usando Firebase RTDB normalmente.
A API Fastify roda em paralelo em `localhost:3000`.
Quando as rotas estiverem prontas, o frontend aponta para a API em vez do Firebase.
