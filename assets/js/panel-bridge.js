/**
 * Ponte de comunicação entre o site-painel e a extensão.
 * Este script deve ser injetado na página do painel para ler dados do localStorage
 * e enviá-los para a extensão.
 */

let lastSentAttendant = null;
let lastSentTheme = null;

function sendDataToExtension() {
    try {
        // 1. Lê o atendente atual do localStorage do painel
        const attendantKey = localStorage.getItem('atendenteAtual');
        if (attendantKey && attendantKey !== lastSentAttendant) {
            chrome.runtime.sendMessage({ action: 'userChanged', attendantKey: attendantKey });
            lastSentAttendant = attendantKey;
            console.log(`[Ponte] Status do atendente ('${attendantKey}') foi enviado para a extensão.`);
        }

        // 2. Lê as configurações de tema do localStorage do painel
        const themeSettings = localStorage.getItem('ati-theme-settings');
        if (themeSettings && themeSettings !== lastSentTheme) {
            chrome.runtime.sendMessage({ action: 'themeUpdated', themeSettings: JSON.parse(themeSettings) });
            lastSentTheme = themeSettings;
            console.log(`[Ponte] Novas configurações de tema enviadas para a extensão.`);
        }
    } catch (error) {
        // Se a extensão for desativada ou atualizada, a comunicação pode falhar.
        // O console.error ajuda a debugar, mas não impede a próxima tentativa.
        console.error("ATI Extensão [Ponte]: Falha ao enviar dados. A extensão pode estar indisponível.", error);
    }
}

// Inicia a verificação periódica para manter a extensão sincronizada
console.log("ATI Extensão [Ponte]: Iniciando sincronização com o painel.");
setInterval(sendDataToExtension, 2000);
