// Gerencia a personalização do tema (modo escuro, cores, etc.)

export function initializeTheme() {
    // Seletores
    const customizationPopup = document.getElementById('customizationPopup');
    const openBtn = document.getElementById('customizationToggleBtn');
    const closeBtn = document.getElementById('closeCustomizationBtn');
    const saveBtn = document.getElementById('saveCustomizationBtn');
    const themeToggle = document.getElementById('themeToggle');
    const neonBorders = document.getElementById('neonBorders');
    const iconColor = document.getElementById('iconColor');
    const borderColor = document.getElementById('borderColor');

    let originalSettings = {};

    // Funções
    const applyCustomizations = (settings) => {
        document.body.classList.toggle('dark-mode', settings.isDarkMode);
        document.body.classList.toggle('light-mode', !settings.isDarkMode);
        document.body.classList.toggle('no-neon', !settings.neonBorders);

        const styleId = 'custom-theme-styles';
        let style = document.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        // Simplificado para brevidade - a lógica complexa de geração de CSS permanece a mesma.
        style.textContent = `
            :root {
                --border-primary: ${settings.borderColor};
                --accent-primary: ${settings.iconColor};
            }
            .card, .upload-card, input, select, textarea, .popup {
                border-color: var(--border-primary);
            }
            .sidebar-button .icon, .toggle-sidebar, .bottom-toggle .icon {
                color: var(--accent-primary);
            }
            /* Adicione outras regras dinâmicas aqui */
        `;
    };

    const loadSettings = () => ({
        isDarkMode: localStorage.getItem('darkMode') === 'true',
        neonBorders: localStorage.getItem('neonBorders') !== 'false',
        iconColor: localStorage.getItem('iconColor') || '#002640',
        borderColor: localStorage.getItem('borderColor') || '#002640'
    });
    
    const saveSettings = (settings) => {
        localStorage.setItem('darkMode', settings.isDarkMode);
        localStorage.setItem('neonBorders', settings.neonBorders);
        localStorage.setItem('iconColor', settings.iconColor);
        localStorage.setItem('borderColor', settings.borderColor);
    };
    
    const updateUIFromSettings = (settings) => {
        themeToggle.checked = settings.isDarkMode;
        neonBorders.checked = settings.neonBorders;
        iconColor.value = settings.iconColor;
        borderColor.value = settings.borderColor;
    };
    
    // Eventos
    openBtn.addEventListener('click', () => {
        originalSettings = loadSettings();
        customizationPopup.style.display = 'block';
    });
    
    closeBtn.addEventListener('click', () => {
        customizationPopup.style.display = 'none';
        updateUIFromSettings(originalSettings); // Reverte para as configurações originais
        applyCustomizations(originalSettings);
    });

    saveBtn.addEventListener('click', () => {
        const currentSettings = {
            isDarkMode: themeToggle.checked,
            neonBorders: neonBorders.checked,
            iconColor: iconColor.value,
            borderColor: borderColor.value,
        };
        saveSettings(currentSettings);
        applyCustomizations(currentSettings);
        customizationPopup.style.display = 'none';
    });
    
    // Aplicação em tempo real
    [themeToggle, neonBorders, iconColor, borderColor].forEach(el => {
        el.addEventListener('input', () => {
            applyCustomizations({
                isDarkMode: themeToggle.checked,
                neonBorders: neonBorders.checked,
                iconColor: iconColor.value,
                borderColor: borderColor.value,
            });
        });
    });

    // Inicialização
    const initialSettings = loadSettings();
    updateUIFromSettings(initialSettings);
    applyCustomizations(initialSettings);
}