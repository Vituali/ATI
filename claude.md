# ATI V2 — Contexto para IA

## Stack
React 19 + TypeScript + Vite 6 + Firebase 12 (Auth + Realtime DB) + CSS puro

## Estrutura de pastas
```
src/
├── pages/
│   ├── app/          # Home, Admin, ChatInterno, Conversor, ModelosOS, RespostasRapidas, Senhas, Extension
│   ├── auth/         # Login.tsx, Register.tsx, Auth_shared.css
│   └── errors/       # ErrorPage.tsx
├── components/
│   ├── layout/       # Sidebar, Footer
│   ├── ui/           # Modal, LoadingOverlay, Toast (genéricos)
│   └── app/          # AvisosHome, PainelAvisos, UserPanel (domínio)
├── hooks/            # useUser.ts, useNotification.ts (em implementação)
├── services/         # firebase.ts, auth.ts, permissions.ts, chat.ts (planejado)
```

## Padrões de código
- Props em português: `aberto`, `onFechar`, `largura`, `aoRemover`, `notificacoes`
- CSS: arquivo `.css` por componente, mesmo nome, importado diretamente
- Hooks: `use` + camelCase, ficam em `src/hooks/`
- Componentes: PascalCase, `export default`
- `Auth_shared.css` compartilhado entre Login e Register

## CSS Variables globais
```css
/* Dark (default) / Light via .light-theme no body */
--bg-dark, --bg-panel, --bg-black, --bg-card, --bg-input
--text-main, --text-white, --text-grey, --text-muted, --text-on-accent
--accent-blue, --accent-blue-hover, --accent-blue-border
--sidebar-bg, --footer-bg
--border-subtle
--radius-md: 8px, --radius-lg: 10px
--font-main: "DM Sans", --font-mono: "Space Mono"
--shadow-subtle
```
Tema via `document.body.classList.toggle("light-theme")`, persistido em `localStorage("ati-theme")`.

## Firebase DB — Estrutura atual
```
atendentes/{username}/
chat/
  salas/{setor}/mensagens/     # histórico completo
  meta/{setor}/ultimaMensagem  # { autor, timestamp } — notificações leves
```

## Serviços / Hooks principais
- `useUser()` → `{ user: UserProfile | null, loading: boolean, error: string | null }`
- `canAccess(role, setor, section)` → `boolean`
- `login(usernameOrEmail, password)` → `Promise<User>`
- `register(details)` → `Promise<void>`

## Tipos principais
```ts
type Role = "admin" | "moderador" | "supervisor" | "usuario"
type Setor = "geral" | "ti" | "financeiro" | "suporte" | "comercial"
```
Novos usuários: role = "usuario", setor = "geral" (pendente aprovação admin)

## Componentes âncora
- `Modal.tsx` → props: `aberto`, `onFechar`, `titulo`, `largura?`
- `useUser.ts` → usado em quase todas as páginas
- `permissions.ts` → exporta `canAccess`, `SETOR_LABEL`, `ROOM_ICONS`

## Regras de arquitetura
- Genérico/reutilizável → `components/ui/`
- Layout fixo → `components/layout/`
- Específico de negócio → `components/app/`
- Feature específica → `pages/app/`
- ❌ Nunca usar `window.alert()` ou `window.confirm()` — usar Toast

## Dependências extras
- `pdfjs-dist` — extração de texto PDF (Conversor.tsx)

---

## ✅ Problemas corrigidos

| # | Arquivo | Correção |
|---|---------|----------|
| 1 | `App.tsx` | Listener de notificação migrado para `chat/meta/{setor}/ultimaMensagem` |
| 2 | `App.tsx` | `lastSeenChat` movido para `useRef` fora do listener |
| 3 | `App.tsx` | Listener pausado quando `currentSection === "chat_interno"` |
| 4 | `App.tsx` | `renderSection` envolvido com `useCallback` |
| 5 | `ChatInterno.tsx` | `isFirstLoad` trocado de `useState` para `useRef` |
| 6 | `ChatInterno.tsx` | `enviarMensagem` atualiza `chat/meta/{setor}/ultimaMensagem` |

---

## 🚧 Features em planejamento

### Toast / useNotification
- `hooks/useNotification.ts` — hook com `notify()`, `confirm()`, `remove()`
- `components/ui/Toast.tsx` — fixo canto inferior direito
- Substituirá todos os `window.alert()` e `window.confirm()`
- `<ToastContainer />` já está no `App.tsx` aguardando implementação

### Camada de abstração do chat (`services/chat.ts`)
- Desacoplar Firebase dos componentes para facilitar migração futura
- API planejada:
  ```ts
  enviarMensagem(sala, mensagem): Promise<void>
  escutarMensagens(sala, callback): () => void   // retorna unsubscribe
  buscarHistorico(sala, pagina): Promise<Mensagem[]>
  atualizarMeta(sala, autor): Promise<void>
  ```
- Hoje `ChatInterno.tsx` chama `push`, `ref`, `onValue` diretamente

### Backup manual do Chat
- Export do histórico de uma sala como JSON ou CSV
- Disponível para: `admin`, `moderador`, `supervisor`
- Gatilho: botão na interface do ChatInterno
- Implementar após `services/chat.ts` estar pronto

### Presença de usuários
- Online/offline/ausente por usuário
- `onDisconnect()` do Firebase para marcar offline automaticamente
- Estrutura DB: `presence/{username}/{ status, ultimaAtividade }`
- Pré-requisito para RTC

### RTC — Áudio P2P (futuro)
- WebRTC com Firebase como signaling server
- Estrutura DB: `rtc/calls/{callId}/{ offer, answer, candidates }`
- Requer presença implementada primeiro
- STUN público (Google) + TURN via Metered como fallback
- Escopo inicial: áudio 1-to-1, expandir para salas depois
