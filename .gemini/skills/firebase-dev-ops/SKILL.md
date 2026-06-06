---
name: firebase-dev-ops
description: Development scripts, environment switching, and Firebase Database Schema rules.
---

# Firebase & Dev Ops Guidelines

Use this skill when managing local dev servers, switching environments, building releases, or interacting with the database.

---

## 🛠️ Monorepo Developer Scripts

Execute commands from the workspace root directory.

| Command | Action |
|---|---|
| `npm run dev:extension` | Runs dev server for the Chrome Extension |
| `npm run dev:extension:prod` | Runs dev server for the Extension in production mode |
| `npm run dev:site` | Runs dev server for the React 19 Web Panel |
| `npm run clean` | Cleans build artifacts for both Site and Extension |
| `npm run build:extension` | Compiles a production-ready extension package |
| `npm run build:site` | Compiles production assets for the Web Panel |
| `npm run zip:extension` | Cleans and packages the extension into a zip archive |
| `npm run install:all` | Installs node dependencies for both subprojects |

### Environment Switching
Environments are toggled using the helper script `switch-env.cjs`:
* **Development:** `npm run env:dev`
* **Production:** `npm run env:prod`
* **Dev-Prod Hybrid:** `npm run env:dev_prod`

---

## 🗄️ Firebase Database Schema (Realtime DB)

Keep keys, nodes, and schemas exactly as defined. Never use arbitrary naming.

### Data Path Reference

* **`/admins/$uid`**
  - Mapped keys: `$uid: true`
* **`/atendentes/$username`**
  - Schema: `{ email: string, nomeCompleto: string, role: "admin" | "usuario", status: "ativo" | "inativo", uid: string }`
* **`/modelos_os/$username/$templateId`**
  - Schema: `{ id: string, category: string, title: string, text: string, occurrenceTypeId: string }`
* **`/os_templates_master/os_templates`**
  - Array of: `{ title: string, category: string, text: string, occurrenceTypeId: string }`
* **`/respostas/master` & `/respostas/$username`**
  - Array of: `{ title: string, category: "quick_reply", subCategory: string, text: string }`
* **`/sgp_cache`**
  - Schema: `{ updatedAt: string, occurrenceTypes: [{ id: string, text: string }] }`

---

## ⚠️ Security Rules Check
- `admins` and `os_templates_master` write actions require admin privilege verification.
- Users can only read/write their own nested nodes (`respostas/$username` and `modelos_os/$username`) matching their authenticated Firebase `uid` mapped under `atendentes`.
