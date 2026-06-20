# Revisão e Melhorias - ATI V2

> Data da análise: 20/06/2026
> Versão atual: v2.2.0

---

## Sumário

- [Bugs Potenciais](#bugs-potenciais)
- [Melhorias de Segurança](#melhorias-de-seguranca)
- [Melhorias de Código](#melhorias-de-codigo)
- [Melhorias de Infra/DevOps](#melhorias-de-infradevops)
- [Novas Funcionalidades Sugeridas](#novas-funcionalidades-sugeridas)
- [Limpeza e Manutenção](#limpeza-e-manutencao)

---

## Bugs Potenciais

### 1. Seletores CSS hardcoded do ChatMix — Risco: Alto

**Arquivos:**
- `Extensao/src/contentScript/chatmix/state.ts`
- `Extensao/src/contentScript/chatmix/getClientData.ts`

**Problema:** A extração de dados do cliente depende de seletores CSS específicos do DOM do ChatMix (`chatmix.com.br`). Qualquer alteração no frontend do ChatMix (refactor, atualização de framework, mudança de classes) quebra a extensão silenciosamente — o usuário não vê erro, apenas os botões deixam de funcionar.

**Sugestão:** Criar uma camada de adaptador que centralize todos os seletores e valide sua existência no DOM com fallback + notificação de erro. Idealmente, usar atributos `data-*` se houver contato com o time do ChatMix.

---

### 2. DEBUG_MODE ativado em produção — Risco: Médio

**Arquivo:** `Extensao/src/contentScript/chatmix/state.ts`

**Problema:** `DEBUG_MODE = true` está fixo, gerando extensos `console.log` no console do usuário final. Além de poluição visual, pode vazar informações internas (estrutura de dados, nomes de variáveis, fluxo de lógica).

**Sugestão:** Usar variável de ambiente do Vite (`import.meta.env.VITE_DEBUG`) ou controle por build:

```ts
export const DEBUG_MODE = import.meta.env.VITE_DEBUG === 'true';
```

---

### 3. Credenciais e tokens em texto puro no chrome.storage — Risco: Alto

**Arquivos:**
- `Extensao/src/popup/Popup.tsx` (sgp_credentials)
- `Extensao/src/background/firebase.ts` (idToken, refreshToken)

**Problema:** `chrome.storage.local` não é criptografado. Qualquer extensão maliciosa ou acesso físico ao computador expõe:
- Token de autenticação do Firebase (com acesso ao RTDB)
- Refresh token (permite obter novos tokens)
- Credenciais de login do SGP (usuário e senha do sistema interno)

**Sugestão:** Usar `chrome.identity` ou `crypto.subtle.encrypt` com chave derivada de senha para criptografar antes de salvar. No mínimo, armazenar apenas session tokens com curta duração.

---

### 4. Ponte SSO via postMessage sem validação de origem — Risco: Médio

**Arquivo:** `Extensao/src/contentScript/sso/bridge.ts`

**Problema:** A comunicação entre o site e a extensão via `window.postMessage` precisa validar a `origin` das mensagens recebidas para evitar clickjacking ou injeção de mensagens maliciosas de outras abas.

**Sugestão:** Validar `event.origin` contra uma lista de origens permitidas:

```ts
const ORIGENS_PERMITIDAS = [
  'https://vituali.github.io',
  'https://site-ati-75d83.web.app',
  'https://site-ati-75d83.firebaseapp.com',
];
window.addEventListener('message', (event) => {
  if (!ORIGENS_PERMITIDAS.includes(event.origin)) return;
  // ...
});
```

---

### 5. @crxjs/vite-plugin em versão beta — Risco: Médio ~~✅ Corrigido~~

~~**Arquivo:** `Extensao/vite.config.ts`~~

~~**Problema:** O plugin `@crxjs/vite-plugin@2.0.0-beta.26` está em beta e o próprio `vite.config.ts` usa `@ts-ignore` para suprimir erros de tipo. Mudanças na API do plugin entre betas podem quebrar o build sem aviso.~~

~~**Sugestão:** Fixar a versão exata no `package.json` e monitorar o [repositório oficial](https://github.com/crxjs/chrome-extension-tools) para versões estáveis. Considerar migrar para [WXT](https://wxt.dev/) como alternativa.~~

---

### 6. Cloud Function varreduraDiariaPotencias vazia — Risco: Baixo

**Arquivo:** `functions/index.js`

**Problema:** A função `varreduraDiariaPotencias` executa diariamente às 3 AM mas tem apenas um TODO comentado:

```js
// Escrever logica automática...
```

Ela consome recursos (execução gratuita do Firebase) sem produzir resultado.

**Sugestão:** Implementar a lógica ou remover a função. Se for planejamento futuro, ao menos adicionar um log informativo e tracking.

---

### 7. IPs do SGP hardcoded — Risco: Médio ✅ ~~Corrigido~~

~~**Arquivo:** `Extensao/src/background/sgp/constants.ts`~~

~~**Problema:** Os IPs `201.158.20.35:8000` e `201.158.20.53:8000` estão hardcoded e referenciados em múltiplos arquivos. Se a infraestrutura mudar de IP, é necessário atualizar manualmente em vários lugares.~~

~~**Solução implementada:**~~

~~- Criado `Extensao/src/background/sgp/config.ts` com `initSgpConfig(idToken)` que lê do Firebase RTDB (`/config/sgp_hosts`) e cacheia em `chrome.storage.session` (1 read/sessão).~~
~~- `SGP_DEFAULT_HOSTS` em `constants.ts` mantido como fallback offline.~~
~~- Background carrega config automaticamente após login.~~
~~- `auth.ts`, `firebase.ts`, `support.ts`, `occurrence.ts` atualizados para usar `getSgpHosts()` em vez de IPs fixos.~~
~~- Para adicionar/alterar IPs, basta atualizar `/config/sgp_hosts` no Firebase RTDB — extensão busca na próxima inicialização.~~

---

### 8. ESLint do Site não analisa TypeScript — Risco: Médio ✅ ~~Corrigido~~

~~**Arquivo:** `Site/eslint.config.js`~~

~~**Problema:** A configuração do ESLint no Site só cobre `**/*.{js,jsx}`. Arquivos TypeScript (`.ts`, `.tsx`) não são analisados, permitindo que erros de tipo, variáveis não utilizadas, e imports incorretos passem despercebidos.~~

~~**Sugestão:** Adicionar `typescript-eslint` ao projeto.~~

---

## Melhorias de Segurança

| # | Melhoria | Prioridade | Esforço |
|---|---|---|---|
| 1 | Criptografar `chrome.storage.local` | Alta | 3 dias |
| 2 | Validar `origin` no postMessage SSO | Alta | 1 dia |
| 3 | Remover `'unsafe-inline'` do CSP (migrar para nonce/hash) | Média | 2 dias |
| 4 | Restringir `externally_connectable` no manifest | Média | 1 dia |
| 5 | Desabilitar CORS permissivo (`cors: true`) nas functions | Média | 1 dia |
| 6 | Revisar regras do Firebase RTDB (testar regras)` | Alta | 2 dias |

---

## Melhorias de Código

### Tipagem e TypeScript

- **Unificar `ClientData`**: A interface é definida em dois lugares:
  - `Extensao/src/background/sgp/constants.ts`
  - `Extensao/src/contentScript/sgp/types.ts`
  
  Mover para um arquivo compartilhado (`Extensao/src/types/clientData.ts`).

- **Tipar `payload: any`** em `background/types.ts`:
  - `FirebasePostRequest.payload`
  - `FirebasePatchRequest.payload`

- **Remover `chrome: any` global** de `Site/src/vite-env.d.ts` — polui o escopo global.

### Unificação de Versões ✅ ~~Concluído~~

~~| Pacote | Antes (Ext) | Antes (Site) | Depois (Unificado) |
|---|---|---|---|---|
| React | 18.2.0 | 19.2.4 | **19.2.7** |
| TypeScript | 5.2.2 | 5.8.3 | **5.8.3** |
| Vite | 5.4.10 | 6.4.1 | **6.4.3** |
| ESLint | 10.0.3 | 9.39.4 | **10.5.0** |
| @vitejs/plugin-react | 4.1.0 | 4.7.0 | **4.7.0** |
| Prettier | 3.0.3 | ^3.8.4 | **3.8.4** |
| Firebase | 12.10.0 | 12.11.0 | **12.15.0** |
| typescript-eslint | ^8.61.0 | — | **8.61.1** |
| @eslint/js | ^10.0.1 | 9.39.4 | **10.0.1** |
| globals | ^17.6.0 | 17.4.0 | **17.6.0** |~~

### @types/chrome — Nota sobre versão

- **Extensão**: `0.0.332` (instalado)
- **Versão mais recente**: `0.1.43`
- A versão `0.1.x` introduziu o tipo `NoInferX` nos métodos `StorageArea.get()`, impedindo a inferência de tipo nas chamadas `chrome.storage.local.get()`. Isso quebrou ~80 locais no código da extensão que acessam propriedades do resultado sem tipagem explícita. Foi mantido `0.0.332` propositalmente. Uma correção futura seria tipar cada chamada com `chrome.storage.local.get<{key: Type}>('key')`.

### pdfjs-dist

- Versão atual: `3.11.174`
- Versão mais recente: `4.x`
- Verificar breaking changes e atualizar. O `vite.config.ts` tem um `onwarn` específico para suprimir warnings de `eval` do pdfjs — pode ser que a v4 resolva isso.

---

## Melhorias de Infra/DevOps

### Testes Automatizados — Prioridade Máxima

Zero testes em todo o projeto. Sugestão de roadmap:

| Fase | O que testar | Ferramenta |
|---|---|---|
| 1 | Lógica de background (firebase.ts, occurrence.ts) | Vitest |
| 2 | Lógica de content script (helpers.ts, getClientData.ts) | Vitest + jsdom |
| 3 | Componentes React do Popup | Vitest + @testing-library/react |
| 4 | Páginas do Site | Vitest + @testing-library/react |
| 5 | Testes e2e da extensão | Playwright |

### CI/CD com GitHub Actions

Criar `.github/workflows/` com pipelines para:

```yaml
# ci.yml
- push/PR: lint + typecheck + test (extensão e site)
- tag v*: build + zip + deploy automático

# deploy-site.yml
- push main: build + deploy para GitHub Pages
```

### Monitoramento de Erros

- **Sugestão:** Integrar [Sentry](https://sentry.io/) para:
  - Capturar erros não tratados no content script
  - Capturar rejeições de promise no background service worker
  - Capturar erros de React no Site
- Alternativa gratuita: [GlitchTip](https://glitchtip.com/) ou [PostHog](https://posthog.com/)

---

## Novas Funcionalidades Sugeridas

### 1. Exportar / Backup do Chat

**Descrição:** Botão para exportar o histórico do chat departamental em JSON ou CSV.

**Arquivo:** `Site/src/pages/app/ChatInterno.tsx`

**Valor:** Permite auditoria externa e backup dos atendimentos.

---

### 2. Presença Online em Tempo Real

**Descrição:** Usar `firebase.database().ref('.info/connected')` + `onDisconnect()` para mostrar quem está online no chat departamental.

**Valor:** Saber quais atendentes estão disponíveis no momento.

---

### 3. Modo Escuro Automático

**Descrição:** Seguir a preferência do sistema operacional (`prefers-color-scheme`) no Site, além do toggle manual existente.

**Arquivo:** `Site/src/App.tsx`

```ts
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
// + listener para mudanças em tempo real
```

---

### 4. Dashboard de Métricas na Home

**Descrição:** Mostrar na página inicial do Site:
- Atendimentos hoje
- Tempo médio de atendimento
- Respostas rápidas mais usadas
- Tipos de O.S. mais abertos

**Fontes de dados:** Firebase RTDB (`/chat/meta`, `/respostas`, `/modelos_os`)

---

### 5. Comando npm para Gerar Changelog

**Descrição:** Script que lê as mensagens de commit desde a última tag e gera entrada no `CHANGELOG.md`.

**Ferramenta:** `conventional-changelog` ou script customizado com `git log`.

---

### 6. Indicador de Versão da Extensão

**Descrição:** No popup da extensão ou no Site, mostrar a versão atual instalada vs a versão mais recente disponível, com alerta se desatualizada.

**Já existe:** `update-firebase-version.js` atualiza a versão no Firebase, mas o cliente não consome essa info.

---

### 7. Cache Local com SW no Site

**Descrição:** O site já usa `vite-plugin-pwa` com service worker. Expandir para cachear páginas e dados do Firebase para funcionar offline parcialmente.

---

### 8. Modo Quiosque / Atendimento Rápido

**Descrição:** Tela cheia com apenas o essencial para atendimento (chat + respostas rápidas + criação de O.S.), ideal para monitores secundários.

---

## Limpeza e Manutenção

| Item | Descrição | Prioridade |
|---|---|---|
| **Limpar `htmlusados/`** | Páginas HTML baixadas do SGP para referência — poluem o repositório | Média |
| **Atualizar `.env.example`** | Pode estar desatualizado vs o que o código realmente usa | Alta |
| **Adicionar `noUnusedLocals`/`noUnusedParameters` no tsconfig da Extensão** | Já existem no Site, faltam na Extensão | Média |
| **@types/chrome 0.0.x vs 0.1.x** | Versão 0.1.x quebrou tipagem do storage. Mantido 0.0.332 — futuramente tipar chamadas manualmente | Média |
| **Remover `build/` do versionamento** | `Extensao/build/` parece ser resíduo de build anterior, verificar `.gitignore` | Baixa |
| **Revisar arquivos ignorados no ESLint da Extensão** | `find_service_links.cjs`, `test_match.cjs` — existem ou são resíduo? | Baixa |
| **Criar `.github/workflows/`** | Pipeline de CI/CD | Alta |

---

## Checklist de Ação Imediata

- [ ] Corrigir `DEBUG_MODE` para false em produção (ou usar env var)
- [ ] Validar `event.origin` no SSO bridge
- [x] Adicionar ESLint TypeScript no Site ✅ ~~Concluído~~
- [ ] Tipar `payload: any` no background
- [ ] Unificar `ClientData` em arquivo compartilhado
- [x] Mover IPs do SGP para Firebase RTDB ✅ ~~Concluído~~
- [ ] Configurar GitHub Actions com lint + typecheck
- [ ] Escrever primeiros testes unitários (Vitest)
- [ ] Atualizar `.env.example`
- [ ] Implementar ou remover `varreduraDiariaPotencias`
- [x] Atualizar CRXJS 2.0.0-beta.26 → 2.7.0 ✅ ~~Concluído~~
- [x] Atualizar ESLint 9/10 → 10.5.0 (ambos) ✅ ~~Concluído~~
- [x] Unificar versões React, Vite, TS, Firebase entre Extensão e Site ✅ ~~Concluído~~
