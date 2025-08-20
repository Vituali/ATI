document.addEventListener("DOMContentLoaded", function() {
    // Verificar o tema salvo no localStorage
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    document.body.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("light-mode", !isDarkMode);
    const toggleButton = document.getElementById("darkModeToggle");
    toggleButton.textContent = isDarkMode ? "🌞" : "🌙";
    document.getElementById("themeToggle").checked = isDarkMode;

    // Verificar personalizações salvas
    const iconColor = localStorage.getItem("iconColor") || (isDarkMode ? "#464646" : "#002640");
    const borderColor = localStorage.getItem("borderColor") || (isDarkMode ? "#464646" : "#002640");
    const neonBorders = localStorage.getItem("neonBorders") !== "false";
    document.getElementById("iconColor").value = iconColor;
    document.getElementById("borderColor").value = borderColor;
    document.getElementById("neonBorders").checked = neonBorders;
    applyCustomizations(iconColor, borderColor, neonBorders);

    // Função para abrir o popup de personalização
    toggleButton.addEventListener("click", function() {
        document.getElementById("customizationPopup").style.display = "block";
    });

    // Função para fechar o popup de personalização
    window.closeCustomizationPopup = function() {
        document.getElementById("customizationPopup").style.display = "none";
    };

    // Função para salvar personalizações
    window.saveCustomization = function() {
        const iconColor = document.getElementById("iconColor").value;
        const borderColor = document.getElementById("borderColor").value;
        const neonBorders = document.getElementById("neonBorders").checked;
        const isDarkMode = document.getElementById("themeToggle").checked;

        localStorage.setItem("iconColor", iconColor);
        localStorage.setItem("borderColor", borderColor);
        localStorage.setItem("neonBorders", neonBorders);
        localStorage.setItem("darkMode", isDarkMode);

        document.body.classList.toggle("dark-mode", isDarkMode);
        document.body.classList.toggle("light-mode", !isDarkMode);
        toggleButton.textContent = isDarkMode ? "🌞" : "🌙";

        applyCustomizations(iconColor, borderColor, neonBorders);
        document.getElementById("customizationPopup").style.display = "none";
    };

    // Função para aplicar personalizações
    function applyCustomizations(iconColor, borderColor, neonBorders) {
        document.body.classList.toggle("no-neon", !neonBorders);

        // Aplicar cor dos ícones
        const style = document.createElement("style");
        style.id = "custom-styles";
        style.textContent = `
            .sidebar-button, .toggle-sidebar, .dark-mode-toggle {
                color: ${iconColor} !important;
            }
            .dark-mode .sidebar-button, .dark-mode .toggle-sidebar, .dark-mode .dark-mode-toggle {
                color: ${iconColor} !important;
            }
            .sidebar-button:hover {
                color: ${lightenColor(iconColor, 20)} !important;
            }
            .dark-mode .sidebar-button:hover {
                color: ${lightenColor(iconColor, 20)} !important;
            }
            .sidebar-button.active {
                background: ${iconColor} !important;
            }
            .dark-mode .sidebar-button.active {
                background: ${iconColor} !important;
            }
            .sidebar {
                border-right: 1px solid ${borderColor} !important;
            }
            .dark-mode .sidebar {
                border-right: 1px solid ${borderColor} !important;
            }
            .card, .upload-card, .popup, .customization-popup, .output {
                border: 1px solid ${borderColor} !important;
            }
            .dark-mode .card, .dark-mode .upload-card, .dark-mode .popup, .dark-mode .customization-popup, .dark-mode .output {
                border: 1px solid ${borderColor} !important;
            }
            input, select, textarea {
                border: 1px solid ${borderColor} !important;
            }
            .dark-mode input, .dark-mode select, .dark-mode textarea {
                border: 1px solid ${borderColor} !important;
            }
            .button, .copy-btn, .file-label {
                background: ${borderColor} !important;
                box-shadow: ${neonBorders ? `0 0 10px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .dark-mode .button, .dark-mode .copy-btn, .dark-mode .file-label {
                background: ${borderColor} !important;
                box-shadow: ${neonBorders ? `0 0 10px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .button:hover, .copy-btn:hover, .file-label:hover {
                background: ${lightenColor(borderColor, 20)} !important;
                box-shadow: ${neonBorders ? `0 0 15px ${hexToRgba(borderColor, 0.7)}` : "none"} !important;
            }
            .dark-mode .button:hover, .dark-mode .copy-btn:hover, .dark-mode .file-label:hover {
                background: ${lightenColor(borderColor, 20)} !important;
                box-shadow: ${neonBorders ? `0 0 15px ${hexToRgba(borderColor, 0.7)}` : "none"} !important;
            }
            .card, .upload-card {
                box-shadow: ${neonBorders ? `0 0 15px ${hexToRgba(borderColor, 0.3)}` : "none"} !important;
            }
            .dark-mode .card, .dark-mode .upload-card {
                box-shadow: ${neonBorders ? `0 0 15px ${hexToRgba(borderColor, 0.3)}` : "none"} !important;
            }
            input:focus, select:focus, textarea:focus {
                box-shadow: ${neonBorders ? `0 0 10px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .dark-mode input:focus, .dark-mode select:focus, .dark-mode textarea:focus {
                box-shadow: ${neonBorders ? `0 0 10px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .customization-popup, .popup {
                box-shadow: ${neonBorders ? `0 0 15px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .dark-mode .customization-popup, .dark-mode .popup {
                box-shadow: ${neonBorders ? `0 0 15px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            h1, h2, h3 {
                color: ${iconColor} !important;
            }
            .dark-mode h1, .dark-mode h2, .dark-mode h3 {
                color: ${iconColor} !important;
            }
        `;
        const existingStyle = document.getElementById("custom-styles");
        if (existingStyle) existingStyle.remove();
        document.head.appendChild(style);
    }

    // Função para clarear uma cor em porcentagem
    function lightenColor(hex, percent) {
        hex = hex.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const increase = percent / 100;
        return `#${Math.min(255, Math.round(r + (255 - r) * increase)).toString(16).padStart(2, "0")}${Math.min(255, Math.round(g + (255 - g) * increase)).toString(16).padStart(2, "0")}${Math.min(255, Math.round(b + (255 - b) * increase)).toString(16).padStart(2, "0")}`;
    }

    // Função para converter hex para rgba
    function hexToRgba(hex, alpha) {
        hex = hex.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Verificar o estado da barra lateral no localStorage
    const sidebar = document.getElementById("sidebar");
    const isSidebarExpanded = localStorage.getItem("sidebarExpanded") === "true";
    if (isSidebarExpanded) {
        sidebar.classList.add("expanded");
    }

    // Função para alternar a barra lateral
    const toggleSidebar = document.getElementById("toggleSidebar");
    toggleSidebar.addEventListener("click", function() {
        sidebar.classList.toggle("expanded");
        localStorage.setItem("sidebarExpanded", sidebar.classList.contains("expanded"));
    });

    // Função para mostrar a seção selecionada
    window.showSection = function(section) {
        document.getElementById("chatSection").style.display = section === "chat" ? "block" : "none";
        document.getElementById("conversorSection").style.display = section === "conversor" ? "block" : "none";

        // Atualizar classe active nos botões da barra lateral
        const buttons = document.querySelectorAll(".sidebar-button");
        buttons.forEach(button => {
            button.classList.toggle("active", button.getAttribute("onclick") === `showSection('${section}')`);
        });
    };

    // Mostrar a seção de chat por padrão
    window.showSection("chat");
});