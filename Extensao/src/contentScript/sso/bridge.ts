/**
 * SSO Bridge Content Script - Versão com Sincronismo Ativo
 */

console.log("[Extensão ATI] Ponte de SSO ativa e aguardando...");

// Função para avisar o site que a ponte está pronta
function pingSite() {
  window.postMessage({ type: "ATI_EXTENSION_TO_SITE", action: "BRIDGE_READY" }, "*");
}

window.addEventListener("message", (event) => {
  // Apenas aceitamos mensagens da nossa própria página
  if (event.source !== window) return;

  const { type, action, session } = event.data || {};

  // Log de diagnóstico para ver o que está passando pela ponte
  if (type?.startsWith("ATI_")) {
    console.log(`[Extensão ATI] Bridge ouviu: type=${type}, action=${action}`);
  }

  // O Site enviou dados de login
  if (type === "ATI_SITE_TO_EXTENSION" && action === "SSO_LOGIN") {
    console.log("[Extensão ATI] 🟢 Recebido login do site, salvando no background...");
    chrome.runtime.sendMessage({ action: "SSO_LOGIN", session }, (response) => {
      console.log("[Extensão ATI] Resposta do background:", response);
    });
  }

  // O Site enviou sinal de logout
  if (type === "ATI_SITE_TO_EXTENSION" && action === "SSO_LOGOUT") {
    console.log("[Extensão ATI] 🔴 Recebido logout do site, limpando no background...");
    chrome.runtime.sendMessage({ action: "logout" }, (response) => {
      console.log("[Extensão ATI] Resposta do logout do background:", response);
    });
  }

  // O Site pediu a sessão atual
  if (type === "ATI_SITE_TO_EXTENSION" && action === "GET_SSO_SESSION") {
    chrome.runtime.sendMessage({ action: "GET_SSO_SESSION" }, (response) => {
      console.log("[Extensão ATI] Enviando sessão atual para o site:", !!response?.session);
      window.postMessage({ type: "ATI_EXTENSION_TO_SITE", action: "SSO_SESSION_DATA", session: response?.session }, "*");
    });
  }
});

// Ao carregar, verifica se já estamos logados no background
chrome.runtime.sendMessage({ action: "GET_SSO_SESSION" }, (response) => {
  if (!response?.session) {
    console.log("[Extensão ATI] Nenhuma sessão no background. Solicitando ao site...");
    pingSite();
  } else {
    console.log("[Extensão ATI] Já existe uma sessão ativa no background.");
  }
});
