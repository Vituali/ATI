// --- Funções de UI reutilizáveis ---

export function showPopup(message, duration = 2000) {
    const popup = document.getElementById('popup');
    if (!popup) return;
    popup.textContent = message;
    popup.classList.add('show');
    setTimeout(() => popup.classList.remove('show'), duration);
}

export function showSection(sectionId) {
    document.querySelectorAll('.content > div').forEach(section => {
        section.style.display = section.id === `${sectionId}Section` ? 'block' : 'none';
    });
    document.querySelectorAll('.sidebar-button[data-section]').forEach(button => {
        button.classList.toggle('active', button.dataset.section === sectionId);
    });
    updateGreeting(); // Garante que a saudação correta é exibida
}

export function initializeUI() {
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    if (sidebar && toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('expanded');
        });
    }
}

export function updateGreeting() {
    const hora = new Date().getHours();
    const saudacaoText = hora >= 5 && hora < 12 ? "Bom dia" :
                         hora >= 12 && hora < 18 ? "Boa tarde" : "Boa noite";
    document.getElementById('saudacaoChat').textContent = saudacaoText;
    document.getElementById('saudacaoConversor').textContent = saudacaoText;
}

export function replacePlaceholders(text) {
    const hora = new Date().getHours();
    const saudacao = hora >= 5 && hora < 12 ? "Bom dia" :
                     hora >= 12 && hora < 18 ? "Boa tarde" : "Boa noite";
    const despedida = hora >= 5 && hora < 12 ? "Tenha uma excelente manhã" :
                      hora >= 12 && hora < 18 ? "Tenha uma excelente tarde" : "Tenha uma excelente noite";
    
    // Verifica se o texto é uma string antes de substituir
    if (typeof text !== 'string') return '';

    return text.replace(/\[SAUDACAO\]/gi, saudacao).replace(/\[DESPEDIDA\]/gi, despedida);
}

export function adjustTextareaHeight(textarea) {
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
}