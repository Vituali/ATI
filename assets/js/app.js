import { initializeUI, showSection, updateGreeting } from './ui.js';
import { initializeFirebase, loadDataForAttendant } from './firebase.js';
import { initializeTheme } from './theme.js';
import { initializeChat } from './chat.js';
import { initializeConversor } from './conversor.js';

// Executa quando o HTML estiver totalmente carregado
document.addEventListener('DOMContentLoaded', async () => {
    // Pega o loader no início
    const loader = document.getElementById('loader-overlay');
    
    // Mostra o loader
    loader.style.display = 'flex';

    try {
        // Inicializa módulos básicos
        initializeUI();
        initializeTheme();
        await initializeFirebase(); // Espera o Firebase conectar

        // Inicializa as seções
        const chatModule = initializeChat();
        initializeConversor();

    // Gerencia o estado global da aplicação (Atendente)
    let currentAttendant = localStorage.getItem("atendenteAtual") || "";

    // Seleciona os elementos globais da página
    const atendentePopup = document.getElementById('atendentePopup');
    const atendenteToggleBtn = document.getElementById('atendenteToggleBtn');
    const confirmAtendenteBtn = document.getElementById('confirmAtendenteBtn');
    const atendenteSelect = document.getElementById('atendente');
    const atendenteText = atendenteToggleBtn.querySelector('.text');

    // Funções principais de controle
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

    // Configura os eventos principais
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

        // Estado Inicial ao Carregar
        if (currentAttendant) {
            atendenteSelect.value = currentAttendant;
            await handleAttendantChange(); // Usa await para esperar o carregamento
        }
        
        // ...
    } finally {
        // Esconde o loader, mesmo que dê erro
        loader.style.display = 'none';
    }
});