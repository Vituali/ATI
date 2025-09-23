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
 * Aplica as configurações de tema na própria página do painel.
 * @param {object} settings - O objeto com as configurações de tema.
 */
function applyLocalTheme(settings) {
    if (settings.isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    const root = document.documentElement;
    root.style.setProperty('--icon-color', settings.iconColor);
    root.style.setProperty('--border-color', settings.borderColor);
    root.style.setProperty('--heading-color', settings.textColor);

    // No seu CSS, a classe `neon-borders` não existe, o efeito é aplicado por padrão e
    // removido com `no-neon`. A lógica abaixo está correta.
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
    // O nome da chave no seu `theme.js` antigo era 'ati-theme-settings', vamos usar esse.
    const savedSettings = JSON.parse(localStorage.getItem('ati-theme-settings'));
    
    const defaultSettings = {
        isDarkMode: true,
        neonBorders: true,
        iconColor: '#0AEEF5', // Cor padrão do seu tema antigo
        borderColor: '#0AEEF5', // Cor padrão do seu tema antigo
        textColor: '#E5E5E5',
        chatPrimaryAlpha: 0.37 // Valor padrão para a nova funcionalidade
    };

    const settings = { ...defaultSettings, ...savedSettings };

    // Aplica as configurações aos inputs do popup
    themeToggle.checked = settings.isDarkMode;
    neonBordersToggle.checked = settings.neonBorders;
    iconColorPicker.value = settings.iconColor;
    borderColorPicker.value = settings.borderColor;
    textColorPicker.value = settings.textColor;
    alphaSlider.value = settings.chatPrimaryAlpha;
    alphaValueSpan.textContent = settings.chatPrimaryAlpha;

    // Aplica o tema na própria página do painel
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
        chatPrimaryAlpha: parseFloat(alphaSlider.value) // Garante que seja um número
    };

    localStorage.setItem('ati-theme-settings', JSON.stringify(settings));
    
    // Aplica o tema na página atual
    applyLocalTheme(settings);

    // Envia as configurações para a extensão (que irá aplicá-las no Chatmix)
    window.postMessage({
        type: 'ATI_THEME_UPDATE',
        themeSettings: settings
    }, "*");

    // Fornece um feedback visual simples
    const originalText = saveCustomizationBtn.textContent;
    saveCustomizationBtn.textContent = 'Salvo!';
    setTimeout(() => {
        saveCustomizationBtn.textContent = originalText;
        customizationPopup.style.display = 'none';
    }, 1000);
}

/**
 * Função principal exportada que inicializa todos os event listeners do tema.
 */
export function initializeTheme() {
    // Listeners para os controles de personalização
    alphaSlider.addEventListener('input', () => {
        alphaValueSpan.textContent = alphaSlider.value;
    });
    saveCustomizationBtn.addEventListener('click', saveCustomizationSettings);
    darkModeToggleBtn.addEventListener('click', () => {
        customizationPopup.style.display = 'block';
    });
    closeCustomizationBtn.addEventListener('click', () => {
        customizationPopup.style.display = 'none';
        loadCustomizationSettings(); // Recarrega para descartar alterações não salvas
    });

    // Carrega as configurações iniciais ao carregar a página
    loadCustomizationSettings();
}

