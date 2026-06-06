# ATI — Chrome Extension 🔌

Esta é a pasta da extensão Google Chrome do ecossistema ATI V2, projetada para automatizar o preenchimento de Ordens de Serviço (O.S.) no SGP e injetar respostas rápidas e prompts de inteligência artificial na interface do ChatMix.

---

## 🛠️ Stack Tecnológico

- **Linguagem:** TypeScript
- **Framework:** React 18
- **Build Tool:** Vite + `@crxjs/vite-plugin` (Manifest V3)
- **Firebase:** Chamadas REST via `fetch` no Service Worker (sem SDK padrão para evitar loops e suspensões).

---

## 🚀 Como Executar Localmente

Antes de rodar, certifique-se de que instalou todas as dependências a partir do diretório raiz utilizando:
```bash
npm run install:all
```

### 1. Iniciar Servidor de Desenvolvimento
A partir da raiz do monorepo:
```bash
npm run dev:extension
```
Ou se quiser testar em ambiente de produção local com hot-reload:
```bash
npm run dev:extension:prod
```
Os arquivos gerados para teste em tempo de execução estarão localizados em `build/`.

### 2. Carregar no Navegador
1. Acesse `chrome://extensions/` no Google Chrome.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar expandida** (*Load unpacked*).
4. Selecione a pasta `Extensao/build`.

---

## 📝 Regras e Arquitetura Detalhada
Para obter mais informações sobre a arquitetura de comunicação SSO, postMessage bridge, bypass de SameSite e banco de dados, consulte o **[README.md principal na raiz do monorepo](../README.md)**.
