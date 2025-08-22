// --- Funções de UI reutilizáveis ---

export function showPopup(message, type = 'info', duration = 3000) {
    const popup = document.getElementById('popup');
    if (!popup) return;

    popup.classList.remove('success', 'error', 'info');
    popup.classList.add(type);
    popup.textContent = message;
    popup.classList.add('show');
    
    setTimeout(() => {
        popup.classList.remove('show');
    }, duration);
}
export function showSection(sectionId) {
    // Esconde todas as seções de conteúdo
    document.querySelectorAll('.content > div[id$="Section"]').forEach(section => {
        section.style.display = 'none';
    });

    // Mostra apenas a seção desejada
    const activeSection = document.getElementById(`${sectionId}Section`);
    if (activeSection) {
        activeSection.style.display = 'block';
    }

    // Gerencia a classe 'active' nos botões da sidebar
    document.querySelectorAll('.sidebar-button[data-section]').forEach(button => {
        // Remove a classe 'active' de todos os botões
        button.classList.remove('active');
        // Adiciona a classe 'active' apenas ao botão correspondente
        if (button.dataset.section === sectionId) {
            button.classList.add('active');
        }
    });

    updateGreeting();
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