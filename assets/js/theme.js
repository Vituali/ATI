/**
 * Este módulo gerencia o carregamento, a aplicação e o salvamento
 * das configurações de personalização da interface (tema, cores, etc.).
 */

// --- SELETORES DE ELEMENTOS ---
const alphaSlider = document.getElementById('alphaSlider');
const alphaValueSpan = document.getElementById('alphaValue');
const themeToggle = document.getElementById('themeToggle');
const neonBordersToggle = document.getElementById('neonBorders');
const iconColorPicker = document.getElementById('iconColor');
const borderColorPicker = document.getElementById('borderColor');
const textColorPicker = document.getElementById('textColor');
const saveCustomizationBtn = document.getElementById('saveCustomizationBtn');
const closeCustomizationBtn = document.getElementById('closeCustomizationBtn');
const customizationPopup = document.getElementById('customizationPopup');
const darkModeToggleBtn = document.getElementById('darkModeToggleBtn');

/**
 * Calcula a luminância de uma cor hexadecimal para determinar se o texto
 * sobre ela deve ser claro ou escuro.
 * @param {string} hex - A cor em formato hexadecimal (ex: "#RRGGBB").
 * @returns {number} - Um valor de luminância. Valores > 0.5 são considerados claros.
 */
function getLuminance(hex) {
    if (!hex) return 0;
    let color = hex.startsWith('#') ? hex.slice(1) : hex;
    if (color.length === 3) {
        color = color.split('').map(char => char + char).join('');
    }
    const r = parseInt(color.substring(0, 2), 16) / 255;
    const g = parseInt(color.substring(2, 4), 16) / 255;
    const b = parseInt(color.substring(4, 6), 16) / 255;
    const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Aplica as configurações de tema na própria página do painel.
 * @param {object} settings - O objeto com as configurações de tema.
 */
function applyLocalTheme(settings) {
    // ATUALIZADO: Controla a classe dark-mode diretamente no body
    if (settings.isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    const root = document.documentElement;
    const contrastColorForButtons = getLuminance(settings.borderColor) > 0.5 ? '#111111' : '#FFFFFF';

    root.style.setProperty('--icon-color', settings.iconColor);
    root.style.setProperty('--border-color', settings.borderColor);
    root.style.setProperty('--heading-color', settings.textColor);
    root.style.setProperty('--button-bg', settings.borderColor);
    root.style.setProperty('--button-text', contrastColorForButtons);
    root.style.setProperty('--shadow-color', `${settings.borderColor}80`);

    if (settings.neonBorders) {
        document.body.classList.remove('no-neon');
    } else {
        document.body.classList.add('no-neon');
    }
}

/**
 * Carrega as configurações de tema salvas no localStorage e atualiza a interface.
 */
function loadCustomizationSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('ati-theme-settings'));
    
    const defaultSettings = {
        isDarkMode: true,
        neonBorders: true,
        iconColor: '#0AEEF5',
        borderColor: '#0AEEF5',
        textColor: '#E5E5E5',
        chatPrimaryAlpha: 0.37
    };

    const settings = { ...defaultSettings, ...savedSettings };

    themeToggle.checked = settings.isDarkMode;
    neonBordersToggle.checked = settings.neonBorders;
    iconColorPicker.value = settings.iconColor;
    borderColorPicker.value = settings.borderColor;
    textColorPicker.value = settings.textColor;
    alphaSlider.value = settings.chatPrimaryAlpha;
    alphaValueSpan.textContent = settings.chatPrimaryAlpha;

    applyLocalTheme(settings);
}

/**
 * Salva as configurações atuais do popup de personalização e notifica a extensão.
 */
function saveCustomizationSettings() {
    const settings = {
        isDarkMode: themeToggle.checked,
        neonBorders: neonBordersToggle.checked,
        iconColor: iconColorPicker.value,
        borderColor: borderColorPicker.value,
        textColor: textColorPicker.value,
        chatPrimaryAlpha: parseFloat(alphaSlider.value)
    };

    localStorage.setItem('ati-theme-settings', JSON.stringify(settings));
    
    applyLocalTheme(settings);

    // Envia mensagem para a extensão para que ela aplique o tema no Chatmix
    if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage({ action: "themeUpdated" });
    }
    
    const originalText = saveCustomizationBtn.textContent;
    saveCustomizationBtn.textContent = '✔️ Salvo!';
    saveCustomizationBtn.style.background = 'var(--success-color, #22C55E)';
    setTimeout(() => {
        saveCustomizationBtn.textContent = originalText;
        saveCustomizationBtn.style.background = '';
        customizationPopup.style.display = 'none';
    }, 1200);
}

/**
 * Função principal exportada que inicializa todos os event listeners do tema.
 */
export function initializeTheme() {
    alphaSlider.addEventListener('input', () => {
        alphaValueSpan.textContent = alphaSlider.value;
    });
    saveCustomizationBtn.addEventListener('click', saveCustomizationSettings);
    darkModeToggleBtn.addEventListener('click', () => {
        customizationPopup.style.display = 'block';
    });
    closeCustomizationBtn.addEventListener('click', () => {
        customizationPopup.style.display = 'none';
        loadCustomizationSettings();
    });

    loadCustomizationSettings();
}
