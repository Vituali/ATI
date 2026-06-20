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

### 2. DEBUG_MODE ativado em produção — Risco: Médio ✅ ~~Corrigido~~

~~**Arquivo:** `Extensao/src/contentScript/chatmix/state.ts`~~

~~**Problema:** `DEBUG_MODE = true` estava fixo, gerando extensos `console.log` no console do usuário final.~~

~~**Solução:** Substituído por `import.meta.env.VITE_DEBUG === 'true'`. Desativado por padrão; ativar com `VITE_DEBUG=true` no `.env`.~~

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

### 4. Ponte SSO via postMessage sem validação de origem — Risco: Médio ✅ ~~Corrigido~~

~~**Arquivo:** `Extensao/src/contentScript/sso/bridge.ts`~~

~~**Problema:** A comunicação entre o site e a extensão via `window.postMessage` não validava a `origin`.~~

~~**Solução:** Já existia `ALLOWED_ORIGINS` + `isValidOrigin()`. Adicionado `currentAllowedOrigin()` para substituir origins fixas nos `postMessage` de saída.~~

---

### 5. @crxjs/vite-plugin em versão beta — Risco: Médio ~~✅ Corrigido~~

~~**Arquivo:** `Extensao/vite.config.ts`~~

~~**Problema:** O plugin `@crxjs/vite-plugin@2.0.0-beta.26` está em beta e o próprio `vite.config.ts` usa `@ts-ignore` para suprimir erros de tipo. Mudanças na API do plugin entre betas podem quebrar o build sem aviso.~~

~~**Sugestão:** Fixar a versão exata no `package.json` e monitorar o [repositório oficial](https://github.com/crxjs/chrome-extension-tools) para versões estáveis. Considerar migrar para [WXT](https://wxt.dev/) como alternativa.~~

---

### 6. Cloud Function varreduraDiariaPotencias vazia — Risco: Baixo ✅ ~~Removido~~

~~**Arquivo:** `functions/index.js`~~

~~**Problema:** A função `varreduraDiariaPotencias` executava diariamente às 3 AM mas tinha apenas um TODO comentado. Consumia recursos sem produzir resultado.~~

~~**Solução:** Função removida. O usuário pretende implementar a lógica de outra forma.~~

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

### Tipagem e TypeScript ✅ ~~Concluído~~

~~- **Unificar `ClientData`**: A interface era definida em dois lugares:~~
  ~~- `Extensao/src/background/sgp/constants.ts`~~
  ~~- `Extensao/src/contentScript/sgp/types.ts`~~
  
  ~~**Resolvido:** Removida a duplicata de `constants.ts`. `search.ts` e `occurrence.ts` agora importam `ClientData` de `contentScript/sgp/types.ts`.~~

~~- **Tipar `payload: any`**: `FirebasePostRequest.payload` e `FirebasePatchRequest.payload` alterados de `any` para `unknown`.~~

~~- Nota: `chrome: any` global em `Site/src/vite-env.d.ts` — removido. Era dead code (zero referências em qualquer .ts/.tsx do Site).~~

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

- **Versão atual**: `0.0.332`
- **Versão mais recente**: `0.1.43`
- Upgrade testado para `0.1.43` → **88 erros TS**. O `NoInferX` no `StorageArea.get()` fez o retorno virar `Promise<{}>`, quebrando todo acesso a propriedades.
- **Decisão:** Mantido `0.0.332`. Criado `src/utils/storage.ts` com wrappers tipados (`storageGet<T>()`, `storageSessionGet<T>()`).
- **Plano de migração futuro:**

  ```bash
  # 1. Instalar a nova versão
  npm install @types/chrome@latest --save-dev
  ```

  ```typescript
  // 2. Para cada arquivo com erro TS, substituir chamadas diretas pelo wrapper
  // ANTES:
  const result = await chrome.storage.local.get('minhaChave')
  const valor = result.minhaChave

  // DEPOIS:
  import { storageGet } from '../../utils/storage'
  const { minhaChave } = await storageGet<{ minhaChave: Tipo }>('minhaChave')
  ```

  **3. Scripts de busca para encontrar callsites pendentes:**
  ```bash
  # Encontrar chamadas diretas a chrome.storage que precisam ser migradas
  rg "chrome\.storage\.(local|session)\.get\(" --include="*.ts" --include="*.tsx" src/
  ```

  **4. Prioridade:**
  - Fazer em lotes por pasta (ex: `background/`, `contentScript/`, `popup/`)
  - Manter `0.0.332` até TODOS os callsites estarem migrados
  - Quando não houver mais chamadas diretas, remover o wrapper e subir a versão

### pdfjs-dist

- Versão atual: `3.11.174`
- Versão mais recente: `4.x`
- **Onde é usado:** `Site/src/pages/app/Conversor.tsx` — extrai texto da página 1 do PDF de **Aditivo de Mudança de Endereço** (`ADTITIVO_mudançaendereço.pdf`). Lê contrato, nome, endereço antigo e novo via regex no texto extraído.
- **CDN worker:** O worker (`pdf.worker.min.js`) é carregado da CDN (`cdnjs.cloudflare.com`), não é bundlado — o pacote npm serve só como lib de parsing.
- **`vite.config.ts` do Site:** Tem `onwarn` suprimindo `EVAL` warnings do pdfjs-dist, e `manualChunks` separando em chunk `pdf-vendor`.
- **Dá pra remover?** O Conversor depende 100% dele para extrair dados do PDF. Daria para substituir por:
  1. Backend (Cloud Function) que recebe o PDF e retorna JSON — eliminaria a dependência do frontend
  2. Biblioteca mais leve tipo `pdf-parse` (Node) no backend
  3. Manter como está — o impacto é baixo (só carrega quando o usuário acessa a página Conversor)
- **Atualizar para v4:** Verificar breaking changes na API `getDocument`/`getTextContent`.

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
| **`htmlusados/`** | **Apenas local** (não versionado). Páginas HTML baixadas do SGP e ChatMix + PDF de aditivo (`ADTITIVO_mudançaendereço.pdf`). Servem como referência visual para extrair seletores CSS e entender a estrutura do SGP durante o desenvolvimento. Fica só na máquina do dev. | — |
| **Atualizar `.env.example`** | ✅ **Concluído.** `.env.example` atualizado com comentários sobre `envDir: '../'` e formato do `VITE_FIREBASE_APP_ID`. | Alta |
| **`noUnusedLocals`/`noUnusedParameters` no tsconfig da Extensão** | ✅ **Já existem** no `tsconfig.json` da Extensão. Nada a fazer. | — |
| **@types/chrome 0.0.x vs 0.1.x** | Testado upgrade para `0.1.43` → **88 erros TS**. `NoInferX` no `StorageArea.get()` quebra acesso a propriedades. Mantido `0.0.332`. Foi criado `src/utils/storage.ts` com wrappers tipados (`storageGet<T>()`) para uso em código novo. | Média |
| **`build/`** | Já no `.gitignore`. Mantido local para testes + zip da Chrome Web Store. | — |
| **Revisar arquivos ignorados no ESLint** | `find_service_links.cjs` e `test_match.cjs` **existem** — são scripts Node que leem HTMLs do `htmlusados/`. Ignorados corretamente no ESLint. Nada a fazer. | — |
| **Criar `.github/workflows/`** | Pipeline de CI/CD | Alta |

---

## Checklist de Ação Imediata

- [x] Corrigir `DEBUG_MODE` para false em produção (ou usar env var) ✅ ~~Concluído~~
- [x] Validar `event.origin` no SSO bridge ✅ ~~Concluído~~
- [x] Adicionar ESLint TypeScript no Site ✅ ~~Concluído~~
- [x] Tipar `payload: any` no background ✅ ~~Concluído~~
- [x] Unificar `ClientData` em arquivo compartilhado ✅ ~~Concluído~~
- [x] Mover IPs do SGP para Firebase RTDB ✅ ~~Concluído~~
- [ ] Configurar GitHub Actions com lint + typecheck
- [ ] Escrever primeiros testes unitários (Vitest)
- [x] Atualizar `.env.example` ✅ ~~Concluído~~
- [x] Implementar ou remover `varreduraDiariaPotencias` ✅ ~~Removido~~
- [x] Atualizar CRXJS 2.0.0-beta.26 → 2.7.0 ✅ ~~Concluído~~
- [x] Atualizar ESLint 9/10 → 10.5.0 (ambos) ✅ ~~Concluído~~
- [x] Unificar versões React, Vite, TS, Firebase entre Extensão e Site ✅ ~~Concluído~~
