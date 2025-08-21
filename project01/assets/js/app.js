import { initializeFirebase, loadDataForAttendant } from './firebase.js';
import { initializeChat } from './chat.js';
import { initializeConversor } from './conversor.js';
import { initializeTheme } from './theme.js';
import { initializeUI, showPopup, updateGreeting } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Módulos
    initializeFirebase();
    initializeUI();
    const chatModule = initializeChat();
    initializeConversor();
    initializeTheme();
    
    // 2. Estado da Aplicação
    let currentAttendant = localStorage.getItem('atendenteAtual') || '';

    // 3. Seletores de Elementos Globais
    const atendenteSelect = document.getElementById('atendente');
    const atendentePopup = document.getElementById('atendentePopup');
    const atendenteToggleBtn = document.getElementById('atendenteToggleBtn');
    const atendenteConfirmBtn = document.getElementById('selecionarAtendenteBtn');
    const sections = document.querySelectorAll('.active-section');
    const sidebarButtons = document.querySelectorAll('.sidebar-button');

    // 4. Funções de Lógica Principal
    const updateAttendantDisplay = () => {
        const textSpan = atendenteToggleBtn.querySelector('.text');
        if (currentAttendant) {
            textSpan.textContent = currentAttendant.charAt(0).toUpperCase() + currentAttendant.slice(1);
            atendenteSelect.value = currentAttendant;
        } else {
            textSpan.textContent = 'Atendente';
        }
    };
    
    const handleAttendantSelection = async () => {
        const selectedValue = atendenteSelect.value;
        if (!selectedValue) {
            showPopup('Por favor, selecione um atendente.');
            return;
        }
        
        currentAttendant = selectedValue.toLowerCase();
        localStorage.setItem('atendenteAtual', currentAttendant);
        
        updateAttendantDisplay();
        atendentePopup.style.display = 'none';
        showPopup(`Atendente ${currentAttendant} selecionado!`);

        // Carregar dados e atualizar a interface do chat
        const data = await loadDataForAttendant(currentAttendant);
        if (data) {
            chatModule.setResponses(data);
            chatModule.updateResponseSelector();
        } else {
            chatModule.setResponses({ suporte: {}, financeiro: {}, geral: {} });
            chatModule.updateResponseSelector();
        }
    };
    
    const switchSection = (sectionName) => {
        sections.forEach(sec => {
            sec.style.display = sec.id === `${sectionName}Section` ? 'block' : 'none';
        });
        sidebarButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionName);
        });
        // Garante que a saudação seja atualizada na seção visível
        updateGreeting();
    };

    // 5. Configuração de Eventos
    atendenteToggleBtn.addEventListener('click', () => {
        atendentePopup.style.display = 'block';
    });
    
    atendenteConfirmBtn.addEventListener('click', handleAttendantSelection);

    sidebarButtons.forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });

    // 6. Inicialização ao Carregar a Página
    if (currentAttendant) {
        updateAttendantDisplay();
        handleAttendantSelection(); // Carrega os dados do atendente já salvo
    }
    
    switchSection('chat'); // Define a seção inicial
});