document.addEventListener("DOMContentLoaded", function() {
    // Show popup notification
    window.showPopup = function(message) {
        console.log("showPopup called with message:", message); // Debug log
        const popup = document.getElementById("popup");
        if (popup) {
            popup.innerText = message;
            popup.classList.add("show");
            setTimeout(() => {
                popup.classList.remove("show");
            }, 1500);
        } else {
            console.error("❌ Elemento 'popup' não encontrado");
        }
    };

    // Adjust textarea height
    window.ajustarAlturaTextarea = function() {
        const textarea = document.getElementById("resposta");
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    // Replace placeholders
    window.substituirMarcadores = function(texto) {
        const now = new Date();
        const hour = now.getHours();
        let saudacao, despedida;
        if (hour >= 5 && hour < 12) {
            saudacao = "Bom dia";
            despedida = "Tenha uma excelente manhã";
        } else if (hour >= 12 && hour < 18) {
            saudacao = "Boa tarde";
            despedida = "Tenha uma excelente tarde";
        } else {
            saudacao = "Boa noite";
            despedida = "Tenha uma excelente noite";
        }
        return texto.replace(/\[saudacao\]/gi, saudacao).replace(/\[despedida\]/gi, despedida);
    };

    // Update greeting based on time
    window.atualizarSaudacao = function() {
        const saudacaoElements = document.querySelectorAll("#saudacao");
        saudacaoElements.forEach(element => {
            element.textContent = window.substituirMarcadores("[saudacao]");
        });
    };

    // Toggle sidebar
    window.toggleSidebar = function() {
        console.log("toggleSidebar called"); // Debug log
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            sidebar.classList.toggle("expanded");
            console.log("✅ Sidebar toggled:", sidebar.classList.contains("expanded") ? "expanded" : "collapsed");
        } else {
            console.error("❌ Elemento 'sidebar' não encontrado");
            window.showPopup("Erro: Sidebar não encontrada.");
        }
    };

    // Initialize greeting
    window.atualizarSaudacao();
    setInterval(window.atualizarSaudacao, 60000); // Update every minute
});