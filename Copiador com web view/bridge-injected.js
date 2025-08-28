// bridge-injected.js

console.log("Ponte ATI injetada no site-painel com sucesso.");

let lastKnownAttendant = null;

// A cada 2 segundos, verifica se o atendente no localStorage mudou.
setInterval(() => {
    const currentAttendant = localStorage.getItem('atendenteAtual');

    // Se o valor mudou (incluindo login e logout)
    if (currentAttendant !== lastKnownAttendant) {
        lastKnownAttendant = currentAttendant;

        // Envia uma mensagem para o 'mundo' da extensão
        window.postMessage({
            type: 'ATI_ATTENDANT_UPDATE',
            attendant: currentAttendant
        }, '*');
    }
}, 2000);