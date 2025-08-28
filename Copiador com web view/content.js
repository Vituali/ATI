// content.js - Script principal que inicializa a extensão e gerencia os eventos.

// Listener para o atalho de teclado
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "executeCopy") {
    if (typeof copyContactInfo === "function") {
        copyContactInfo();
        sendResponse({ status: "Cópia executada." });
    } else {
        sendResponse({ status: "Erro: Função de cópia não encontrada." });
    }
  }
  return true;
});

// ===================================================================================
// LÓGICA DE INICIALIZAÇÃO CORRETA E ROBUSTA
// ===================================================================================

async function runExtension() {
    // Verifica se as funções necessárias existem
    if (typeof initializeActions === "function" && typeof loadTemplatesFromStorage === "function") {
        if (document.getElementById('actionsContainer')) { 
            return; 
        }
        
        console.log("ATI Extensão: runExtension iniciada.");
        try {
            // Carrega os templates e os passa para a função de inicialização
            const templates = await loadTemplatesFromStorage();
            console.log("ATI Extensão: Templates carregados.");
            
            // Define a variável global que o ui.js usará
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