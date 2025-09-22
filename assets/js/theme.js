import { showPopup } from './ui.js';

// Funções auxiliares de cor
function lightenColor(hex, percent) {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const increase = percent / 100;
    return `#${Math.min(255, Math.round(r + (255 - r) * increase)).toString(16).padStart(2, "0")}${Math.min(255, Math.round(g + (255 - g) * increase)).toString(16).padStart(2, "0")}${Math.min(255, Math.round(b + (255 - b) * increase)).toString(16).padStart(2, "0")}`;
}
function hexToRgba(hex, alpha) {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function getLuminance(hex) {
    if (!hex || hex.length < 4) return 0;
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

// --- Função Principal de Inicialização do Tema ---
export function initializeTheme() {
    // Esta função é chamada pelo app.js DENTRO do 'DOMContentLoaded',
    // então os elementos já devem existir.
    const elements = {
        popup: document.getElementById('customizationPopup'),
        openBtn: document.getElementById('darkModeToggleBtn'),
        saveBtn: document.getElementById('saveCustomizationBtn'),
        closeBtn: document.getElementById('closeCustomizationBtn'),
        themeToggle: document.getElementById('themeToggle'),
        neonBorders: document.getElementById('neonBorders'),
        iconColor: document.getElementById('iconColor'),
        borderColor: document.getElementById('borderColor'),
        textColor: document.getElementById('textColor'),
        styleTag: document.getElementById('custom-styles') || document.createElement('style')
    };
    
    // Verificação de segurança: se os elementos não existem, aborta.
    if (!elements.popup || !elements.openBtn || !elements.saveBtn || !elements.closeBtn) {
        console.error("Elementos de personalização do tema não encontrados. Verifique o HTML.");
        return; 
    }
    
    if (!document.getElementById('custom-styles')) {
        elements.styleTag.id = 'custom-styles';
        document.head.appendChild(elements.styleTag);
    }

    let originalSettings = {};

    const applyCustomizations = (settings) => {
        document.body.classList.toggle('dark-mode', settings.isDarkMode);
        document.body.classList.toggle('no-neon', !settings.neonBorders);

        const contrastColorForIcons = getLuminance(settings.iconColor) > 0.5 ? '#000000' : '#FFFFFF';
        const contrastColorForButtons = getLuminance(settings.borderColor) > 0.5 ? '#111111' : '#FFFFFF';
        
        elements.styleTag.textContent = `
            :root {
                --icon-color: ${settings.iconColor};
                --border-color: ${settings.borderColor};
                --button-bg: ${settings.borderColor};
                --heading-color: ${settings.textColor};
                --button-text: ${contrastColorForButtons};
                --button-hover-bg: ${lightenColor(settings.borderColor, 20)};
                --shadow-color: ${hexToRgba(settings.borderColor, 0.5)};
            }
            .sidebar-button.active {
                background-color: ${settings.iconColor} !important;
                color: ${contrastColorForIcons} !important;
            }
        `;
    };

    const loadSettings = () => {
        const isDarkMode = localStorage.getItem('darkMode') !== 'false'; // Padrão é true
        const defaultColors = {
            iconColor: isDarkMode ? '#0AEEF5' : '#D12E66',
            borderColor: isDarkMode ? '#0AEEF5' : '#D12E66',
            textColor: isDarkMode ? '#E5E5E5' : '#1A3C5A',
        };
        return {
            isDarkMode: isDarkMode,
            neonBorders: localStorage.getItem('neonBorders') !== 'false',
            iconColor: localStorage.getItem('iconColor') || defaultColors.iconColor,
            borderColor: localStorage.getItem('borderColor') || defaultColors.borderColor,
            textColor: localStorage.getItem('textColor') || defaultColors.textColor,
        };
    };

    const saveSettings = (settings) => {
        localStorage.setItem('darkMode', settings.isDarkMode);
        localStorage.setItem('neonBorders', settings.neonBorders);
        localStorage.setItem('iconColor', settings.iconColor);
        localStorage.setItem('borderColor', settings.borderColor);
        localStorage.setItem('textColor', settings.textColor);
    };

    const updatePopupUI = (settings) => {
        elements.themeToggle.checked = settings.isDarkMode;
        elements.neonBorders.checked = settings.neonBorders;
        elements.iconColor.value = settings.iconColor;
        elements.borderColor.value = settings.borderColor;
        elements.textColor.value = settings.textColor;
    };

    elements.openBtn.addEventListener('click', () => {
        originalSettings = loadSettings();
        updatePopupUI(originalSettings);
        elements.popup.style.display = 'block';
    });

    elements.closeBtn.addEventListener('click', () => {
        elements.popup.style.display = 'none';
        applyCustomizations(originalSettings); // Reverte para as configurações originais
    });

    elements.saveBtn.addEventListener('click', () => {
        const newSettings = {
            isDarkMode: elements.themeToggle.checked,
            neonBorders: elements.neonBorders.checked,
            iconColor: elements.iconColor.value,
            borderColor: elements.borderColor.value,
            textColor: elements.textColor.value,
        };
        saveSettings(newSettings);
        applyCustomizations(newSettings);
        elements.popup.style.display = 'none';
        showPopup('Personalização salva!');
    });
    
    // Aplica preview das cores em tempo real
    ['input', 'change'].forEach(eventType => {
        elements.popup.addEventListener(eventType, () => {
            const previewSettings = {
                isDarkMode: elements.themeToggle.checked,
                neonBorders: elements.neonBorders.checked,
                iconColor: elements.iconColor.value,
                borderColor: elements.borderColor.value,
                textColor: elements.textColor.value,
            };
            applyCustomizations(previewSettings);
        });
    });

    // Aplica o tema inicial ao carregar a página
    const initialSettings = loadSettings();
    applyCustomizations(initialSettings);
}

