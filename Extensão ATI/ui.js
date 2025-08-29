// ui.js - VERSÃO COM CORREÇÕES

const V1_TEXTAREA_SELECTOR = 'textarea[placeholder="Digite aqui sua mensagem..."]';
var osTemplates = [];

// ===================================================================================
// LÓGICA DE "SEQUESTRO" DO MODAL NATIVO
// ===================================================================================

/**
 * Insere o texto da resposta no textarea e fecha o modal.
 * @param {string} text O texto a ser inserido.
 */
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

/**
 * Reconstrói o conteúdo do modal nativo com as respostas rápidas da extensão.
 * @param {HTMLElement} modal O elemento do modal que apareceu na tela.
 */
function rebuildNativeModal(modal) {
    const quickReplies = osTemplates.filter(t => t.category === 'quick_reply');
    if (quickReplies.length === 0) return;

    const titleElement = modal.querySelector('.modal-header h1');
    const listElement = modal.querySelector('.modal-content ul');
    const taglineElement = modal.querySelector('.modal-header p.tagline');
    const markElement = modal.querySelector('.modal-content mark');

    if (!titleElement || !listElement) return;

    // Modifica os elementos nativos
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

            // ===== CORREÇÃO 2: Adicionado event.stopPropagation() =====
            // Isso impede que o clique acione outras funções da página do Chatmix que usam a mesma classe.
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


/**
 * O "VIGIA": Fica esperando o modal nativo aparecer para poder modificá-lo.
 */
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
        modelsHTML += `<h4>${category}</h4>`;
        const buttonsHTML = templatesByCategory[category].map(t => `<button class="template-btn" data-template-text="${t.text}">${t.title}</button>`).join('');
        modelsHTML += `<div>${buttonsHTML}</div>`;
    }
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'osModal';
    modalBackdrop.className = 'ati-modal-backdrop';
    const modalContent = document.createElement('div');
    modalContent.className = 'ati-modal-content';
    const suggestionHTML = suggestedTemplate ? `<div class="ati-modal-suggestion"><strong>Sugestão:</strong><button class="template-btn template-btn--suggestion" data-template-text="${suggestedTemplate.text}">${suggestedTemplate.title}</button></div>` : '';
    modalContent.innerHTML = `<h3>CRIAR ORDEM DE SERVIÇO</h3> ${suggestionHTML} <div style="margin-bottom: 15px;"><label>DESCRIÇÃO:</label><textarea id="osTextArea"></textarea></div><div class="ati-modal-templates-container"><strong>TODOS OS MODELOS:</strong>${modelsHTML}</div><div class="ati-modal-footer"><button id="copyOsBtn" class="ati-main-btn ati-main-btn--confirm">COPIAR O.S. E FECHAR</button><button id="cancelOsBtn" class="ati-main-btn ati-main-btn--cancel">CANCELAR</button></div>`;
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
        });
    });
    document.getElementById('copyOsBtn').onclick = () => { navigator.clipboard.writeText(osTextArea.value).then(() => { showNotification("O.S. copiada!"); modalBackdrop.remove(); }); };
    document.getElementById('cancelOsBtn').onclick = () => modalBackdrop.remove();
}

// ===== CORREÇÃO 1: Função modificada para posicionar os botões corretamente =====
function createActionsContainer() {
    if (document.getElementById("actionsContainer")) return;

    // Procura o cabeçalho dentro da seção de atendimentos, que é o local ideal para os botões.
    const targetParent = document.querySelector("section.attendances .header");
    
    const container = document.createElement("div");
    container.id = "actionsContainer";

    if (targetParent) {
        // Se encontrar o cabeçalho, adiciona o container de botões nele.
        targetParent.appendChild(container);
    } else {
        // Se não encontrar, adiciona no corpo da página como um fallback.
        console.warn("ATI Extensão: Não foi possível encontrar o local ideal para os botões. Usando fallback.");
        document.body.appendChild(container);
    }
}


function initializeActions() {
    if (!document.getElementById("actionsContainer")) {
        createActionsContainer();
    }
    const container = document.getElementById("actionsContainer");
    
    // Evita adicionar os botões mais de uma vez
    if (!container || container.childElementCount > 0) return;

    container.innerHTML = '';
    const copyContactBtn = document.createElement("button");
    copyContactBtn.textContent = "Copiar Contato";
    copyContactBtn.className = "ati-action-btn ati-action-btn--contact";
    copyContactBtn.onclick = copyContactInfo;
    container.appendChild(copyContactBtn);

    const copyCpfBtn = document.createElement("button");
    copyCpfBtn.textContent = "Copiar CPF";
    copyCpfBtn.className = "ati-action-btn ati-action-btn--cpf";
    copyCpfBtn.onclick = copyCPFFromChat;
    container.appendChild(copyCpfBtn);
    
    const osButton = document.createElement("button");
    osButton.textContent = "Criar O.S.";
    osButton.className = "ati-action-btn ati-action-btn--os";
    osButton.onclick = showOSModal;
    container.appendChild(osButton);
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