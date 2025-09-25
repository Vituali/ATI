/**
 * Ponte de comunicação entre o site-painel e a extensão.
 * Este script é injetado na página do painel para ler dados do localStorage
 * e enviá-los para a extensão.
 */

// A cada 2 segundos, esta função verifica se o usuário fez login no site
setInterval(() => {
    // Lê o 'atendenteAtual' que o app.js do site salvou no localStorage
    const attendantKey = localStorage.getItem('atendenteAtual');

    if (attendantKey) {
        // Verifica no armazenamento da extensão se o valor já é o mesmo para evitar escritas desnecessárias.
        chrome.storage.local.get('atendenteAtual', (data) => {
            if (data.atendenteAtual !== attendantKey) {
                // Se for diferente (ou não existir), salva o novo valor
                chrome.storage.local.set({ atendenteAtual: attendantKey }, () => {
                    // Notifica a extensão que o usuário mudou
                    chrome.runtime.sendMessage({ action: 'userChanged' });
                });
            }
        });
    }

    // Lê as configurações de tema do localStorage do site
    const themeSettings = localStorage.getItem('ati-theme-settings');
    if (themeSettings) {
        // Salva as configurações de tema no armazenamento da extensão
        chrome.storage.local.set({ atiSiteTheme: JSON.parse(themeSettings) });
    }
}, 2000);
