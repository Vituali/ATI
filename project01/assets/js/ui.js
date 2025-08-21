// Gerencia componentes de UI gerais como popups, sidebar e saudações.

export function initializeUI() {
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');

    if (toggleSidebarBtn && sidebar) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('expanded');
        });
    }

    // Atualiza a saudação imediatamente e depois a cada minuto
    updateGreeting();
    setInterval(updateGreeting, 60000);
}

export function showPopup(message, duration = 2000) {
    const popup = document.getElementById('popup');
    if (!popup) {
        console.error("Elemento 'popup' não encontrado.");
        return;
    }
    popup.textContent = message;
    popup.classList.add('show');
    setTimeout(() => {
        popup.classList.remove('show');
    }, duration);
}

export function adjustTextareaHeight(textarea) {
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
}

export function replacePlaceholders(text) {
    const now = new Date();
    const hour = now.getHours();
    let greeting, farewell;

    if (hour >= 5 && hour < 12) {
        greeting = "Bom dia";
        farewell = "Tenha uma excelente manhã";
    } else if (hour >= 12 && hour < 18) {
        greeting = "Boa tarde";
        farewell = "Tenha uma excelente tarde";
    } else {
        greeting = "Boa noite";
        farewell = "Tenha uma excelente noite";
    }
    return text.replace(/\[saudacao\]/gi, greeting).replace(/\[despedida\]/gi, farewell);
}

export function updateGreeting() {
    const now = new Date();
    const hour = now.getHours();
    let greetingText;

    if (hour >= 5 && hour < 12) {
        greetingText = "Bom dia";
    } else if (hour >= 12 && hour < 18) {
        greetingText = "Boa tarde";
    } else {
        greetingText = "Boa noite";
    }

    // Atualiza a saudação em todos os elementos designados
    document.querySelectorAll('#greeting, #greetingConversor').forEach(el => {
        el.textContent = greetingText;
    });
}