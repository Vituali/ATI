/**
 * Ponte de comunicação entre o site-painel e a extensão.
 * Este script é injetado na página do painel para ler dados do localStorage
 * e enviá-los para a extensão usando uma conexão persistente.
 */

let port = null;
let lastSentAttendant = null;
let lastSentTheme = null;

function connect() {
    try {
        console.log("ATI Extensão [Ponte]: Tentando conectar ao service worker...");
        port = chrome.runtime.connect({ name: "panel-bridge" });

        port.onDisconnect.addListener(() => {
            console.warn("ATI Extensão [Ponte]: Desconectado do service worker. Tentando reconectar em 5 segundos...");
            port = null;
            setTimeout(connect, 5000);
        });

        port.onMessage.addListener((msg) => {
            // Pode ser usado para comunicação bidirecional no futuro
            console.log("ATI Extensão [Ponte]: Mensagem recebida do service worker:", msg);
        });

        console.log("ATI Extensão [Ponte]: Conectado com sucesso.");
        // Força o reenvio dos dados na reconexão
        lastSentAttendant = null;
        lastSentTheme = null;
    } catch (error) {
        console.error("ATI Extensão [Ponte]: Falha ao conectar. A extensão foi atualizada ou desativada? Tentando novamente em 5s.", error);
        setTimeout(connect, 5000);
    }
}

function sendData() {
    if (!port) {
        return; // A reconexão já está agendada no onDisconnect
    }

    try {
        // 1. Lê o atendente atual
        const attendantKey = localStorage.getItem('atendenteAtual');
        if (attendantKey !== lastSentAttendant) {
            port.postMessage({ action: 'userChanged', attendantKey: attendantKey });
            lastSentAttendant = attendantKey;
            console.log(`[Ponte] Status do atendente ('${attendantKey}') foi enviado para a extensão.`);
        }

        // 2. Lê as configurações de tema
        const themeSettings = localStorage.getItem('ati-theme-settings');
        if (themeSettings && themeSettings !== lastSentTheme) {
            port.postMessage({ action: 'themeUpdated', themeSettings: JSON.parse(themeSettings) });
            lastSentTheme = themeSettings;
            console.log(`[Ponte] Novas configurações de tema enviadas para a extensão.`);
        }
    } catch (error) {
        console.error("ATI Extensão [Ponte]: Erro ao enviar dados. A porta pode ter sido fechada.", error);
        // A desconexão será tratada automaticamente pelo onDisconnect.
    }
}

// Inicia a primeira conexão
connect();

// Verifica e envia os dados periodicamente
setInterval(sendData, 2000);

