# Ecossistema ATI V2 — Auxiliar de Atendimentos 🚀

<div align="center">

<img src="Extensão/public/img/logo-128.png" alt="ATI Logo" width="100" />

### **Ecossistema moderno para automação e produtividade de atendimento de suporte integrado ao ChatMix e SGP.**

---

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=for-the-badge)](https://developer.chrome.com/docs/extensions/mv3/)
[![React](https://img.shields.io/badge/React-18/19-61DAFB?logo=react&logoColor=white&style=for-the-badge)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5/6-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=white&style=for-the-badge)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[🔧 Painel Administrativo Web](https://vituali.github.io/ATI) · [📦 Chrome Web Store](https://chromewebstore.google.com/detail/ati-auxiliar-de-atendimen/mlgmmjacfbnkolflbankfiackpcnmckl)

</div>

---

## 📖 Visão Geral

O **ATI V2 (Auxiliar de Atendimentos)** é um ecossistema completo desenvolvido em arquitetura de **Monorepo** para elevar a produtividade de equipes de telecomunicações e suporte técnico. Ele centraliza ferramentas essenciais, automatiza fluxos repetitivos no sistema **SGP (Sistema de Gestão de Provedores)** e facilita a comunicação interna.

O ecossistema é composto por dois pilares principais que cooperam em tempo real:
1. **Extensão para Google Chrome (Manifest V3):** Injetada diretamente na interface de atendimento do ChatMix, oferecendo automações de preenchimento, criação rápida de Ordens de Serviço (O.S.), respostas rápidas categorizadas e atalhos inteligentes.
2. **Painel Administrativo Web (Site):** Um SPA React moderno que centraliza canais de chat departamentais em tempo real, painel de controle de atendentes, criador de modelos de O.S., utilitários de conversão de PDFs de aditivos contratuais, bloco de notas persistente com checklists e base de credenciais interna.

---

## 🏛️ Arquitetura do Repositório

O projeto é organizado como um monorepo limpo, centralizando ferramentas de formatação (`.prettierrc`, `.editorconfig`), ignoring (`.gitignore`, `.cursorignore`) e regras de IA (`.cursorrules`) na raiz, dividindo o código nos seguintes componentes de aplicação:

```
ati/ (Root)
├── Extensão/              # Extensão do Chrome (React 18 + Vite 5 + TS 5.2)
│   ├── src/               # Códigos fonte da Extensão
│   │   ├── background/    # Service worker (escutas Firebase REST e SGP API)
│   │   ├── contentScript/ # Injeção de UI e automação no DOM do ChatMix/SGP
│   │   └── popup/         # Interface pop-up interna da extensão
│   └── package.json
│
├── Site/                  # Painel Administrativo Web (React 19 + Vite 6 + TS 5.8)
│   ├── src/               # Códigos fonte do Painel Web
│   │   ├── components/    # Componentes reutilizáveis (Layout, UI, App)
│   │   ├── pages/         # Telas (Lazy-loaded para máxima performance)
│   │   ├── services/      # Integração com Firebase (SDK completo) e RBAC
│   │   └── hooks/         # Custom React hooks (Notificações, Usuários)
│   └── package.json
│
├── teste iframe/          # Testes isolados para contorno de SameSite do SGP
│   ├── background.js      # Interceptador declarativo de cookies do iframe
│   └── teste.html
│
├── .gemini/               # Diretório de agentes e Skills Inteligentes
│   └── skills/            # Instruções e diretrizes especializadas por escopo
│
├── package.json           # Orquestrador de scripts globais do monorepo
├── .cursorrules           # Diretrizes globais consolidadas para AIs (Cursor)
├── .gitignore             # Ignora dependências e builds recursivamente
└── README.md              # Esta documentação mestre
```

---

## 🧠 Sistema de IA & Skills Co-locadas

O ecossistema utiliza o sistema de **AI Skills** do Antigravity/Gemini localizado na pasta `.gemini/skills/`. Isso permite que agentes de IA carreguem as instruções e regras ideais dinamicamente conforme o contexto da tarefa:

1. **`chrome-extension`:** Diretrizes do Manifest V3, restrições do service worker e regras de injeção segura no DOM do ChatMix.
2. **`site-panel`:** Boas práticas em React 19, convenção de nomes em português e tratamento de SSO e Embedded Mode.
3. **`firebase-dev-ops`:** Lista de comandos do monorepo, controle de ambiente e o schema JSON do banco de dados Realtime.
4. **`ui-ux-pro-max`:** Paletas HSL no Dark Theme, micro-animações dinâmicas e design de glassmorphism premium.
5. **`anthropic-design`:** Filosofia de design limpa e minimalista baseada em cores quentes, tipografia de alta legibilidade e bordas finas com foco em usabilidade.
6. **`code-reviewer`:** Padrões de revisão de código, qualidade TypeScript, prevenção de vazamento de memória e auditoria crítica de segurança contra Prototype Pollution, XSS e Path Traversal.
7. **`vercel-react-best-practices`:** Padrões de componentes React 18/19, otimização de estado/hooks e tratamento de re-renders.
8. **`frontend-design`:** Alinhamento de design clean, contraste tipográfico e regras de layouts responsivos.
9. **`mattpocock-typescript`:** Padrões avançados de TypeScript, tipagem estrita, exclusão do tipo 'any' e guardas de tipo.
10. **`code-simplifier`:** Diretrizes para simplificação de lógica, redução de aninhamento (guard clauses) e divisão de funções.




### 🛰️ Diagrama de Fluxo e Integração

```mermaid
graph TD
    subgraph Google Chrome (Client)
        Extension[Chrome Extension - Extensão/] -- Injeta UI/Automações --> ChatMix[Interface ChatMix]
        Extension -- Controla Abas/Preenche --> SGP[Sistema SGP admin]
        
        subgraph Iframe Container
            IframeSite[Painel Web - Site/] -- Embedded mode=embed --> Extension
        end
    end

    subgraph Firebase Cloud (Backend)
        Auth[Firebase Auth API]
        RTDB[(Realtime Database)]
        Firestore[(Cloud Firestore)]
    end

    Extension -- 1. postMessage Bridge --> IframeSite
    IframeSite -- 2. SSO Session Sync --> Extension
    
    Extension -- HTTPS REST fetch --> Firestore
    Extension -- HTTPS REST fetch --> Auth
    Extension -- HTTP REST / SSE --> RTDB
    
    IframeSite -- Web SDK Completo --> Firestore
    IframeSite -- Web SDK Completo --> RTDB
    IframeSite -- Web SDK Completo --> Auth
    
    style Extension fill:#4285F4,stroke:#333,stroke-width:2px,color:#fff
    style IframeSite fill:#646CFF,stroke:#333,stroke-width:2px,color:#fff
    style ChatMix fill:#34A853,stroke:#333,color:#fff
    style SGP fill:#FBBC05,stroke:#333,color:#000
    style RTDB fill:#FFCA28,stroke:#333,color:#000
    style Firestore fill:#FFCA28,stroke:#333,color:#000
```

---

## 🤝 Comunicação Site ↔️ Extensão (SSO & Message Bridge)

Para fornecer uma experiência unificada e sem fricção, o Painel Web e a Extensão do Chrome compartilham sessões e layouts de forma inteligente:

### 1. SSO & Sincronização de Login Automática
Toda a autenticação é unificada através do Firebase Authentication:
* **`BRIDGE_READY`**: Ao inicializar em uma página do site, a extensão injeta uma ponte no escopo global e emite um evento avisando que a comunicação está pronta.
* **Site ➡️ Extensão**: Se o site estiver logado e a extensão vazia, o site envia a função `syncWithExtension()` com a sessão ativa. A extensão armazena no `chrome.storage.local` e faz login imediato.
* **Extensão ➡️ Site**: Se o site for aberto e estiver deslogado, mas a extensão possuir uma sessão ativa, a extensão envia o payload `SSO_SESSION_DATA`. O site consome o token de sessão usando `performSSOLogin(session)` e efetua o login do usuário sem necessidade de digitar credenciais.

### 2. Modo Incorporado (Iframe Embed)
Quando o chat interno do painel web é aberto dentro do SidePanel/Popup da Extensão do Chrome:
* A extensão carrega a URL do site adicionando a query `?mode=embed`.
* O site intercepta a query e ativa a classe global `.layout-embed`.
* O painel web oculta automaticamente todas as barras de navegação (Sidebar, cabeçalhos, rodapés, checklists de tarefas) e maximiza a interface do **Chat Interno Setorial**, provendo um chat nativo e extremamente compacto para o atendente.

### 3. Bypass de Cookies do Iframe (SameSite Cookie Bypass)
Para renderizar o SGP em iframes e preencher relatórios de O.S. sem sofrer restrições de segurança do navegador:
* A extensão utiliza `chrome.webRequest.onHeadersReceived` com portas dedicadas para reescrever cabeçalhos HTTP de cookies do SGP, removendo restrições de `SameSite` e adicionando atributos `Secure`.
* Regras declarativas via `chrome.declarativeNetRequest` garantem a persistência do cookie de sessão no tráfego de rede isolado do iframe.

---

## 🗄️ Arquitetura de Banco de Dados Híbrido

O ecossistema utiliza um backend Firebase estruturado em um formato híbrido para otimizar desempenho e consumo de banda:

### Realtime Database (RTDB)
Usado para ações voláteis e sincronização em milissegundos:
* **Presença Online:** Monitoramento do status dos atendentes em tempo real usando o nó `.info/connected` do Firebase e gatilhos de `onDisconnect()` (marcando o atendente como `offline` imediatamente quando fecha o navegador).
* **Chat Setorial:** Comunicação ágil dividida nos canais `geral`, `ti`, `financeiro`, `suporte` e `comercial`.
* **Notificações:** Alertas instantâneos disparados para atendentes específicos sobre chamados ou menções.

### Cloud Firestore
Banco de dados NoSQL estruturado para informações consistentes e robustas:
* **`/clientes`**: Cadastro completo contendo mais de 22.000 clientes.
  * *Otimização:* Para economizar banda e franquia de leitura, a Extensão realiza buscas cirúrgicas por CPF sanitizado usando chamadas de query `POST :runQuery` em endpoints REST, evitando loops e o download de coleções completas.
* **`/atendentes`**: Armazena perfis, cargos (`usuario`, `supervisor`, `moderador`, `admin`), status (ativo/bloqueado) e setor.
* **`/respostas_rapidas`**: Respostas padrão cadastradas por atendente ou globais.
* **`/modelos_os`**: Modelos e templates de Ordem de Serviço cadastrados.

---

## ✨ Funcionalidades por Componente

### 1. Extensão Chrome (Manifest V3)
* **Injeção de Botões Rápidos no ChatMix:**
  * 👤 **Contato:** Copia instantaneamente o nome e telefone limpos e formatados do cliente.
  * 🤖 **Prompt AI:** Analisa o histórico do chat, remove mensagens de automação/transfers, e monta um prompt estruturado para colar no ChatGPT, Claude ou similar.
  * 📄 **CPF/CNPJ:** Copia o CPF detectado automaticamente nos textos da conversa.
  * 📝 **O.S.:** Abre a tela de criação de Ordens de Serviço.
  * 🔄 **Atualizar:** Limpa o cache local e atualiza os dados em tempo real.
  * ↗️ **SGP:** Abre o perfil do cliente diretamente no SGP administrativo.
* **Modal de O.S. Automatizado:**
  * Identifica o contrato do cliente com indicador visual de status de velocidade (Online, Velocidade Reduzida, Suspenso Financeiro, Bloqueado).
  * Auto-preenche o formulário do SGP no background.
  * Sistema de **Auto-Rascunho (Draft):** Salva o preenchimento conforme o atendente digita, restaurando em caso de fechamento acidental.
* **Respostas Rápidas Injetadas:**
  * Categorizadas em dois níveis. Inserção com um clique no campo de texto de resposta do ChatMix.
* **Notificações em Segundo Plano:**
  * O Service Worker monitora atualizações mesmo com a extensão fechada, exibindo alertas nativos do Windows/macOS e adicionando um Badge visual (`!`) no ícone do Chrome.

### 2. Painel Administrativo Web (Site)
* **Chat Departamental:** Canais corporativos em tempo real.
* **Organizador de Respostas Rápidas:** Biblioteca de snippets com ordenamento dinâmico via **Drag & Drop** e suporte a tags de saudação dinâmica.
* **Conversor de Aditivos PDF:**
  * Processamento local 100% no navegador (via `pdfjs-dist`). Extrai dados de contratos e gera automaticamente textos padronizados para instalação ou retirada de equipamentos.
* **Espaço de Trabalho Notas & Checklists:** Bloco de tarefas individual com controle de estados (*Pendente, Em Andamento, Concluído*).
* **Gestão de Acessos:** Repositório criptografado para IPs internos, credenciais críticas e switches.
* **Painel Administrativo Completo:** Gestão de atendentes, permissões granulares de acesso baseado em papéis (RBAC) e disparador de avisos globais no painel de avisos do ecossistema.
* **Customização Estética:** Suporte completo a temas Light/Dark nativos e fundos animados (vídeos `.mp4` ou fotos dinâmicas).

---

## 🚀 Guia de Instalação e Desenvolvimento

O repositório disponibiliza um orquestrador de comandos centralizado no arquivo `package.json` da raiz.

### Pré-requisitos
* **Node.js** 18 ou superior.
* **npm** ou **yarn**.

### 1. Clonar e Instalar todas as dependências
Clone o repositório e execute a instalação em lote de todos os projetos a partir da raiz:
```bash
git clone https://github.com/Vituali/Chrome-Extension-ATI-V2.git
cd Chrome-Extension-ATI-V2
npm run install:all
```

### 2. Comandos de Inicialização (Development)
Para iniciar os servidores locais de desenvolvimento:

* **Iniciar o Painel Web (Site):**
  ```bash
  npm run dev:site
  ```
  *(Acessível em `http://localhost:5173` ou conforme porta indicada)*

* **Iniciar a Extensão (Modo Desenvolvimento com Hot-Reload):**
  ```bash
  npm run dev:extension
  ```
  *(Os arquivos compilados em tempo de desenvolvimento serão atualizados na pasta `Extensão/build`)*

### 3. Compilação de Produção (Build)

* **Compilar o Painel Web:**
  ```bash
  npm run build:site
  ```
* **Compilar a Extensão:**
  ```bash
  npm run build:extension
  ```
* **Empacotar a Extensão para envio à Chrome Web Store (Gera arquivo .zip):**
  ```bash
  npm run zip:extension
  ```

### 4. Como Carregar a Extensão no Chrome
1. Abra o navegador Google Chrome e navegue até `chrome://extensions/`.
2. Ative a chave **Modo do desenvolvedor** no canto superior direito.
3. Clique no botão **Carregar expandida** (*Load unpacked*).
4. Selecione a pasta **`Extensão/build`** gerada após o comando de build ou dev.

---

## 🔒 Variáveis de Ambiente (.env)

Ambos os projetos dependem de credenciais do Firebase. Crie arquivos `.env` respectivos nas pastas `Extensão/` e `Site/` de acordo com os exemplos existentes:

### Exemplo `.env` (`Site/` e `Extensão/`):
```env
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://seu_projeto-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

---

## 📋 Changelog Recente do Ecossistema

### v2.2.0 [2026.04.11]
* **Chat Interno via Iframe Embed:** Migração completa da lógica de chat interno da extensão para carregar a interface otimizada do Painel Web via Iframe em tempo real.
* **Notificações em Background:** Monitoramento contínuo das mensagens do chat via Service Worker, emitindo notificações push locais.
* **Badge no Ícone:** Indicador visual em vermelho de mensagens não lidas no ícone da extensão.
* **Melhorias de Compilação:** Resolução de erros críticos de build do Vite e gerenciamento de concorrência de inicialização.

### v2.1.0 [2026.04.08]
* **Persistência em chrome.storage.session:** Migração de variáveis globais do Service Worker para cache em storage local, evitando perda de estado durante a suspensão do Service Worker.
* **Paralelização de Buscas no SGP:** Execução concorrente de busca por Nome e Telefone via `Promise.all` quando a busca direta por CPF falhar, diminuindo o tempo de resposta em 40%.
* **Detecção Inteligente de Abas:** Botão SGP na extensão analisa abas abertas pelo título, focando na aba existente em vez de abrir cópias duplicadas do cliente.
* **Segurança e Sanitização:** Remoção total do uso de `innerHTML` nas injeções da extensão (substituído por `textContent` para conformidade com a Chrome Web Store) e adição de tokens randômicos via `crypto.randomUUID()` para mensagens postMessage.

---

## 👤 Autor e Contribuições

Desenvolvido com carinho e foco técnico por **Vituali** para uso interno e produtividade da **ATI Internet**.

---

<div align="center">
<sub>Distribuído sob Licença MIT. Veja <a href="LICENSE">LICENSE</a> para detalhes.</sub>
</div>
