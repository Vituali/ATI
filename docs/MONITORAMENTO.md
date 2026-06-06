# Monitoramento de Status da Extensão (Chrome Web Store API v2)

Este guia documenta como configurar um script automático que monitora o processo de revisão da extensão e envia um alerta imediato para seu canal de comunicação (Discord, Telegram, Slack) assim que ela for aprovada e estiver pronta para publicação manual (`STAGED`).

---

## 🔑 1. Como Obter as Credenciais da Google

Para acessar a API, você precisará configurar o acesso à API do Chrome Web Store Developer:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie ou selecione um projeto.
3. Vá em **APIs e Serviços > Biblioteca** e ative a **Chrome Web Store API**.
4. Vá em **APIs e Serviços > Tela de consentimento OAuth**:
   * Configure como **Externo**.
   * Adicione o escopo `https://www.googleapis.com/auth/chromewebstore` (se não achar na busca, adicione manualmente).
5. Vá em **APIs e Serviços > Credenciais**:
   * Clique em **Criar Credenciais > ID do cliente OAuth**.
   * Tipo de Aplicativo: **Aplicativo da Web**.
   * Adicione aos URIs de redirecionamento autorizados: `https://developers.google.com/oauthplayground`.
   * Salve e anote o **Client ID** e o **Client Secret**.
6. Para obter o **Refresh Token**:
   * Acesse o [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
   * Clique na engrenagem no canto superior direito e selecione: **Use your own OAuth credentials** (insira seu Client ID e Client Secret).
   * Na lista de escopos à esquerda, cole: `https://www.googleapis.com/auth/chromewebstore`.
   * Clique em **Authorize APIs** e faça login na sua conta de desenvolvedor Chrome.
   * Na etapa 2, clique em **Exchange authorization code for tokens**.
   * Copie o **Refresh Token** gerado.

---

## 📝 2. Script de Monitoramento (`monitor-status.js`)

Crie o arquivo na pasta de sua escolha ou adicione-o ao seu workflow de CI. O script abaixo faz a autenticação, consulta o status da extensão e envia o alerta.

```javascript
import fetch from "node-fetch"; // Certifique-se de ter o node-fetch instalado no node

// ⚙️ CONFIGURAÇÕES (Recomendado colocar em variáveis de ambiente .env)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "SEU_CLIENT_ID";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "SEU_CLIENT_SECRET";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || "SEU_REFRESH_TOKEN";
const EXTENSION_ID = process.env.CHROME_EXTENSION_ID || "ID_DA_SUA_EXTENSAO";
const PUBLISHER_ID = process.env.GOOGLE_PUBLISHER_ID || "ID_DO_SEU_PERFIL_PUBLISHER";

// Webhook de Destino (Exemplo: Discord)
const WEBHOOK_URL = process.env.MONITOR_WEBHOOK_URL || "SUA_URL_DE_WEBHOOK";

async function monitorar() {
  try {
    // 1. Obter Access Token novo
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });
    
    const { access_token } = await tokenRes.json();
    if (!access_token) throw new Error("Não foi possível gerar o Access Token.");

    // 2. Consultar o Status na API v2 da Google
    const statusRes = await fetch(
      `https://chromewebstore.googleapis.com/v2/publishers/${PUBLISHER_ID}/items/${EXTENSION_ID}:fetchStatus`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const data = await statusRes.json();
    const status = data.state; // PENDING_REVIEW | STAGED | PUBLISHED

    console.log(`[Status Atual]: ${status}`);

    // 3. Se estiver Aprovada & Pronta para lançamento manual (STAGED)
    if (status === "STAGED") {
      await enviarAlerta(
        `🚀 **Extensão Aprovada!**\nO item está no estado **STAGED** (Aprovado e pronto para lançamento).\nAcesse o Dev Console para lançar agora mesmo!`
      );
    }
  } catch (error) {
    console.error("Erro no monitoramento:", error);
  }
}

async function enviarAlerta(mensagem) {
  if (!WEBHOOK_URL) return;
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: mensagem }),
  });
}

monitorar();
```

---

## 🚀 3. Rodando no GitHub Actions (Gratuito)

Você pode configurar o GitHub para rodar esse monitoramento de forma totalmente automática a cada 20 minutos usando um Cron Job nas Actions.

Crie um arquivo em `.github/workflows/monitor-extension.yml`:

```yaml
name: Monitor Extension Status

on:
  schedule:
    # Roda a cada 20 minutos
    - cron: '*/20 * * * *'
  workflow_dispatch: # Permite disparar manualmente

jobs:
  check-status:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run Monitor Script
        env:
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
          GOOGLE_REFRESH_TOKEN: ${{ secrets.GOOGLE_REFRESH_TOKEN }}
          CHROME_EXTENSION_ID: ${{ secrets.CHROME_EXTENSION_ID }}
          GOOGLE_PUBLISHER_ID: ${{ secrets.GOOGLE_PUBLISHER_ID }}
          MONITOR_WEBHOOK_URL: ${{ secrets.MONITOR_WEBHOOK_URL }}
        run: |
          node -e "
          // código compacto do script ou referência direta a um arquivo local
          "
```
