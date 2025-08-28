// bridge.js

console.log("ATI Extensão [Ponte]: Script da ponte carregado no site-painel.");

// A cada 2 segundos, esta função verifica se o usuário fez login no site
setInterval(() => {
    // Lê o 'atendenteAtual' que o app.js do site salvou no localStorage
    const attendantKey = localStorage.getItem('atendenteAtual');

    if (attendantKey) {
        // Verifica no armazenamento da extensão se o valor já é o mesmo
        chrome.storage.local.get('atendenteAtual', (data) => {
            if (data.atendenteAtual !== attendantKey) {
                // Se for diferente (ou não existir), salva o novo valor
                chrome.storage.local.set({ atendenteAtual: attendantKey }, () => {
                    console.log(`[Ponte] Atendente '${attendantKey}' foi salvo para a extensão.`);
                });
            }
        });
    }
}, 2000);