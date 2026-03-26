# ATI V2 — Auxiliar de Atendimentos

O ATI (Auxiliar de Atendimentos) é um sistema web desenvolvido para otimizar a rotina diária de atendentes (suporte/telecom). Ele atua como uma central de ferramentas, oferecendo comunicação interna ágil, textos padronizados e automações operacionais [1].

## 🚀 Funcionalidades

- **Chat Interno:** Comunicação em tempo real dividida por setores (Geral, TI, Financeiro, Suporte, Comercial) utilizando Firebase Realtime Database. Conta com detecção de usuários online e salas com mensagens não lidas [2-4].
- **Respostas Rápidas:** Textos categorizados com reordenação via arrastar-e-soltar e variáveis dinâmicas (ex: saudações automáticas com base no horário local) [5-7].
- **Modelos de O.S.:** Templates padronizados para preenchimento ágil de Ordens de Serviço (SGP) [8, 9].
- **Conversor de Aditivo (PDF):** Extração de dados de contratos em PDF utilizando `pdfjs-dist` nativamente no navegador, gerando textos de instalação/retirada automaticamente [10, 11].
- **Anotações Pessoais:** Bloco de notas com suporte a checklists de tarefas e status visual ("pendente", "em andamento", "concluído") [12-14].
- **Senhas e Acessos:** Central de consulta rápida a IPs de equipamentos, sistemas e credenciais [15, 16].
- **Painel Admin:** Gerenciamento de acessos (cargos e setores) de usuários e publicação de avisos/alertas globais exibidos na Home [17-19].
- **Personalização de Perfil:** Alternância nativa entre temas Claro/Escuro e suporte a vídeos (`.mp4`, `.webm`) ou imagens personalizadas como plano de fundo [20-22].
- **Sistema de Notificações:** Sistema customizado de Toasts e Confirmações integrado globalmente [23-25].

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19 [26]
- **Build Tool:** Vite 6 [26]
- **Linguagem:** TypeScript [26]
- **Backend / Banco de Dados / Auth:** Firebase 12 (Authentication + Realtime Database) [26, 27]
- **Estilização:** CSS Puro utilizando CSS Variables para os temas [28]
- **Processamento de PDFs:** `pdfjs-dist` (processamento local via Web Workers) [11, 26]

## 💻 Como rodar localmente

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd ati-v2
   Instale as dependências:
   Configure as Variáveis de Ambiente: Crie um arquivo .env na raiz do projeto com as credenciais do seu projeto Firebase
   :
   Inicie o servidor de desenvolvimento:
   ```

# ATI V2 — Attendance Assistant

ATI (Auxiliar de Atendimentos) is a specialized web system built to optimize the daily routines of telecom and support attendants. It acts as a central hub providing internal communication, quick text tools, and workflow automations [1].

## 🚀 Features

- **Internal Chat:** Real-time communication divided by company sectors (General, IT, Financial, Support, Commercial) using Firebase Realtime Database. Includes online presence and unread message notifications [2-4].
- **Quick Replies:** Categorized, drag-and-drop sortable text snippets with dynamic variables (e.g., auto-greetings based on the time of day) [5-7].
- **O.S. Templates:** Standardized templates for service orders (SGP) [8, 9].
- **PDF Converter:** Parses "Additive" contract PDFs entirely client-side via `pdfjs-dist` to generate ready-to-use installation/withdrawal texts automatically [10, 11].
- **Notes & Tasks:** Personal to-do lists and notes with checklist support and status indicators ("pendente", "em andamento", "concluído") [12-14].
- **Passwords & Quick Access:** Fast access to common equipment IPs, logins, and system links [15, 16].
- **Admin Dashboard:** Manage user roles (user, supervisor, moderator, admin) and sectors. Publish and manage global system alerts (`AvisosHome`) [17-19].
- **Profile Customization:** Full dark/light mode support and custom dynamic video (`.mp4`, `.webm`) or image backgrounds per user [20-22].
- **Notification System:** Custom built-in Toast notifications for alerts and confirmations [23-25].

## 🛠️ Tech Stack

- **Frontend Framework:** React 19 [26]
- **Build Tool:** Vite 6 [26]
- **Language:** TypeScript [26]
- **Backend / Database / Auth:** Firebase 12 (Authentication + Realtime Database) [26, 27]
- **Styling:** Pure CSS with extensive use of CSS Variables for theming [28]
- **PDF Processing:** `pdfjs-dist` (running via Web Workers) [11, 26]

## 💻 Running Locally

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ati-v2
   Install dependencies:
   Configure Environment Variables: Create a .env file at the root based on your Firebase configuration
   :
   Start the development server:
   ```
