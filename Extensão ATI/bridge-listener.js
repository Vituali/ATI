// bridge-listener.js
console.log('[Extensão ATI] Listener da ponte INICIADO.');

const s = document.createElement('script');
s.src = chrome.runtime.getURL('bridge-injected.js');
(document.head || document.documentElement).appendChild(s);
s.onload = () => console.log('[Extensão ATI] Script injetado com sucesso no site.');

window.addEventListener('message', (event) => {
    if (event.source === window && event.data.type && event.data.type === 'ATI_ATTENDANT_UPDATE') {
        const attendantKey = event.data.attendant;
        
        console.log(`[Extensão ATI] MENSAGEM RECEBIDA: Atendente é '${attendantKey}'. Salvando...`);
        chrome.storage.local.set({ atendenteAtual: attendantKey }, () => {
            console.log('[Extensão ATI] Atendente salvo com sucesso no armazenamento da extensão.');
            
            // AVISO PARA O BACKGROUND SCRIPT QUE O USUÁRIO MUDOU
            chrome.runtime.sendMessage({ action: "userChanged" });
        });
    }
}, false);