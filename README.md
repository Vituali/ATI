# ATI - Auxiliar de Atendimentos 🤖

[![Deploy static content to Pages](https://github.com/Vituali/ATI/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/Vituali/ATI/actions/workflows/pages/pages-build-deployment)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)
![Versão](https://img.shields.io/badge/vers%C3%A3o-3.0.0-brightgreen)

Um sistema de produtividade multiusuário para equipas de atendimento, focado em agilizar a comunicação e automatizar tarefas repetitivas. O ATI combina um gerenciador de respostas rápidas com um conversor inteligente de aditivos contratuais em PDF, tudo com contas de usuário individuais e um painel de administração.

### ✨ [Acesse a versão ao vivo aqui!](https://vituali.github.io/ATI/)

---

## 🚀 Funcionalidades Principais

O ATI é dividido em duas ferramentas principais, com uma interface totalmente personalizável e um sistema de autenticação completo.

* **🔐 Sistema de Autenticação e Gerenciamento:**
    * **Contas Individuais:** Sistema completo de Registro e Login para cada atendente.
    * **Login Flexível:** Permite o login tanto com **nome de usuário** quanto com **e-mail**.
    * **Gerenciamento de Perfil:** Usuários podem alterar o próprio nome completo e senha.
    * **Painel de Administração:** Uma área restrita para administradores gerenciarem outros usuários, alterando suas permissões (role) e status (ativo/inativo).
    * **Segurança Robusta:** Regras de segurança no Firebase impedem o acesso não autorizado e a sobrescrita de nomes de usuário.

* **💬 Chat Automatizado:**
    * Crie, edite e apague respostas padrão salvas na sua conta.
    * **Modelo para Novos Usuários:** Novos registros começam com um conjunto de respostas-padrão para facilitar a integração.
    * Organize as respostas em categorias customizáveis.
    * Reordene tanto as categorias quanto as respostas com um sistema de **Arrastar e Soltar (Drag and Drop)**.
    * Use marcadores dinâmicos como `[SAUDACAO]` e `[DESPEDIDA]` que se ajustam ao horário.

* **📄 Conversor de Aditivos:**
    * Faça o upload de um aditivo contratual em PDF.
    * O sistema extrai automaticamente: Número do Contrato, Nome do Cliente e Endereços.
    * Preencha informações adicionais num formulário inteligente.
    * Gere uma Ordem de Serviço (O.S.) completa e formatada com um clique.

* **🎨 Interface Personalizável:**
    * Alterne entre **Modo Claro** e **Modo Escuro**.
    * Ative/desative o efeito de **Bordas Neon**.
    * Escolha cores personalizadas para ícones, bordas e títulos.
    * As preferências são salvas no navegador e persistem entre as sessões.

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído com tecnologias web puras para garantir leveza e performance.

* **Frontend:** HTML5, CSS3 (com Variáveis CSS), JavaScript (ES6 Modules)
* **Autenticação e Banco de Dados:** Firebase Authentication e Firebase Realtime Database
* **Bibliotecas:**
    * [SortableJS](https://github.com/SortableJS/Sortable): Para a funcionalidade de Arrastar e Soltar.
    * [PDF.js](https://mozilla.github.io/pdf.js/): Para a leitura e extração de texto de arquivos PDF.
* **Hospedagem e CI/CD:** GitHub Pages com GitHub Actions para deploy automático.

## ⚙️ Como Rodar o Projeto Localmente

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/vituali/ATI.git](https://github.com/vituali/ATI.git)
    ```
2.  **Navegue até a pasta do projeto:**
    ```bash
    cd ATI
    ```
3.  **Inicie um servidor local:**
    Como o projeto usa Módulos JavaScript (ESM), ele precisa ser servido por um servidor web. A forma mais fácil é usando `http-server`.
    * Se não tiver o `http-server`, instale globalmente com o Node.js:
        ```bash
        npm install -g http-server
        ```
    * Inicie o servidor na pasta do projeto:
        ```bash
        http-server
        ```
    * Abra o endereço fornecido (geralmente `http://localhost:8080`) no seu navegador.

## 🗂️ Estrutura de Ramificação (Branching Strategy)

* **`main`**: Branch de produção. Contém apenas o código estável que está no ar.
* **`develop`**: Branch principal de desenvolvimento. Todas as novas funcionalidades são mescladas aqui.
* **`feature/*`**: Branches para novas funcionalidades ou correções.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

*Desenvolvido por [Vituali](https://github.com/vituali).*
