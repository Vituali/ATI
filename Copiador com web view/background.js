// Este script ouve o comando de atalho definido no manifest.json
chrome.commands.onCommand.addListener((command) => {
  // Verifica se o comando é o que configuramos
  if (command === "copy-data") {
    // Encontra a aba ativa e envia uma mensagem para o content.js
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "executeCopy" });
      }
    });
  }
});