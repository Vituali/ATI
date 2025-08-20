document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ main.js loaded");

    window.showSection = function(section) {
        console.log(`🔄 Switching to section: ${section}`);
        document.getElementById("chatSection").style.display = section === "chat" ? "block" : "none";
        document.getElementById("conversorSection").style.display = section === "conversor" ? "block" : "none";
        document.querySelectorAll(".sidebar-button").forEach(button => {
            button.classList.toggle("active", button.onclick.toString().includes(section));
        });
    };

    window.openAtendentePopup = function() {
        console.log("🖱️ Opening atendente popup");
        const popup = document.getElementById("atendentePopup");
        if (popup) {
            popup.style.display = "block";
        } else {
            console.error("❌ Element 'atendentePopup' not found");
            window.showPopup("Erro: Popup de atendente não encontrado.");
        }
    };

    window.closeAtendentePopup = function() {
        console.log("🔙 Closing atendente popup");
        const popup = document.getElementById("atendentePopup");
        if (popup) {
            popup.style.display = "none";
        } else {
            console.error("❌ Element 'atendentePopup' not found");
        }
    };

    window.showPopup = function(message) {
        console.log(`📢 Showing popup: ${message}`);
        const popup = document.getElementById("popup");
        if (popup) {
            popup.innerText = message;
            popup.classList.add("show");
            setTimeout(() => {
                popup.classList.remove("show");
            }, 1500);
        } else {
            console.error("❌ Element 'popup' not found");
        }
    };

    const toggleSidebarButton = document.getElementById("toggleSidebar");
    const sidebar = document.getElementById("sidebar");
    if (toggleSidebarButton && sidebar) {
        toggleSidebarButton.addEventListener("click", () => {
            console.log("🔄 Toggling sidebar");
            sidebar.classList.toggle("expanded");
        });
    } else {
        console.error("❌ Sidebar or toggle button not found");
    }
});