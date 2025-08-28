// bridge-injected.js
console.log("[Site] Ponte injetada INICIADA. Monitorando login...");

let lastKnownAttendant = null;

setInterval(() => {
    const currentAttendant = localStorage.getItem('atendenteAtual');

    if (currentAttendant !== lastKnownAttendant) {
        console.log(`[Site] Mudança detectada! Atendente agora é: ${currentAttendant}. Enviando mensagem para a extensão...`);
        lastKnownAttendant = currentAttendant;

        window.postMessage({
            type: 'ATI_ATTENDANT_UPDATE',
            attendant: currentAttendant
        }, '*');
    }
}, 1500);