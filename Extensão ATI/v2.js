// v2.js - VERSÃO FINAL CORRIGIDA PARA INJEÇÃO DE BOTÕES

console.log("ATI Extensão: Script V2 (Final v5) carregado!");

var osTemplates = [];

// --- Funções Auxiliares e de Lógica ---
function showNotification(message, isError = false, duration = 3000) {
    const notificationId = 'v2-notification';
    document.getElementById(notificationId)?.remove();
    const notification = document.createElement("div");
    notification.id = notificationId;
    notification.textContent = message;
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, duration);
}

async function loadTemplatesV2() {
    osTemplates = await loadTemplatesFromStorage();
}

function findActiveChatHeaderV2() { return document.querySelector('div.z-10 header'); }
function findActiveChatBodyV2() { return document.querySelector('div#attendanceMessages'); }

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
            phoneNumber = `${ddd} ${number.slice(0, number.length - 4)}-${number.slice(number.length - 4)}`;
        } else if (phoneDigits.length === 10 || phoneDigits.length === 11) {
            const ddd = phoneDigits.substring(0, 2);
            const number = phoneDigits.substring(2);
            phoneNumber = `${ddd} ${number.slice(0, number.length - 4)}-${number.slice(number.length - 4)}`;
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

function insertReplyText(text) {
    const textarea = document.querySelector('textarea.chat_textarea');
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
    if (document.getElementById('osModalV2')) return;
    const chatHeader = findActiveChatHeaderV2();
    const chatBody = findActiveChatBodyV2();
    if (!chatHeader || !chatBody) { showNotification("Nenhum chat ativo para criar O.S.", true); return; }
    const allMessageTexts = collectTextFromMessagesV2(chatBody);
    const { firstName, phoneNumber } = extractDataFromHeaderV2(chatHeader);
    const suggestedTemplate = findSuggestedTemplate(allMessageTexts);
    const osOnlyTemplates = osTemplates.filter(t => t.category !== 'quick_reply');
    const templatesByCategory = osOnlyTemplates.reduce((acc, t) => {
        (acc[t.category || 'Outros'] = acc[t.category || 'Outros'] || []).push(t); return acc;
    }, {});
    let modelsHTML = '';
    for (const category in templatesByCategory) {
        modelsHTML += `<h4 class="modal-category-title">${category}</h4>`;
        const buttonsHTML = templatesByCategory[category].map(t => `<button class="template-btn" data-template-text="${t.text.replace(/"/g, '&quot;')}">${t.title}</button>`).join('');
        modelsHTML += `<div class="modal-btn-group">${buttonsHTML}</div>`;
    }
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'osModalV2';
    modalBackdrop.className = 'modal-backdrop ati-os-modal';
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    const suggestionHTML = suggestedTemplate ? `<div class="modal-suggestion"><strong>Sugestão:</strong><button class="template-btn template-btn--suggestion" data-template-text="${suggestedTemplate.text.replace(/"/g, '&quot;')}">${suggestedTemplate.title}</button></div>` : '';
    const baseTextForOS = `${phoneNumber || ''} ${firstName || ''} | `;
    modalContent.innerHTML = `<div class="modal-header"><h3>Criar Ordem de Serviço</h3><button id="closeOsBtnV2" class="modal-close-btn">&times;</button></div><div class="modal-body">${suggestionHTML}<label for="osTextAreaV2">Descrição da O.S.:</label><textarea id="osTextAreaV2" class="modal-textarea"></textarea><div class="modal-templates-container"><strong>Todos os Modelos:</strong>${modelsHTML}</div></div><div class="modal-footer"><button id="copyOsBtnV2" class="main-btn main-btn--confirm">Copiar O.S. e Fechar</button></div>`;
    modalBackdrop.appendChild(modalContent);
    document.body.appendChild(modalBackdrop);
    const osTextArea = document.getElementById('osTextAreaV2');
    osTextArea.value = processDynamicPlaceholders(baseTextForOS).toUpperCase();
    osTextArea.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
    modalContent.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const templateText = btn.getAttribute('data-template-text');
            const fullText = baseTextForOS + templateText;
            osTextArea.value = processDynamicPlaceholders(fullText).toUpperCase();
            osTextArea.focus();
        });
    });
    const closeModal = () => modalBackdrop.remove();
    document.getElementById('copyOsBtnV2').onclick = () => { navigator.clipboard.writeText(osTextArea.value).then(() => { showNotification("O.S. copiada com sucesso!"); closeModal(); }).catch(err => showNotification("Falha ao copiar O.S.", true)); };
    document.getElementById('closeOsBtnV2').onclick = closeModal;
    modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) { closeModal(); } });
}

// --- Funções de Injeção de UI ---
function injectUIElements() {
    // Injeção dos botões de ação (Copiar Contato, CPF, etc.)
    const sidebar = document.querySelector('.chat_sidebar');
    if (sidebar && !document.getElementById('actionsContainerV2')) {
        const container = document.createElement("div");
        container.id = "actionsContainerV2";
        sidebar.appendChild(container); // Injeta na sidebar
        container.innerHTML = `
            <button class="action-btn action-btn--contact">Copiar Contato</button>
            <button class="action-btn action-btn--cpf">Copiar CPF</button>
            <button class="action-btn action-btn--os">Criar O.S.</button>`;
        container.querySelector('.action-btn--contact').onclick = copyContactInfoV2;
        container.querySelector('.action-btn--cpf').onclick = copyCPFFromChatV2;
        container.querySelector('.action-btn--os').onclick = showOSModalV2;
    }

    // Lógica de injeção das Respostas Rápidas
    const injectionParent = document.querySelector('.flex-none.p-4.pb-6');
    if (injectionParent && !document.getElementById('atiQuickRepliesContainerV2')) {
        const quickReplies = osTemplates.filter(t => t.category === 'quick_reply');
        if (quickReplies.length > 0) {
            const repliesByCategory = quickReplies.reduce((acc, reply) => {
                (acc[reply.subCategory || 'Geral'] = acc[reply.subCategory || 'Geral'] || []).push(reply);
                return acc;
            }, {});

            const buttonContainer = document.createElement('div');
            buttonContainer.id = 'atiQuickRepliesContainerV2';
            buttonContainer.className = 'quick-replies-container';

            // Usamos prepend() para garantir que os botões apareçam no início da seção do rodapé
            injectionParent.prepend(buttonContainer);
            renderReplyUI(buttonContainer, repliesByCategory, null);
        }
    }
}

// --- LÓGICA DE INICIALIZAÇÃO E O "VIGIA" ---
const observer = new MutationObserver(() => injectUIElements());
(async function main() {
    await loadTemplatesV2();
    injectCSS('injected.css');
    injectUIElements();
    observer.observe(document.body, { childList: true, subtree: true });
})();