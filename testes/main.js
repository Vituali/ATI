document.addEventListener("DOMContentLoaded", function() {
    // Verificar o tema salvo no localStorage
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    document.body.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("light-mode", !isDarkMode);
    const toggleButton = document.getElementById("darkModeToggle");
    toggleButton.textContent = isDarkMode ? "🌞" : "🌙";

    // Função para alternar entre modo claro e escuro
    toggleButton.addEventListener("click", function() {
        const isDarkMode = document.body.classList.contains("dark-mode");
        document.body.classList.toggle("dark-mode", !isDarkMode);
        document.body.classList.toggle("light-mode", isDarkMode);
        localStorage.setItem("darkMode", !isDarkMode);
        toggleButton.textContent = isDarkMode ? "🌙" : "🌞";
    });

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