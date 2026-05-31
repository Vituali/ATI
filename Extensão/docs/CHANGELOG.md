# CHANGELOG

```txt
Summary
  1. document grouping follow 'SemVer2.0' protocol
  2. use 'PATCH' as a minimum granularity
  3. use concise descriptions
  4. type: feat \ fix \ update \ perf \ remove \ docs \ chore
  5. version timestamp follow the yyyy.MM.dd format
```

## 2.2.0 [2026.04.11] — Embed Chat & Notificações em Background

### ✨ Novidades
- **Chat Interno via Iframe (Modo Embed)**: Integração direta com o site oficial da ATI (`vituali.github.io/ATI`). Agora a extensão sempre usa a versão mais recente do chat sem necessidade de novos builds.
- **Notificações em Tempo Real**: Novo sistema de monitoramento em background que checa novas mensagens no Firebase para todas as salas (geral, ti, financeiro, suporte, comercial).
- **Badge de Notificação**: O ícone da extensão agora exibe um badge vermelho "!" quando há mensagens não lidas.
- **Botão Flutuante Moderno**: Redesign completo do botão de acesso ao chat, com feedback visual de estado ativo.

### 🛠️ Arquitetura & Performance
- **Desacoplamento de Lógica**: Movida a lógica pesada de mensagens para o Web App, reduzindo o tamanho do bundle da extensão e facilitando a manutenção centralizada.
- **Persistência de Notificações**: Alertas via browser agora exigem interação para sumir, garantindo que o atendente não perca mensagens críticas.
- **Bypass de CSP**: Refinada a comunicação via Service Worker para contornar restrições de Content Security Policy em sites de terceiros.

### 🐛 Correções
- **Vite HTML Proxy Fix**: Resolvido erro de build que impedia a geração do pacote no Windows devido a blocos de CSS inline no `index.html`.
- **Estabilidade do Service Worker**: Implementadas checagens de existência de APIs de notificação para evitar falhas de registro do Worker.

## 2.1.0 [2026.04.08] — Revisão e melhorias gerais

### 🐛 Correções de Bugs

- **Cache em memória no Service Worker**: Migrado de variáveis globais (`Map` e `cachedTemplates`) para `chrome.storage.session`, evitando perda de dados quando o Chrome suspende o Service Worker.
- **Race condition no pendingSgpData**: Chave do storage agora inclui identificador único do cliente, impedindo que dois atendimentos simultâneos cruzem dados entre si.
- **Promise.race sem efeito**: Removido wrapper desnecessário em `contentScript/chatmix/index.ts`, lógica de timeout documentada para implementação futura.
- **Tratamento de erro em fetch**: Adicionada verificação de `response.ok` e `Content-Type` antes de chamar `.json()`, evitando exceções silenciosas em respostas de erro do SGP.
- **Resolução de Assets**: Corrigido erro de build onde o SVG do tema dark não era resolvido pelo Vite no ambiente de produção.
- **Otimização de Build**: Implementado `copyPublicDir: false` no Vite para resolver conflitos de sobreposição de arquivos entre o diretório public e a emissão automática de assets do CRXJS. Avisos de "overwrites" eliminados.

### ⚡ Performance

- **MutationObserver otimizado**: Target restrito ao container específico da sidebar/mensagens (antes observava `document.body` inteiro com `subtree: true`), com debounce de 150ms no callback.
- **Buscas paralelas no SGP**: Buscas por Nome e Telefone agora executam em paralelo via `Promise.all` quando CPF não retorna resultado, reduzindo tempo de loading.
- **Cache de cliente por CPF/CNPJ**: Resultado da API (CPF → clienteId) agora é cacheado no `chrome.storage.session` com 3 níveis de expiração: encerramento do O.S, mudança de conversa (UID do ChatMix) e fallback de 2 horas.

### 🔒 Segurança

- **innerHTML removido**: Substituído por `createElement`/`appendChild` e `textContent` em `chatmix/index.ts` e `sgpSelectionModal.ts`, eliminando risco de XSS.
- **postMessage com validação de origem**: Listener em `sgpLogin.js` agora valida token gerado via `crypto.randomUUID()` antes de processar mensagens, impedindo disparo por sites externos.

### ✨ Melhorias

- **Navegação inteligente por aba**: Botão SGP agora detecta abas abertas do cliente pelo `<title>` da página (padrão SGP - NOME (ID)) independente da rota, focando a aba existente em vez de abrir uma nova. Botão O.S sempre abre nova aba.
- **Seletor de servidor respeitado**: Todas as URLs montadas pela extensão (autocomplete, contratos, serviços) agora seguem estritamente o servidor selecionado pelo usuário (`sgp.atiinternet.com.br` ou `201.158.20.53:8000`).
- **Diálogos bloqueantes removidos**: `alert()` e `confirm()` substituídos por Toast e modal React em `Popup.tsx`, eliminando interrupções no fluxo do usuário.
- **Versão**: Bump de versão para 2.1.0.0.

## 2.0.5 [2026.03.13]

### 🔥 Novidades & Refatoração (Major Update)

- **Refatoração do Modal de O.S**: O antigo arquivo gigante `osModal.ts` foi completamente desmembrado em diversos módulos menores (`osModal.ts`, `osModalUI.ts`, `osModalSgp.ts`, `osModalHandlers.ts`, `osModalTypes.ts`). Manutenção e detecção de bugs muito mais ágil.
- **Prevenção de Memory Leaks**: Implementado o padrão de `AbortController` em todos modais injetados na tela. Quando um modal é fechado, todos os event listeners daquele modal anexados no documento são destruídos instantaneamente.
- **SGP Caching System (Anti-Rate Limit)**: A busca por dados do cliente no SGP ocorre **apenas uma vez por cliente** baseado na URL do chat (`chatId`). O recarregamento contínuo das rotas do SGP foi encerrado, reduzindo chamadas silenciosas e prevenindo bloqueios do provedor.
- Limpeza automática de cache residual do SGP ao finalizar os atendimentos via clique no botão "Encerrar atendimento" no ChatMix.

### 🐛 Correções de Bugs

- **Case-sensitivity no Build**: O arquivo corrompido ou referenciado erroneamente como `Quickreply` foi padronizado em todo o projeto para `quickReply.ts`, previnindo falhas severas de carregamento em sistemas de pacote que diferenciam maiúsculas (Vite/Linux).
- Correção de dupla importação de Tipos de Domínio TypeScript.

## 0.0.0 [2026.03.10]

- feat: initial
- feat: generator by ![create-chrome-ext](https://github.com/guocaoyi/create-chrome-ext)
