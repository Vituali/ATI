// background.js

// Listener para o comando de atalho (Ctrl+Shift+C)
chrome.commands.onCommand.addListener((command) => {
  if (command === "copy-data") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "executeCopy" });
      }
    });
  }
});

// Listener para a mensagem da ponte (aviso de login/logout)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "userChanged") {
    console.log('[Background] Aviso de mudança de usuário recebido. Notificando abas do Chatmix...');
    
    // Encontra todas as abas do Chatmix (V1 e V2)
    chrome.tabs.query({ url: "*://*.chatmix.com.br/*" }, (tabs) => {
      tabs.forEach(tab => {
        // Envia uma mensagem para cada aba recarregar os dados
        chrome.tabs.sendMessage(tab.id, { action: "reloadTemplates" });
      });
    });
  }
  return true;
});