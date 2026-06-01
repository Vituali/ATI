# Documentação do Projeto — Extensão ATI V2

## 🎯 Objetivo do Projeto

Uma extensão para Google Chrome criada para integrar o sistema de chat de atendimento (**ChatMix**) com o Sistema de Gestão de Provedores (**SGP**). A extensão automatiza processos repetitivos para os atendentes, como inserção de respostas rápidas e, principalmente, a criação de Ordens de Serviço (O.S.) cruzando dados do cliente entre as duas plataformas.

## 🛠️ Stack Tecnológico

- **Linguagem**: TypeScript
- **Build Tool**: Vite com plugin CRXJS (`@crxjs/vite-plugin`) para manifest V3.
- **Banco de Dados/Backend**: Firebase Realtime Database (Acessado via REST API, sem SDK pesado).
- **Estilização**: CSS puro injetado via content scripts.

## 🔄 Fluxo de Dados da Extensão

1. Content Script observa mudanças no DOM do ChatMix.
2. Ao detectar um cliente ou ação relevante, extrai CPF/CNPJ ou nome.
3. Envia requisição ao Background via `chrome.runtime.sendMessage`.
4. O Background consulta:
   - SGP (usando cookies do navegador)
   - Firebase (templates e respostas)
5. O Background retorna os dados ao Content Script.
6. O Content Script renderiza UI ou injeta texto no ChatMix.

## 📂 Arquitetura de Pastas

O projeto segue a separação estrita exigida pelo Manifest V3 do Chrome:

- `src/background/`: **Service Worker**. Roda isolado em background.
  - Único lugar permitido para fazer requisições externas críticas (SGP e Firebase) para evitar bloqueios de CORS.
  - `sgp/`: Lógica de extração e submissão silenciosa ('scraping' via endpoints internos) para o site do SGP.
  - `firebase.ts`: Comunicação (Auth e Database via REST) com o Firebase.
- `src/contentScript/`: **Scripts injetados na página do ChatMix** (`chatmix.com.br`).
  - Lida exclusivamente com manipulação do DOM e UI da extensão.
  - `chatmix/`: Módulos específicos para atuar no ChatMix (observadores de DOM, injeção de botões).
  - `chatmix/os/`: Contém a lógica do Modal de O.S. (modularizado em `osModal.ts`, `osModalSgp.ts`, `osModalUI.ts`, `osModalHandlers.ts`, `osModalTypes.ts`, `osDraft.ts`).
  - `chatmix/auth/`: Lida com banners de login do Firebase sobrepostos ao ChatMix.
  - `chatmix/buildAIPrompt.ts`: Lógica de limpeza e montagem do prompt para IA (Prompt Engineering).
  - `chatmix/patterns/`: Regex de sistema para identificar mensagens automáticas de bots.
- `src/popup/`: Interface HTML do ícone da extensão (caso necessário).

## ⚠️ Regra Arquitetural Fundamental

O Content Script nunca deve acessar diretamente:

- SGP
- Firebase
- APIs externas

Toda comunicação externa deve passar pelo Background Service Worker.

## 🧠 Regras de Negócio Críticas

### 1. Autenticação SGP (Cookies)

A extensão **não** guarda senhas do SGP. Ela se aproveita do fato de o atendente já estar logado no SGP em outra aba do navegador.

- As requisições em `background/sgp` usam `fetch` com `credentials: 'include'`.
- Isso envia os cookies da sessão ativa do usuário para o SGP silenciosamente.

### 2. SGP Cache Policy (Prevenção de Rate Limit)

Para evitar que a ATI seja bloqueada pelo SGP devido a múltiplas buscas automáticas:

- **Regra**: O estado e dados de formulário do SGP (contratos do cliente, status online/offline, tipos de ocorrência) devem ser gerados **uma vez por cliente/chat**.
- A extensão usa o `chatId` (ID da URL do ChatMix) como chave de cache principal.
- O cache do SGP (`clearSgpCache`) **só deve ser limpo** quando:
  1. O atendente gera a O.S. ("Preencher no SGP" ou "Copiar").
  2. O atendente clica no botão "Encerrar atendimento" no ChatMix.
  3. A URL do chat muda drasticamente (mudança de sessão).

- **Rascunhos (Drafts)**:
  - O conteúdo digitado no modal de O.S. é salvo no `localStorage` sob a chave `ati_os_draft_[chatId]`.
  - O rascunho é limpo automaticamente ao clicar em "Copiar" ou "Preencher no SGP".

- **Tipos de Ocorrência e Cache de Clientes:**
- Os tipos de ocorrência e resultados de busca de clientes (CPF → ID) são armazenados no `chrome.storage.session`.
- O uso de `chrome.storage.session` garante que os dados persistam mesmo quando o Chrome suspende o Service Worker por inatividade.
- A extensão usa cache em memória (variáveis locais) apenas para dados voláteis de curtíssima duração, priorizando o Storage Session para estado global.
- O Firebase `sgp_cache` também alimenta o criador de modelos de O.S no site da ATI.

### 3. Comunicação Content Script ↔ Background

- O `contentScript` **nunca** faz requisições diretas ao SGP ou Firebase (evita CORS e garante segurança de contexto).
- Usa-se `chrome.runtime.sendMessage` com interfaces padronizadas (ver `src/background/types.ts`).
- Exemplo: Content Script descobre o CPF no ChatMix → Pede ao Background `getSgpFormParams` → Background faz a busca no SGP com cookies cruzados → Retorna JSON para o Content Script renderizar o Modal.

### 4. Firebase (Templates e Respostas)

- O `idToken` do Firebase tem validade (1 hora).
- Respostas rápidas e Templates de O.S. (`modelos_os`, `respostas`) são cacheados em memória no service worker no início do plantão para máxima performance.
- O Content script deve enviar o `chatId` e context data para o background hidratar os _placeholders_ dinâmicos (`[SAUDACAO]`, `[HOJE]`) antes de jogar no DOM.

## 📝 Regras de Código e Boas Práticas (Para IAs)

1. **Sem tipo `any`**: O projeto utiliza TypeScript estrito. Se for criar código novo, declare e exporte as `Interfaces` apropriadas no respectivo arquivo `types.ts`.
2. **Modularização do UI**: Arquivos que manipulam o DOM (`contentScript`) devem ser mantidos curtos e focados. Se um arquivo passar de 200-300 linhas (como era o `osModal.ts`), ele deve ser dividido em módulos lógicos (ex: `arquitetura_ui`, `arquitetura_api`, `arquitetura_eventos`).
3. **Gerenciamento de Listeners**: Modais criados via ejetamento no DOM (`document.createElement`) que anexam eventos no `document` ou `body` **sempre** devem usar um `AbortController` (passando o `signal`) que é abortado quando o modal é destruído, evitando memory leaks.
4. **Tratamento Seguro de HTML (XSS)**: É terminantemente PROIBIDO o uso de `.innerHTML`. Sempre insira textos recebidos via `.textContent` ou use `createElement`/`appendChild`. Se for necessário injetar estruturas complexas, elas devem ser construídas via DOM API.
5. **Comunicação Segura de Janelas**: Mensagens enviadas via `window.postMessage` devem ser validadas usando um token de segurança gerado via `crypto.randomUUID()` no momento da abertura da janela, validando sempre a origem no listener.

## 🗄️ Integração com Banco de Dados

Sempre consulte o arquivo `FIREBASE_SCHEMA.md` na raiz deste repositório para entender a estrutura em JSON da base de dados e as regras de segurança aplicáveis.

## 🕷️ Pontos de Falha Críticos (Dependência do DOM do ChatMix)

A extensão dependende fortemente do HTML da página do ChatMix. Qualquer atualização no frontend deles pode quebrar a extensão.

1. **Seletores CSS (`src/contentScript/chatmix/state.ts`)**: É ali que está o mapa do tesouro (ex: `#actionsContainerV2`, `.flex-none.p-4`). Se os botões ou o campo de texto (textarea) sumirem, o problema está nos seletores. Aja sempre atualizando-os.
2. **Mutation Observers (`index.ts`)**: A extensão usa um `MutationObserver` para varrer alterações na tela e reinjetar os botões (O.S, Copy, Prompt IA) toda vez que a URL ou o painel do chat muda.
3. **Extração de Dados (`getClientData.ts` e `tryVisualIdentification.ts`)**: A extensão raspa o CPF/CNPJ ou Nome do cliente lendo o texto lateral ou o histórico do chat usando **Regex**. Novamente, uma mudança no layout ou formatação do texto no ChatMix vai requerer ajuste nas Regex nesses arquivos.
4. **Prompt IA (`buildAIPrompt.ts`)**: Ao extrair mensagens para o prompt, a extensão ignora mensagens internas, citados (replies) e respostas automáticas de dígito único de bots para garantir um contexto limpo.

### 🛑 REGRAS ESTRITAS DE NOMENCLATURA E FIREBASE (CRÍTICO PARA IAs)

O não cumprimento destas regras quebrará o banco de dados e a comunicação com o SGP.

1. **PROIBIDO INVENTAR VARIÁVEIS:** Ao manipular dados lidos ou escritos no Firebase, **NUNCA** crie chaves genéricas, apelidos ou traduções (ex: NUNCA use `sgpData`, `dadosSgp`, `tiposOcorrencia`).
2. **FIDELIDADE ABSOLUTA AO SCHEMA:** Você deve usar **EXATAMENTE** os nomes de chaves e nós definidos no arquivo `FIREBASE_SCHEMA.md`. Respeite maiúsculas, minúsculas e a grafia exata em inglês.
3. **CHAVE CRÍTICA - TIPOS DE OCORRÊNCIA:** A chave para a lista de ocorrências cacheadas do SGP no Firebase é **ESTRITAMENTE** `occurrenceTypes`.
   - ❌ ERRADO: `ocurrencytipes`, `occurrence_types`, `sgpData`, `tipos`.
   - ✅ CORRETO: `occurrenceTypes`.
4. **CHAVE CRÍTICA - ID DA OCORRÊNCIA:** Nos templates de O.S. (`modelos_os` e `os_templates_master`), a chave que guarda o ID numérico do SGP é **ESTRITAMENTE** `occurrenceTypeId`.

### 🎨 Padrões de UI / Estilização CSS (Design System)

Para manter a consistência visual da extensão dentro do ChatMix, siga ESTRITAMENTE estas regras ao gerar CSS ou classes no TypeScript:

1. **Nomenclatura BEM:** Ao criar modificadores de estado para elementos visuais (ex: botões, cards, badges), utilize o padrão `--[estado]`. Exemplo: `.contract-item--ativo`, `.ati-client-modal-btn--vel-red`.
2. **Cores de Status (Contratos e Clientes):** NUNCA use `border-left` simples ou cores sólidas no fundo. O padrão visual exige o uso de transparências (`rgba`) baseadas no HEX original da cor:
   - `background`: rgba(R, G, B, 0.1)
   - `border-color` (ou `border`): rgba(R, G, B, 0.3)
   - `color`: HEX Sólido (#RRGGBB)
   - `:hover`: background com alpha 0.15 e border com alpha 0.5.
3. **Status Mapeados:** Os únicos sufixos de status permitidos na lógica TypeScript e no CSS são: `ativo` (verde), `vel-red` (amarelo), `suspenso` (laranja), `inativo` (cinza) e `cancelado` (vermelho).
4. **Tipografia e Campos:**
   - **Fontes**: Use `DM Sans` para corpos de texto/botões e `Space Mono` para labels, badges e headers de categoria.
   - **UpperCase**: O campo de texto (textarea) da descrição da O.S. deve sempre converter o texto inserido para **MAIÚSCULAS** (`.toUpperCase()`).
   - **Toggle Switches**: Checkboxes de configuração (como 'Gerar O.S') devem utilizar o padrão visual de toggle logicamente identificado pela classe `.toggle-track`.
5. **Temas**: A extensão suporta temas `modern` (default) e `legacy`, controlados via classe `.ati-theme-legacy` no `documentElement`.
