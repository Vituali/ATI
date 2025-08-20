document.addEventListener("DOMContentLoaded", function() {
    const toggleButton = document.getElementById("darkModeToggle");
    let originalCustomization = {};

    // Initialize theme and customizations
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    document.body.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("light-mode", !isDarkMode);
    toggleButton.innerHTML = isDarkMode ? '<span class="icon">🌞</span><span class="text">Modo Claro</span>' : '<span class="icon">🌙</span><span class="text">Modo Escuro</span>';
    document.getElementById("themeToggle").checked = isDarkMode;

    const iconColor = localStorage.getItem("iconColor") || (isDarkMode ? "#464646" : "#002640");
    const borderColor = localStorage.getItem("borderColor") || (isDarkMode ? "#464646" : "#002640");
    const neonBorders = localStorage.getItem("neonBorders") !== "false";
    document.getElementById("iconColor").value = iconColor;
    document.getElementById("borderColor").value = borderColor;
    document.getElementById("neonBorders").checked = neonBorders;
    applyCustomizations();

    // Explicitly attach to window for onclick
    window.openCustomizationPopup = function() {
        originalCustomization = {
            theme: localStorage.getItem("darkMode") === "true" ? "dark" : "light",
            neonBorders: localStorage.getItem("neonBorders") === "true",
            iconColor: localStorage.getItem("iconColor") || "#002640",
            borderColor: localStorage.getItem("borderColor") || "#002640"
        };
        const popup = document.getElementById("customizationPopup");
        if (popup) {
            popup.style.display = "block";
        } else {
            console.error("❌ Elemento 'customizationPopup' não encontrado");
            window.showPopup("Erro: Popup de personalização não encontrado.");
        }

        const themeToggle = document.getElementById("themeToggle");
        const neonBorders = document.getElementById("neonBorders");
        const iconColor = document.getElementById("iconColor");
        const borderColor = document.getElementById("borderColor");

        themeToggle.checked = originalCustomization.theme === "dark";
        neonBorders.checked = originalCustomization.neonBorders;
        iconColor.value = originalCustomization.iconColor;
        borderColor.value = originalCustomization.borderColor;

        // Remove old event listeners
        themeToggle.removeEventListener("change", applyInRealTime);
        neonBorders.removeEventListener("change", applyInRealTime);
        iconColor.removeEventListener("input", applyInRealTime);
        borderColor.removeEventListener("input", applyInRealTime);

        // Add event listeners for real-time application
        themeToggle.addEventListener("change", applyInRealTime);
        neonBorders.addEventListener("change", applyInRealTime);
        iconColor.addEventListener("input", applyInRealTime);
        borderColor.addEventListener("input", applyInRealTime);

        function applyInRealTime() {
            applyCustomizations();
        }
    };

    // Close customization popup
    window.closeCustomizationPopup = function() {
        const popup = document.getElementById("customizationPopup");
        if (popup) {
            popup.style.display = "none";
        }
        applyCustomizations(
            originalCustomization.theme === "dark",
            originalCustomization.neonBorders,
            originalCustomization.iconColor,
            originalCustomization.borderColor
        );
    };

    // Save customizations
    window.saveCustomization = function() {
        const themeToggle = document.getElementById("themeToggle");
        const neonBorders = document.getElementById("neonBorders");
        const iconColor = document.getElementById("iconColor");
        const borderColor = document.getElementById("borderColor");

        localStorage.setItem("darkMode", themeToggle.checked);
        localStorage.setItem("neonBorders", neonBorders.checked);
        localStorage.setItem("iconColor", iconColor.value);
        localStorage.setItem("borderColor", borderColor.value);

        applyCustomizations();
        window.closeCustomizationPopup();
        window.showPopup("Personalização salva com sucesso!");
    };

    // Apply customizations
    function applyCustomizations(isDarkMode = document.getElementById("themeToggle").checked,
                                neonBorders = document.getElementById("neonBorders").checked,
                                iconColor = document.getElementById("iconColor").value,
                                borderColor = document.getElementById("borderColor").value) {
        document.body.classList.remove("light-mode", "dark-mode", "no-neon");
        document.body.classList.add(isDarkMode ? "dark-mode" : "light-mode");
        if (!neonBorders) {
            document.body.classList.add("no-neon");
        }

        const isLight = getLuminance(iconColor) > 0.5;
        const outlineColor = isLight ? "#000000" : "#FFFFFF";
        const contrastColor = outlineColor;
        const sidebarBorderColor = lightenColor(borderColor, 20);

        const style = document.createElement("style");
        style.id = "custom-styles";
        style.textContent = `
            .sidebar-button, .toggle-sidebar, .bottom-toggle {
                color: ${iconColor} !important;
            }
            .dark-mode .sidebar-button, .dark-mode .toggle-sidebar, .dark-mode .bottom-toggle {
                color: ${iconColor} !important;
            }
            .sidebar-button:hover, .bottom-toggle:hover {
                color: ${lightenColor(iconColor, 20)} !important;
            }
            .dark-mode .sidebar-button:hover, .dark-mode .bottom-toggle:hover {
                color: ${lightenColor(iconColor, 20)} !important;
            }
            .sidebar-button.active {
                background: ${iconColor} !important;
                color: ${contrastColor} !important;
            }
            .dark-mode .sidebar-button.active {
                background: ${iconColor} !important;
                color: ${contrastColor} !important;
            }
            .sidebar {
                border-right: 1px solid ${sidebarBorderColor} !important;
            }
            .dark-mode .sidebar {
                border-right: 1px solid ${sidebarBorderColor} !important;
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
            .customization-popup, .popup, #atendentePopup {
                box-shadow: ${neonBorders ? `0 0 15px ${hexToRgba(borderColor, 0.5)}` : "none"} !important;
            }
            .dark-mode .customization-popup, .dark-mode .popup, .dark-mode #atendentePopup {
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

    // Update theme
    window.updateTheme = function() {
        const isDarkMode = document.getElementById("themeToggle").checked;
        document.body.classList.toggle("dark-mode", isDarkMode);
        document.body.classList.toggle("light-mode", !isDarkMode);
        toggleButton.innerHTML = isDarkMode ? '<span class="icon">🌞</span><span class="text">Modo Claro</span>' : '<span class="icon">🌙</span><span class="text">Modo Escuro</span>';
        applyCustomizations();
    };

    // Utility: Lighten color
    function lightenColor(hex, percent) {
        hex = hex.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const increase = percent / 100;
        return `#${Math.min(255, Math.round(r + (255 - r) * increase)).toString(16).padStart(2, "0")}${Math.min(255, Math.round(g + (255 - g) * increase)).toString(16).padStart(2, "0")}${Math.min(255, Math.round(b + (255 - b) * increase)).toString(16).padStart(2, "0")}`;
    }

    // Utility: Convert hex to RGBA
    function hexToRgba(hex, alpha) {
        hex = hex.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Utility: Calculate luminance
    function getLuminance(hex) {
        hex = hex.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
});