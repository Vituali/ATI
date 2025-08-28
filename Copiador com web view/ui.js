// ui.js - Funções para criar e gerenciar os elementos visuais da extensão na página.

const V1_TEXTAREA_SELECTOR = 'textarea[placeholder="Digite aqui sua mensagem..."]';
const NATIVE_QUICK_REPLY_BUTTON_SELECTOR = 'a[data-modal-button="msg_model"]';

var osTemplates = []; // Usamos 'var' para garantir o escopo compartilhado entre os scripts

function showQuickReplyModal() {
    if (document.getElementById('atiQuickReplyModal')) return;
    const quickReplies = osTemplates.filter(t => t.category === 'quick_reply');
    if (quickReplies.length === 0) {
        showNotification("Nenhuma resposta rápida encontrada.", true);
        return;
    }
    const repliesByCategory = quickReplies.reduce((acc, reply) => {
        const subCategory = reply.subCategory || 'Geral';
        if (!acc[subCategory]) acc[subCategory] = [];
        acc[subCategory].push(reply);
        return acc;
    }, {});
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'atiQuickReplyModal';
    modalBackdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background-color: #fff; color: #333; padding: 20px; border-radius: 8px; width: 600px; max-width: 90%; box-shadow: 0 5px 15px rgba(0,0,0,0.3); max-height: 80vh; overflow-y: auto;';
    let modalHTML = `<h3 style="margin-top: 0; border-bottom: 1px solid #ccc; padding-bottom: 10px;">Respostas Rápidas (Extensão)</h3>`;
    for (const subCategory in repliesByCategory) {
        modalHTML += `<h4 style="margin-top: 15px; margin-bottom: 10px; color: #0056b3; text-transform: capitalize;">${subCategory}</h4>`;
        let buttonsHTML = repliesByCategory[subCategory].map(reply => `<button class="quick-reply-btn" data-text='${reply.text.replace(/'/g, "&apos;")}' style="padding: 8px 12px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer;">${reply.title}</button>`).join('');
        modalHTML += `<div style="display: flex; flex-wrap: wrap; gap: 8px;">${buttonsHTML}</div>`;
    }
    modalHTML += `<div style="text-align: right; margin-top: 20px;"><button id="cancelQuickReplyBtn" style="padding: 8px 15px; background-color: #6c757d; color: #fff; border: none; border-radius: 5px; cursor: pointer;">Fechar</button></div>`;
    modalContent.innerHTML = modalHTML;
    modalBackdrop.appendChild(modalContent);
    document.body.appendChild(modalBackdrop);
    const closeModal = () => modalBackdrop.remove();
    modalContent.querySelectorAll('.quick-reply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const textarea = document.querySelector(V1_TEXTAREA_SELECTOR);
            if (textarea) {
                const rawText = btn.getAttribute('data-text');
                textarea.value = processDynamicPlaceholders(rawText);
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.focus();
            }
            closeModal();
        });
    });
    modalContent.querySelector('#cancelQuickReplyBtn').addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
}

function overrideNativeQuickReplyButton() {
    const nativeButton = document.querySelector(`${NATIVE_QUICK_REPLY_BUTTON_SELECTOR}:not(.ati-extension-cloned)`);
    if (nativeButton) {
        const clone = nativeButton.cloneNode(true);
        clone.classList.add('ati-extension-cloned');
        clone.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showQuickReplyModal();
        });
        nativeButton.parentNode.replaceChild(clone, nativeButton);
    }
}

function initializeButtonHijacker() {
    const observer = new MutationObserver(() => overrideNativeQuickReplyButton());
    observer.observe(document.body, { childList: true, subtree: true });
}

function showNotification(message, isError = false) {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 10px 20px; background-color: ${isError ? "#dc3545" : "#007bff"}; color: #fff; border-radius: 5px; z-index: 999999;`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3000);
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
    if (!chatHeader || !chatBody) {
        showNotification("Não foi possível encontrar os elementos do chat para criar a O.S.", true);
        return;
    }
    const clientChatTexts = extractClientChatAfterAssignment(chatBody);
    const suggestedTemplate = findSuggestedTemplate(clientChatTexts);
    const { firstName, phoneNumber } = extractDataFromHeader(chatHeader);
    const contactString = `${phoneNumber || ''} ${firstName || ''} |`.trim();
    const osBaseText = `${contactString} `;
    const osOnlyTemplates = osTemplates.filter(t => t.category !== 'quick_reply');
    const templatesByCategory = osOnlyTemplates.reduce((acc, template) => {
        const category = template.category || 'Outros';
        if (!acc[category]) acc[category] = [];
        acc[category].push(template);
        return acc;
    }, {});
    let modelsHTML = '';
    for (const category in templatesByCategory) {
        modelsHTML += `<h4 style="margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #555; padding-bottom: 5px;">${category.toUpperCase()}</h4>`;
        const buttonsHTML = templatesByCategory[category].map(t => `<button class="template-btn" data-template-text="${t.text}" style="margin: 2px 5px 2px 0; background: #007bff; border: none; color: #fff; padding: 5px 10px; border-radius: 4px; cursor: pointer;">${t.title}</button>`).join('');
        modelsHTML += `<div>${buttonsHTML}</div>`;
    }
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'osModal';
    modalBackdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background-color: #333; color: #fff; padding: 20px; border-radius: 8px; width: 600px; max-width: 90%; box-shadow: 0 5px 15px rgba(0,0,0,0.3);';
    const suggestionHTML = suggestedTemplate ? `<div style="margin-bottom: 20px; padding: 10px; background-color: #444; border-radius: 4px;"><strong>Sugestão:</strong><button class="template-btn" data-template-text="${suggestedTemplate.text}" style="margin-left: 10px; background: #ffc107; border: none; color: #000; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">${suggestedTemplate.title}</button></div>` : '';
    modalContent.innerHTML = `<h3 style="margin-top: 0; border-bottom: 1px solid #555; padding-bottom: 10px;">CRIAR ORDEM DE SERVIÇO</h3> ${suggestionHTML} <div style="margin-bottom: 15px;"><label for="osTextArea" style="display: block; margin-bottom: 5px;">DESCRIÇÃO:</label><textarea id="osTextArea" style="width: 97%; height: 150px; background-color: #222; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 10px; font-family: sans-serif; text-transform: uppercase;"></textarea></div><div style="margin-bottom: 20px;"><strong>TODOS OS MODELOS:</strong>${modelsHTML}</div><div><button id="copyOsBtn" style="padding: 10px 20px; background-color: #28a745; color: #fff; border: none; border-radius: 5px; cursor: pointer;">COPIAR O.S. E FECHAR</button><button id="cancelOsBtn" style="padding: 10px 20px; background-color: #dc3545; color: #fff; border: none; border-radius: 5px; cursor: pointer; float: right;">CANCELAR</button></div>`;
    modalBackdrop.appendChild(modalContent);
    document.body.appendChild(modalBackdrop);
    const osTextArea = document.getElementById('osTextArea');
    osTextArea.value = processDynamicPlaceholders(osBaseText).toUpperCase();
    osTextArea.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const templateText = btn.getAttribute('data-template-text');
            const fullText = osBaseText + templateText;
            osTextArea.value = processDynamicPlaceholders(fullText).toUpperCase();
        });
    });
    document.getElementById('copyOsBtn').addEventListener('click', () => {
        navigator.clipboard.writeText(osTextArea.value).then(() => {
            showNotification("O.S. copiada com sucesso!");
            modalBackdrop.remove();
        }).catch(() => showNotification("Falha ao copiar O.S.!", true));
    });
    document.getElementById('cancelOsBtn').addEventListener('click', () => {
        modalBackdrop.remove();
    });
}

function createActionsContainer() {
    if (document.getElementById("actionsContainer")) return;
    const container = document.createElement("div");
    container.id = "actionsContainer";
    container.style.cssText = "position: fixed; z-index: 999998; display: flex; gap: 10px;";
    document.body.appendChild(container);
    positionContainer(container);
    window.addEventListener("resize", () => positionContainer(container));
    window.addEventListener("scroll", () => positionContainer(container));
}

function initializeActions() {
    if (document.getElementById("actionsContainer")) return;
    createActionsContainer();
    const container = document.getElementById("actionsContainer");
    container.innerHTML = '';
    const copyContactBtn = document.createElement("button");
    copyContactBtn.textContent = "Copiar Contato";
    copyContactBtn.style.cssText = "padding: 10px 15px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);";
    copyContactBtn.addEventListener("click", copyContactInfo);
    container.appendChild(copyContactBtn);
    const copyCpfBtn = document.createElement("button");
    copyCpfBtn.textContent = "Copiar CPF";
    copyCpfBtn.style.cssText = "padding: 10px 15px; background-color: #17a2b8; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);";
    copyCpfBtn.addEventListener("click", copyCPFFromChat);
    container.appendChild(copyCpfBtn);
    const osButton = document.createElement("button");
    osButton.textContent = "Criar O.S.";
    osButton.style.cssText = "padding: 10px 15px; background-color: #6f42c1; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);";
    osButton.addEventListener("click", showOSModal);
    container.appendChild(osButton);
    initializeButtonHijacker();
}

function positionContainer(container) {
    // Nova estratégia: posiciona o container de forma fixa no canto inferior esquerdo.
    // É mais robusto e não depende da estrutura do site.
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.left = '80px'; // 80px para não ficar em cima da barra de ícones
    container.style.zIndex = '99999';

    // Remove estilos antigos que não são mais necessários
    container.style.top = '';
    container.style.transform = '';
}

function copyContactInfo() {
  const header = findActiveChatHeader();
  if (!header) {
    showNotification("Nenhum chat ativo encontrado!", true);
    return;
  }
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
    if (!chatBody) {
        showNotification("Nenhum chat ativo encontrado!", true);
        return;
    }
    const allMessageTexts = collectTextFromMessages(chatBody);
    const foundCPF = findCPF(allMessageTexts);
    if (foundCPF) {
        navigator.clipboard.writeText(foundCPF).then(() => showNotification(`CPF/CNPJ copiado: ${foundCPF}`)).catch(err => showNotification("Erro ao copiar CPF!", true));
    } else {
        showNotification("Nenhum CPF/CNPJ encontrado nas mensagens do chat!", true);
    }
}