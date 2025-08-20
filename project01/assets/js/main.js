document.addEventListener("DOMContentLoaded", function() {
    // Initialize sidebar state
    const sidebar = document.getElementById("sidebar");
    const isSidebarExpanded = localStorage.getItem("sidebarExpanded") === "true";
    if (isSidebarExpanded) {
        sidebar.classList.add("expanded");
    }

    // Toggle sidebar
    const toggleSidebar = document.getElementById("toggleSidebar");
    toggleSidebar.addEventListener("click", function() {
        sidebar.classList.toggle("expanded");
        localStorage.setItem("sidebarExpanded", sidebar.classList.contains("expanded"));
    });

    // Shared utility: Show popup message
    window.showPopup = function(message) {
        const popup = document.getElementById("popup");
        if (popup) {
            popup.innerText = message;
            popup.classList.add("show");
            setTimeout(() => {
                popup.classList.remove("show");
            }, 1500);
        }
    };

    // Shared utility: Adjust textarea height
    window.ajustarAlturaTextarea = function() {
        const textarea = document.getElementById("resposta");
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    // Shared utility: Replace placeholders
    window.substituirMarcadores = function(texto) {
        const hora = new Date().getHours();
        const saudacao = hora >= 5 && hora < 12 ? "bom dia" :
                         hora >= 12 && hora < 18 ? "boa tarde" : 
                         "boa noite";
        const despedida = hora >= 5 && hora < 12 ? "tenha uma excelente manhã" :
                         hora >= 12 && hora < 18 ? "tenha uma excelente tarde" : 
                         "tenha uma excelente noite";
        return texto.replace(/\[saudacao\]/gi, saudacao).replace(/\[despedida\]/gi, despedida);
    };

    // Shared utility: Update greeting
    window.atualizarSaudacao = function() {
        const saudacaoElements = document.querySelectorAll("#saudacao");
        const saudacaoSpan = document.getElementById("saudacaoSpan");
        const despedidaSpan = document.getElementById("despedidaSpan");
        const hora = new Date().getHours();
        const saudacaoText = hora >= 5 && hora < 12 ? "bom dia" :
                             hora >= 12 && hora < 18 ? "boa tarde" : 
                             "boa noite";
        const despedidaText = hora >= 5 && hora < 12 ? "tenha uma excelente manhã" :
                              hora >= 12 && hora < 18 ? "tenha uma excelente tarde" : 
                              "tenha uma excelente noite";
        saudacaoElements.forEach(element => {
            element.textContent = saudacaoText;
        });
        if (saudacaoSpan) {
            saudacaoSpan.textContent = saudacaoText;
        }
        if (despedidaSpan) {
            despedidaSpan.textContent = despedidaText;
        }
    };

    // Initialize greeting update
    window.atualizarSaudacao();
    setInterval(window.atualizarSaudacao, 600000);
});