# ATI — Painel Web Administrativo 💻

Esta é a pasta do painel web administrativo e de suporte do ecossistema ATI V2. Ele fornece o chat setorial em tempo real, painel de controle de atendentes, criador de modelos de O.S., conversor de aditivos contratuais em PDF e base de credenciais.

---

## 🛠️ Stack Tecnológico

- **Linguagem:** TypeScript 5.8
- **Framework:** React 19
- **Build Tool:** Vite 6
- **Firebase:** SDK Completo v12 (Autenticação + Realtime Database)
- **Estilização:** CSS Vanilla puro co-localizado por componente

---

## 🚀 Como Executar Localmente

Antes de rodar, certifique-se de que instalou todas as dependências a partir do diretório raiz utilizando:
```bash
npm run install:all
```

### 1. Iniciar Servidor de Desenvolvimento
A partir da raiz do monorepo:
```bash
npm run dev:site
```
O painel web administrativo estará disponível na porta indicada pelo Vite (geralmente `http://localhost:5173`).

### 2. Compilar para Produção
```bash
npm run build:site
```
Os arquivos otimizados e minificados para distribuição serão criados na pasta `build/`.

---

## 📝 Regras e Arquitetura Detalhada
Para obter mais informações sobre controle de acessos RBAC, sincronização SSO com a extensão e o design de banco de dados híbrido, consulte o **[README.md principal na raiz do monorepo](../README.md)**.
