import { initializeUI, showSection, updateGreeting } from './ui.js';
import { initializeFirebase, loadDataForAttendant } from './firebase.js';
import { initializeTheme } from './theme.js';
import { initializeChat } from './chat.js';
import { initializeConversor } from './conversor.js';

// Executa quando o HTML estiver totalmente carregado
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializa os módulos essenciais
    initializeUI();
    initializeTheme();
    await initializeFirebase(); // Espera o Firebase conectar antes de continuar

    // 2. Inicializa os módulos das seções principais
    const chatModule = initializeChat();
    initializeConversor();

    // 3. Gerencia o estado global da aplicação (Atendente)
    let currentAttendant = localStorage.getItem("atendenteAtual") || "";

    // 4. Seleciona os elementos globais da página
    const atendentePopup = document.getElementById('atendentePopup');
    const atendenteToggleBtn = document.getElementById('atendenteToggleBtn');
    const confirmAtendenteBtn = document.getElementById('confirmAtendenteBtn');
    const atendenteSelect = document.getElementById('atendente');
    const atendenteText = atendenteToggleBtn.querySelector('.text');

    // 5. Funções principais de controle
    const handleAttendantChange = async () => {
        const selected = atendenteSelect.value;
        if (!selected) {
            alert("Por favor, selecione um atendente.");
            return;
        }
        currentAttendant = selected;
        localStorage.setItem("atendenteAtual", currentAttendant);
        atendenteText.textContent = currentAttendant.charAt(0).toUpperCase() + currentAttendant.slice(1);
        
        // Carrega os dados do Firebase e atualiza o módulo de chat
        const data = await loadDataForAttendant(currentAttendant);
        chatModule.setResponses(data);
        
        atendentePopup.style.display = 'none';
    };

    // 6. Configura os eventos principais
    atendenteToggleBtn.addEventListener('click', () => {
        atendentePopup.style.display = 'block';
    });

    confirmAtendenteBtn.addEventListener('click', handleAttendantChange);

    // Adiciona evento aos botões da sidebar para trocar de seção
    document.querySelectorAll('.sidebar-button[data-section]').forEach(button => {
        button.addEventListener('click', () => {
            showSection(button.dataset.section);
        });
    });

    // 7. Estado inicial da aplicação ao carregar a página
    if (currentAttendant) {
        atendenteSelect.value = currentAttendant;
        handleAttendantChange(); // Carrega os dados do atendente salvo
    } else {
        atendenteText.textContent = 'Atendente';
    }
    
    showSection('chat'); // Define a seção de chat como inicial
    updateGreeting();
    setInterval(updateGreeting, 60000); // Atualiza a saudação a cada minuto
});