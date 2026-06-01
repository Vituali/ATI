### ATI V2 — Contexto para IA

#### Stack

React 19 + TypeScript + Vite 6 + Firebase 12 (Auth + Realtime DB) + CSS puro

#### Estrutura de pastas

_(Mantenha sua estrutura existente)_

#### Padrões de código

- Props em português: aberto, onFechar, largura, aoRemover, notificacoes
- CSS: arquivo .css por componente, mesmo nome, importado diretamente
- Hooks: use + camelCase, ficam em src/hooks/
- Componentes: PascalCase, export default
- Auth_shared.css compartilhado entre Login e Register

#### Estado Global / Persistência

- Tema via `document.body.classList.toggle("light-theme")`, persistido em `localStorage("ati-theme")`.
- Plano de fundo customizado (imagem/vídeo) persistido em `localStorage("ati-custom-bg")`.

#### Firebase DB — Estrutura atual

_(Mantenha sua estrutura DB existente: atendentes, avisos, respostas, modelos_os, chat, etc.)_

#### Serviços / Hooks principais

- `useUser()` → `{ user: UserProfile | null, loading: boolean, error: string | null }`
- `useNotification()` → `{ notify, confirm, remove, notifications }`
- `canAccess(role, setor, section)` → boolean
- `login(usernameOrEmail, password)` → Promise<User>
- `register(details)` → Promise<void>

#### Tipos principais

Novos usuários: role = "usuario", setor = "geral" (pendente aprovação admin)

#### Componentes âncora

- `Modal.tsx` → props: aberto, onFechar, titulo, largura?
- `Toast.tsx` e `ToastContainer` → Exibição de alertas e confirmações
- `UserPanel.tsx` → Painel de conta e personalização (backgrounds)
- `LoadingOverlay.tsx` → Indicador de carregamento reutilizável
- `useUser.ts` → usado em quase todas as páginas
- `permissions.ts` → exporta canAccess, SETOR_LABEL, ROOM_ICONS

#### Regras de arquitetura

- Genérico/reutilizável → components/ui/
- Layout fixo → components/layout/
- Específico de negócio → components/app/
- Feature específica → pages/app/
- ❌ Nunca usar `window.alert()` ou `window.confirm()` — usar o hook `useNotification`

#### Dependências extras

- pdfjs-dist — extração de texto PDF (Conversor.tsx)

---

#### ✅ Features Implementadas e Problemas Corrigidos

| #   | Arquivo          | Correção / Feature                                                                              |
| --- | ---------------- | ----------------------------------------------------------------------------------------------- |
| 1   | App.tsx          | Listener de notificação migrado para chat/meta/{setor}/ultimaMensagem                           |
| 2   | App.tsx          | lastSeenChat movido para useRef fora do listener                                                |
| 3   | App.tsx          | Listener pausado quando currentSection === "chat_interno"                                       |
| 4   | App.tsx          | renderSection envolvido com useCallback                                                         |
| 5   | ChatInterno.tsx  | isFirstLoad trocado de useState para useRef                                                     |
| 6   | ChatInterno.tsx  | enviarMensagem atualiza chat/meta/{setor}/ultimaMensagem                                        |
| 7   | Global           | Vazamento de memória e 100% CPU resolvido (Troca de off por unsubscribe no Firebase)            |
| 8   | Sidebar.tsx      | Acessibilidade: alt="" no avatar para evitar leitura duplicada do nome                          |
| 9   | CSS Vários       | Acessibilidade: Contraste aumentado de metadados/textos de --text-muted para --text-grey        |
| 10  | Home.css         | Performance: Otimizado LCP removendo animação de opacidade 0 no Hero                            |
| 11  | **Notificações** | Implementação completa do `useNotification` e `ToastContainer`, substituindo alerts nativos.    |
| 12  | **UserPanel**    | Adicionado painel de perfil com alteração de dados sensíveis e personalização visual (`bgUrl`). |
| 13  | **App.tsx**      | Suporte a background customizado via imagem ou vídeo renderizado na raiz do layout.             |
| 14  | **Avisos**       | Implementados `PainelAvisos` para admins e `AvisosHome` para exibição global na Home.           |

---

#### 🚧 Features em planejamento

##### Camada de abstração do chat (services/chat.ts)

- Desacoplar Firebase dos componentes para facilitar migração futura
- API planejada: (Hoje ChatInterno.tsx chama push, ref, onValue diretamente do Firebase)

##### Backup manual do Chat

- Export do histórico de uma sala como JSON ou CSV
- Disponível para: admin, moderador, supervisor
- Gatilho: botão na interface do ChatInterno
- Implementar após services/chat.ts estar pronto

##### Presença de usuários

- Online/offline/ausente por usuário
- onDisconnect() do Firebase para marcar offline automaticamente
- Estrutura DB: presence/{username}/{ status, ultimaAtividade }
- Pré-requisito para RTC

##### RTC — Áudio P2P (futuro)

- WebRTC com Firebase como signaling server
- Estrutura DB: rtc/calls/{callId}/{ offer, answer, candidates }
- Requer presença implementada primeiro
- STUN público (Google) + TURN via Metered como fallback
- Escopo inicial: áudio 1-to-1, expandir para salas depois
  Principais atualizações realizadas:
  O sistema de notificações (Toast/useNotification) foi movido de "Em planejamento"
  para as features implementadas
  , pois agora é injetado no App.tsx globalmente
  e fornece métodos como notify e confirm
  .
  O recurso UserPanel foi documentado como um componente âncora, já que ele suporta a nova personalização de backgrounds persistidos (ati-custom-bg)
  .
  Adicionado o componente PainelAvisos (que permite admins criarem comunicados globais) aos registros de features concluídas
  .
  A regra de nunca usar window.alert() foi expandida para citar expressamente a nova alternativa (useNotification) implementada
  .
