// bridge-listener.js

// 1. Cria um elemento <script> no HTML do seu site.
const s = document.createElement('script');
// 2. Define o 'src' para o nosso script injetável, que o manifest.json tornou acessível.
s.src = chrome.runtime.getURL('bridge-injected.js');
// 3. Adiciona o script à página. A partir daqui, o bridge-injected.js começa a rodar.
(document.head || document.documentElement).appendChild(s);

// 4. Fica ouvindo mensagens enviadas pelo script injetado.
window.addEventListener('message', (event) => {
    // Garante que a mensagem veio do nosso script e não de outro lugar
    if (event.source === window && event.data.type && event.data.type === 'ATI_ATTENDANT_UPDATE') {
        const attendantKey = event.data.attendant;
        
        // Salva o atendente no armazenamento da extensão
        chrome.storage.local.set({ atendenteAtual: attendantKey }, () => {
            if (attendantKey) {
                console.log(`[Extensão ATI] Ponte conectada. Atendente '${attendantKey}' definido.`);
            } else {
                console.log(`[Extensão ATI] Ponte conectada. Usuário fez logout.`);
            }
        });
    }
}, false);