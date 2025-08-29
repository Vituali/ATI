// v2.js - Versão FINAL com todas as correções

console.log("ATI Extensão: Script V2 (Final v3) carregado!");

// --- Seletores de DOM para a V2 (mais estáveis) ---
const V2_SIDEBAR_SELECTOR = 'div.chat_sidebar';
const V2_CHAT_HEADER_SELECTOR = 'div.z-10 header';
const V2_CHAT_BODY_SELECTOR = 'div#attendanceMessages';
const V2_TEXTAREA_SELECTOR = 'textarea.chat_textarea';
const V2_QUICK_REPLY_INJECTION_POINT_SELECTOR = 'div.flex.mx-auto';

let osTemplates = [];

// --- Funções Auxiliares e de Lógica ---
function showNotification(message, isError = false, duration = 3000) {
    const notificationId = 'ati-v2-notification';
    document.getElementById(notificationId)?.remove();
    const notification = document.createElement("div");
    notification.id = notificationId;
    notification.textContent = message;
    notification.className = `ati-notification ${isError ? 'error' : 'success'}`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, duration);
}

async function loadTemplatesV2() {
    osTemplates = await loadTemplatesFromStorage();
}

// --- Funções "Detetive" ---
function findActiveChatHeaderV2() { return document.querySelector(V2_CHAT_HEADER_SELECTOR); }
function findActiveChatBodyV2() { return document.querySelector(V2_CHAT_BODY_SELECTOR); }

function extractDataFromHeaderV2(headerElement) {
    if (!headerElement) return { firstName: "", phoneNumber: "" };
    const nameElement = headerElement.querySelector('h2.text-base');
    const phoneElement = headerElement.querySelector('span.text-sm');
    const firstName = nameElement ? (nameElement.textContent || "").trim().split(' ')[0].toUpperCase() : "";
    let phoneNumber = "";
    if (phoneElement) {
        const phoneDigits = (phoneElement.textContent || "").replace(/\D/g, '');
        if (phoneDigits.startsWith('55') && (phoneDigits.length === 12 || phoneDigits.length === 13)) {
            const ddd = phoneDigits.substring(2, 4);
            const number = phoneDigits.substring(4);
            const part1 = number.length === 9 ? number.slice(0, 5) : number.slice(0, 4);
            const part2 = number.length === 9 ? number.slice(5) : number.slice(4);
            phoneNumber = `${ddd} ${part1}-${part2}`;
        } else if (phoneDigits.length === 10 || phoneDigits.length === 11) {
            const ddd = phoneDigits.substring(0, 2);
            const number = phoneDigits.substring(2);
            const part1 = number.length === 9 ? number.slice(0, 5) : number.slice(0, 4);
            const part2 = number.length === 9 ? number.slice(5) : number.slice(4);
            phoneNumber = `${ddd} ${part1}-${part2}`;
        } else {
            phoneNumber = phoneDigits;
        }
    }
    return { firstName, phoneNumber };
}

function collectTextFromMessagesV2(chatBody) {
    const texts = [];
    if (!chatBody) return texts;
    chatBody.querySelectorAll('p.mensagem').forEach(p => texts.push(p.textContent.trim()));
    return texts;
}
function processDynamicPlaceholders(text) {
    if (typeof text !== 'string') return '';
    const now = new Date();
    const hour = now.getHours();
    let saudacao = '';
    let despedida = '';
    if (hour >= 5 && hour < 12) {
        saudacao = 'Bom dia';
        despedida = 'Tenha uma excelente manhã';
    } else if (hour >= 12 && hour < 18) {
        saudacao = 'Boa tarde';
        despedida = 'Tenha uma excelente tarde';
    } else {
        saudacao = 'Boa noite';
        despedida = 'Tenha uma excelente noite';
    }
    let processedText = text.replace(/\[SAUDACAO\]/gi, saudacao);
    processedText = processedText.replace(/\[DESPEDIDA\]/gi, despedida);
    return processedText;
}

// Adicione esta função ao v2.js
function findSuggestedTemplate(allTexts) {
    const osOnlyTemplates = osTemplates.filter(t => t.category !== 'quick_reply');
    const chatContent = allTexts.join(' ').toLowerCase();
    for (const template of osOnlyTemplates) {
        if (!template.keywords || template.keywords.length === 0) continue;
        for (const keyword of template.keywords) {
            if (chatContent.includes(keyword.toLowerCase())) return template;
        }
    }
    return null;
}
// --- Lógica das Respostas Rápidas (Restaurada) ---
function insertReplyText(text) {
    const textarea = document.querySelector(V2_TEXTAREA_SELECTOR);
    if (textarea) {
        textarea.value = processDynamicPlaceholders(text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
    }
}

function renderReplyUI(container, groupedReplies, activeCategory = null) {
    container.innerHTML = '';
    if (activeCategory && groupedReplies[activeCategory]) {
        const backButton = document.createElement('button');
        backButton.className = 'qr-btn qr-btn--back';
        backButton.textContent = '↩️ Voltar';
        backButton.onclick = () => renderReplyUI(container, groupedReplies, null);
        container.appendChild(backButton);
        groupedReplies[activeCategory].forEach(reply => {
            const button = document.createElement('button');
            button.className = 'qr-btn';
            button.textContent = reply.title;
            button.title = reply.text;
            button.onclick = () => insertReplyText(reply.text);
            container.appendChild(button);
        });
    } else {
        Object.keys(groupedReplies).forEach(subCategory => {
            const button = document.createElement('button');
            button.className = 'qr-btn qr-btn--category';
            button.textContent = subCategory;
            button.onclick = () => renderReplyUI(container, groupedReplies, subCategory);
            container.appendChild(button);
        });
    }
}

// --- Funções de Ação dos Botões ---
function copyContactInfoV2() {
    const header = findActiveChatHeaderV2();
    if (!header) return showNotification("Nenhum chat ativo para copiar contato.", true);
    const { firstName, phoneNumber } = extractDataFromHeaderV2(header);
    const contactString = `${phoneNumber || ''} ${firstName || ''} |`.trim();
    if (contactString.length > 2) {
        navigator.clipboard.writeText(contactString).then(() => showNotification(`Contato copiado: ${contactString}`));
    } else {
        showNotification("Nome ou telefone não encontrado no cabeçalho.", true);
    }
}

function copyCPFFromChatV2() {
    const chatBody = findActiveChatBodyV2();
    if (!chatBody) return showNotification("Nenhum chat ativo para procurar CPF.", true);
    const allMessageTexts = collectTextFromMessagesV2(chatBody);
    const foundCPF = findCPF(allMessageTexts);
    if (foundCPF) {
        navigator.clipboard.writeText(foundCPF).then(() => showNotification(`CPF/CNPJ copiado: ${foundCPF}`));
    } else {
        showNotification("Nenhum CPF/CNPJ encontrado nas mensagens do chat!", true);
    }
}

function showOSModalV2() {
    // Evita abrir múltiplos modais
    if (document.getElementById('osModalV2')) return;

    // 1. Coletar dados do chat ativo usando as funções da V2
    const chatHeader = findActiveChatHeaderV2();
    const chatBody = findActiveChatBodyV2();

    if (!chatHeader || !chatBody) {
        showNotification("Nenhum chat ativo para criar O.S.", true);
        return;
    }

    const allMessageTexts = collectTextFromMessagesV2(chatBody);
    const { firstName, phoneNumber } = extractDataFromHeaderV2(chatHeader);

    // 2. Preparar templates
    const suggestedTemplate = findSuggestedTemplate(allMessageTexts);
    const osOnlyTemplates = osTemplates.filter(t => t.category !== 'quick_reply');
    const templatesByCategory = osOnlyTemplates.reduce((acc, t) => {
        const category = t.category || 'Outros';
        if (!acc[category]) acc[category] = [];
        acc[category].push(t);
        return acc;
    }, {});

    // 3. Construir o HTML dos botões de template
    let modelsHTML = '';
    for (const category in templatesByCategory) {
        modelsHTML += `<h4 class="ati-modal-category-title">${category}</h4>`;
        const buttonsHTML = templatesByCategory[category]
            .map(t => `<button class="ati-template-btn" data-template-text="${t.text.replace(/"/g, '&quot;')}">${t.title}</button>`)
            .join('');
        modelsHTML += `<div class="ati-modal-btn-group">${buttonsHTML}</div>`;
    }
    
    // 4. Construir o HTML principal do modal
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'osModalV2';
    modalBackdrop.className = 'ati-modal-backdrop';

    const modalContent = document.createElement('div');
    modalContent.className = 'ati-modal-content';

    const suggestionHTML = suggestedTemplate ?
        `<div class="ati-modal-suggestion">
            <strong>Sugestão:</strong>
            <button class="ati-template-btn ati-template-btn--suggestion" data-template-text="${suggestedTemplate.text.replace(/"/g, '&quot;')}">${suggestedTemplate.title}</button>
        </div>` : '';
        
    const baseTextForOS = `${phoneNumber || ''} ${firstName || ''} | `;

    modalContent.innerHTML = `
        <div class="ati-modal-header">
            <h3>Criar Ordem de Serviço</h3>
            <button id="closeOsBtnV2" class="ati-modal-close-btn">&times;</button>
        </div>
        <div class="ati-modal-body">
            ${suggestionHTML}
            <label for="osTextAreaV2">Descrição da O.S.:</label>
            <textarea id="osTextAreaV2" class="ati-modal-textarea"></textarea>
            <div class="ati-modal-templates-container">
                <strong>Todos os Modelos:</strong>
                ${modelsHTML}
            </div>
        </div>
        <div class="ati-modal-footer">
            <button id="copyOsBtnV2" class="ati-main-btn ati-main-btn--confirm">Copiar O.S. e Fechar</button>
        </div>`;
    
    // 5. Inserir o modal na página
    modalBackdrop.appendChild(modalContent);
    document.body.appendChild(modalBackdrop);

    // 6. Adicionar funcionalidade aos elementos do modal
    const osTextArea = document.getElementById('osTextAreaV2');
    osTextArea.value = processDynamicPlaceholders(baseTextForOS).toUpperCase();
    osTextArea.addEventListener('input', function() { this.value = this.value.toUpperCase(); });

    modalContent.querySelectorAll('.ati-template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const templateText = btn.getAttribute('data-template-text');
            const fullText = baseTextForOS + templateText;
            osTextArea.value = processDynamicPlaceholders(fullText).toUpperCase();
            osTextArea.focus();
        });
    });

    const closeModal = () => modalBackdrop.remove();

    document.getElementById('copyOsBtnV2').onclick = () => {
        navigator.clipboard.writeText(osTextArea.value)
            .then(() => {
                showNotification("O.S. copiada com sucesso!");
                closeModal();
            })
            .catch(err => showNotification("Falha ao copiar O.S.", true));
    };
    
    document.getElementById('closeOsBtnV2').onclick = closeModal;
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            closeModal();
        }
    });
}

// --- Funções de Injeção de UI ---
function injectUIElements() {
    const sidebar = document.querySelector(V2_SIDEBAR_SELECTOR);
    if (sidebar && !document.getElementById('actionsContainerV2')) {
        const container = document.createElement("div");
        container.id = "actionsContainerV2";
        container.innerHTML = `
            <button class="ati-action-btn ati-action-btn--contact">Copiar Contato</button>
            <button class="ati-action-btn ati-action-btn--cpf">Copiar CPF</button>
            <button class="ati-action-btn ati-action-btn--os">Criar O.S.</button>
        `;
        sidebar.appendChild(container);
        container.querySelector('.ati-action-btn--contact').onclick = copyContactInfoV2;
        container.querySelector('.ati-action-btn--cpf').onclick = copyCPFFromChatV2;
        container.querySelector('.ati-action-btn--os').onclick = showOSModalV2;
    }

    const textarea = document.querySelector(V2_TEXTAREA_SELECTOR);
    if (textarea && !document.getElementById('atiQuickRepliesContainerV2')) {
        const quickReplies = osTemplates.filter(t => t.category === 'quick_reply');
        if (quickReplies.length === 0) return;
        const repliesByCategory = quickReplies.reduce((acc, reply) => {
            (acc[reply.subCategory || 'Geral'] = acc[reply.subCategory || 'Geral'] || []).push(reply);
            return acc;
        }, {});
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'atiQuickRepliesContainerV2';
        buttonContainer.className = 'ati-quick-replies-container';
        const targetArea = textarea.closest(V2_QUICK_REPLY_INJECTION_POINT_SELECTOR);
        if (targetArea) {
            targetArea.parentNode.insertBefore(buttonContainer, targetArea);
            renderReplyUI(buttonContainer, repliesByCategory, null);
        }
    }
}

// --- LÓGICA DE INICIALIZAÇÃO E O "VIGIA" ---
const observer = new MutationObserver((mutations) => {
    injectUIElements();
});

(async function main() {
    await loadTemplatesV2();
    injectCSS('injected.css');
    injectUIElements();
    observer.observe(document.body, { childList: true, subtree: true });
})();