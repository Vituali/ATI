import { initializeUI, showSection, updateGreeting } from './ui.js';
import { initializeFirebase, loadDataForAttendant } from './firebase.js';
import { initializeTheme } from './theme.js';
import { initializeChat } from './chat.js';
import { initializeConversor } from './conversor.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa módulos que não dependem de dados
    initializeUI();
    initializeTheme();
    const chatModule = initializeChat();
    initializeConversor();
    
    // Conecta ao Firebase
    await initializeFirebase();

    // Estado da Aplicação
    let currentAttendant = localStorage.getItem("atendenteAtual") || "";

    // Seletores de Elementos Globais
    const atendentePopup = document.getElementById('atendentePopup');
    const atendenteToggleBtn = document.getElementById('atendenteToggleBtn');
    const confirmAtendenteBtn = document.getElementById('confirmAtendenteBtn');
    const atendenteSelect = document.getElementById('atendente');
    const atendenteText = atendenteToggleBtn.querySelector('.text');
    const chatLoader = document.getElementById('chatLoader');

    // Funções principais de controle
    const handleAttendantChange = async () => {
        const selected = atendenteSelect.value;
        if (!selected) return;
        
        currentAttendant = selected;
        localStorage.setItem("atendenteAtual", currentAttendant);
        atendenteText.textContent = currentAttendant.charAt(0).toUpperCase() + currentAttendant.slice(1);
        
        chatLoader.style.display = 'flex'; // MOSTRA o loader do card
        try {
            const data = await loadDataForAttendant(currentAttendant);
            chatModule.setResponses(data); // Passa os dados para o módulo de chat
        } catch (error) {
            console.error("Erro ao carregar dados do atendente:", error);
            showPopup("Falha ao carregar dados do chat.");
        } finally {
            chatLoader.style.display = 'none'; // ESCONDE o loader do card
        }
        
        atendentePopup.style.display = 'none';
    };

    // Configura os eventos principais
    atendenteToggleBtn.addEventListener('click', () => {
        atendentePopup.style.display = 'block';
    });
    confirmAtendenteBtn.addEventListener('click', handleAttendantChange);
    document.querySelectorAll('.sidebar-button[data-section]').forEach(button => {
        button.addEventListener('click', () => {
            showSection(button.dataset.section);
        });
    });

    // Estado Inicial ao Carregar
    if (currentAttendant) {
        atendenteSelect.value = currentAttendant;
        handleAttendantChange(); // Carrega os dados do atendente salvo
    } else {
        atendenteText.textContent = 'Atendente';
    }
    
    updateGreeting();
    setInterval(updateGreeting, 60000);
});