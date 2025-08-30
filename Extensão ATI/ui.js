// ui.js - VERSÃO FINAL CORRIGIDA

const V1_TEXTAREA_SELECTOR = 'textarea[placeholder="Digite aqui sua mensagem..."]';
var osTemplates = [];

// ===================================================================================
// LÓGICA DE "SEQUESTRO" DO MODAL NATIVO
// ===================================================================================

function selectReplyAndClose(text) {
    const activeChat = findActiveAttendanceElement();
    if (!activeChat) return;
    const textarea = activeChat.querySelector(V1_TEXTAREA_SELECTOR);
    if (textarea) {
        textarea.value = processDynamicPlaceholders(text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
    }
    const closeButton = document.querySelector('.modal_msg_model .modal-footer a.button');
    if (closeButton) {
        closeButton.click();
    }
}

function rebuildNativeModal(modal) {
    const quickReplies = osTemplates.filter(t => t.category === 'quick_reply');
    if (quickReplies.length === 0) return;
    const titleElement = modal.querySelector('.modal-header h1');
    const listElement = modal.querySelector('.modal-content ul');
    const taglineElement = modal.querySelector('.modal-header p.tagline');
    const markElement = modal.querySelector('.modal-content mark');
    if (!titleElement || !listElement) return;
    titleElement.textContent = 'Respostas Rápidas (Extensão)';
    if (taglineElement) taglineElement.style.display = 'none';
    if (markElement) markElement.style.display = 'none';
    listElement.innerHTML = '';
    const repliesByCategory = quickReplies.reduce((acc, reply) => {
        const subCategory = reply.subCategory || 'Geral';
        if (!acc[subCategory]) acc[subCategory] = [];
        acc[subCategory].push(reply);
        return acc;
    }, {});
    for (const subCategory in repliesByCategory) {
        const categoryTitle = document.createElement('li');
        categoryTitle.innerHTML = `<b>${subCategory}</b>`;
        listElement.appendChild(categoryTitle);
        repliesByCategory[subCategory].forEach(reply => {
            const listItem = document.createElement('li');
            const paragraph = document.createElement('p');
            paragraph.className = 'message_model';
            paragraph.textContent = reply.title;
            paragraph.title = reply.text;
            paragraph.onclick = (event) => {
                event.stopPropagation();
                event.preventDefault();
                selectReplyAndClose(reply.text);
            };
            listItem.appendChild(paragraph);
            listElement.appendChild(listItem);
        });
    }
}

function initializeModalHijacker() {
    const nativeModalSelector = 'section[data-modal="msg_model"]';
    let isHijacked = false;
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.attributeName === 'style') {
                const modal = document.querySelector(nativeModalSelector);
                if (modal && modal.style.display !== 'none' && !isHijacked) {
                    isHijacked = true;
                    rebuildNativeModal(modal);
                } else if (modal && modal.style.display === 'none') {
                    isHijacked = false;
                }
            }
        }
    });
    const modalNode = document.querySelector(nativeModalSelector);
    if (modalNode) {
        observer.observe(modalNode, { attributes: true, attributeFilter: ['style'] });
        console.log("ATI Extensão: 'Sequestrador de Modal' inicializado.");
    }
}

// ===================================================================================
// FUNÇÕES PRINCIPAIS DA EXTENSÃO (O.S., Copiar, etc.)
// ===================================================================================

function showNotification(message, isError = false, duration = 3000) {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 10px 20px; background-color: ${isError ? "#dc3545" : "#007bff"}; color: #fff; border-radius: 5px; z-index: 999999;`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, duration);
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

function showOSModal() {
    if (document.getElementById('osModal')) return;
    const chatHeader = findActiveChatHeader();
    const chatBody = findActiveChatBody();
    if (!chatHeader || !chatBody) { showNotification("Nenhum chat ativo encontrado.", true); return; }
    const clientChatTexts = extractClientChatAfterAssignment(chatBody);
    const suggestedTemplate = findSuggestedTemplate(clientChatTexts);
    const { firstName, phoneNumber } = extractDataFromHeader(chatHeader);
    const osBaseText = `${phoneNumber || ''} ${firstName || ''} | `;
    const osOnlyTemplates = osTemplates.filter(t => t.category !== 'quick_reply');
    const templatesByCategory = osOnlyTemplates.reduce((acc, t) => { (acc[t.category || 'Outros'] = acc[t.category || 'Outros'] || []).push(t); return acc; }, {});
    let modelsHTML = '';
    for (const category in templatesByCategory) {
        modelsHTML += `<h4 class="modal-category-title">${category}</h4>`;
        const buttonsHTML = templatesByCategory[category].map(t => `<button class="template-btn" data-template-text="${t.text.replace(/"/g, '&quot;')}">${t.title}</button>`).join('');
        modelsHTML += `<div class="modal-btn-group">${buttonsHTML}</div>`;
    }
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'osModal';
    modalBackdrop.className = 'modal-backdrop ati-os-modal';
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    const suggestionHTML = suggestedTemplate ? `<div class="modal-suggestion"><strong>Sugestão:</strong><button class="template-btn template-btn--suggestion" data-template-text="${suggestedTemplate.text.replace(/"/g, '&quot;')}">${suggestedTemplate.title}</button></div>` : '';
    
    // CORREÇÃO 1: O botão de cancelar do rodapé agora tem um ID único: "cancelOsBtnFooter"
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>CRIAR ORDEM DE SERVIÇO</h3>
            <button id="cancelOsBtn" class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
            ${suggestionHTML}
            <label for="osTextArea">DESCRIÇÃO:</label>
            <textarea id="osTextArea" class="modal-textarea"></textarea>
            <div class="modal-templates-container"><strong>TODOS OS MODELOS:</strong>${modelsHTML}</div>
        </div>
        <div class="modal-footer">
            <button id="copyOsBtn" class="main-btn main-btn--confirm">COPIAR O.S. E FECHAR</button>
            <button id="cancelOsBtnFooter" class="main-btn main-btn--cancel">CANCELAR</button>
        </div>`;
    
    modalBackdrop.appendChild(modalContent);
    document.body.appendChild(modalBackdrop);
    const osTextArea = document.getElementById('osTextArea');
    osTextArea.value = processDynamicPlaceholders(osBaseText).toUpperCase();
    osTextArea.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
    modalContent.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const templateText = btn.getAttribute('data-template-text');
            const fullText = osBaseText + templateText;
            osTextArea.value = processDynamicPlaceholders(fullText).toUpperCase();
            osTextArea.focus();
        });
    });

    const closeModal = () => modalBackdrop.remove();

    document.getElementById('copyOsBtn').onclick = () => {
        navigator.clipboard.writeText(osTextArea.value).then(() => {
            showNotification("O.S. copiada!");
            closeModal();
        });
    };

    // CORREÇÃO 2: Adicionada a lógica de clique para AMBOS os botões de cancelar
    document.getElementById('cancelOsBtn').onclick = closeModal;
    document.getElementById('cancelOsBtnFooter').onclick = closeModal;
}

function createActionsContainer() {
    // Se o container de ações já existir na página, não faz nada.
    if (document.getElementById("actionsContainer")) return;

    const container = document.createElement("div");
    container.id = "actionsContainer";

    // A CORREÇÃO: Anexar o container SEMPRE ao <body> da página.
    // Desta forma, ele "flutua" sobre o site e não interfere com
    // a estrutura e os scripts do Chatmix. O CSS já cuida do posicionamento.
    document.body.appendChild(container);
}

function initializeActions() {
    if (!document.getElementById("actionsContainer")) {
        createActionsContainer();
    }
    const container = document.getElementById("actionsContainer");
    if (!container || container.childElementCount > 0) return;
    container.innerHTML = `
        <button class="action-btn action-btn--contact">Copiar Contato</button>
        <button class="action-btn action-btn--cpf">Copiar CPF</button>
        <button class="action-btn action-btn--os">Criar O.S.</button>
    `;
    container.querySelector('.action-btn--contact').onclick = copyContactInfo;
    container.querySelector('.action-btn--cpf').onclick = copyCPFFromChat;
    container.querySelector('.action-btn--os').onclick = showOSModal;
}

function copyContactInfo() {
  const header = findActiveChatHeader();
  if (!header) { showNotification("Nenhum chat ativo encontrado!", true); return; }
  const { firstName, phoneNumber } = extractDataFromHeader(header);
  if (phoneNumber || firstName) {
    const contactString = `${phoneNumber || ''} ${firstName || ''} |`.trim();
    navigator.clipboard.writeText(contactString).then(() => showNotification(`Contato copiado: ${contactString}`)).catch(err => showNotification("Erro ao copiar dados!", true));
  } else {
    showNotification("Nenhum nome ou telefone encontrado no cabeçalho!", true);
  }
}

function copyCPFFromChat() {
    const chatBody = findActiveChatBody();
    if (!chatBody) { showNotification("Nenhum chat ativo encontrado!", true); return; }
    const allMessageTexts = collectTextFromMessages(chatBody);
    const foundCPF = findCPF(allMessageTexts);
    if (foundCPF) {
        navigator.clipboard.writeText(foundCPF).then(() => showNotification(`CPF/CNPJ copiado: ${foundCPF}`)).catch(err => showNotification("Erro ao copiar CPF!", true));
    } else {
        showNotification("Nenhum CPF/CNPJ encontrado nas mensagens do chat!", true);
    }
}