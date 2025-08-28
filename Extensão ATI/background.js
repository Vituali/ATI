// background.js

// Listener para o comando de atalho (Ctrl+Shift+C)
chrome.commands.onCommand.addListener((command) => {
  if (command === "copy-data") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Adicionamos um callback vazio para tratar o erro
        chrome.tabs.sendMessage(tabs[0].id, { action: "executeCopy" }, () => {
          // A função chrome.runtime.lastError será definida se a mensagem falhar.
          // Ao ter este callback, o erro é "capturado" e não aparece no console.
          if (chrome.runtime.lastError) {
            console.log("O atalho foi pressionado em uma aba não compatível. Isso é normal.");
          }
        });
      }
    });
  }
});

// Listener para a mensagem da ponte (aviso de login/logout)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "userChanged") {
    console.log('[Background] Aviso de mudança de usuário recebido. Notificando abas do Chatmix...');
    
    chrome.tabs.query({ url: "*://*.chatmix.com.br/*" }, (tabs) => {
      tabs.forEach(tab => {
        // Adicionamos o mesmo callback de tratamento de erro aqui
        chrome.tabs.sendMessage(tab.id, { action: "reloadTemplates" }, () => {
          if (chrome.runtime.lastError) {
            console.log(`A aba do Chatmix ${tab.id} não estava pronta para receber a mensagem. Isso é normal.`);
          }
        });
      });
    });
  }
  // Retornar true é importante para indicar que a resposta pode ser assíncrona
  return true; 
});