// content.js - Script principal que inicializa a extensão e gerencia os eventos.

// Listener para o atalho de teclado e para o aviso de recarregar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "executeCopy") {
    if (typeof copyContactInfo === "function") {
      copyContactInfo();
      sendResponse({ status: "Cópia executada." });
    } else {
      sendResponse({ status: "Erro: Função de cópia não encontrada." });
    }
  } else if (request.action === "reloadTemplates") {
    console.log("ATI Extensão: Aviso de recarregamento recebido. Buscando novos templates...");
    runExtension();
    sendResponse({ status: "Templates recarregados." });
  }
  return true;
});

// ===================================================================================
// LÓGICA DE INICIALIZAÇÃO CORRETA E ROBUSTA
// ===================================================================================

async function runExtension() {
  if (typeof initializeActions === "function" && typeof loadTemplatesFromStorage === "function") {
    // ATENÇÃO: Esta verificação é importante para não duplicar os botões
    if (document.getElementById('actionsContainer') && window.extensionInitialized) {
        console.log("ATI Extensão: Ações já inicializadas, recarregando apenas os dados dos templates.");
    }
    window.extensionInitialized = true; // Marca que a extensão já iniciou uma vez

    console.log("ATI Extensão: runExtension iniciada.");
    try {
      const templates = await loadTemplatesFromStorage();
      console.log("ATI Extensão: Templates carregados.");
      window.osTemplates = templates;
      initializeActions();
      console.log("ATI Extensão: initializeActions chamada com sucesso.");
    } catch (error) {
      console.error("ATI Extensão: Erro fatal durante a inicialização.", error);
    }
  }
}

const startupInterval = setInterval(() => {
    const targetElement = document.querySelector("section.attendances");
    if (targetElement && targetElement.offsetWidth > 0) {
        clearInterval(startupInterval);
        runExtension();
    } 
}, 500);