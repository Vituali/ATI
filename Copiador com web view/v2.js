// v2.js - Lógica exclusiva para o Chatmix V2

console.log("ATI Extensão: Script V2 carregado!");

const V2_SIDEBAR_SELECTOR = 'div.chat_sidebar';
const V2_CHAT_HEADER_SELECTOR = 'header:has(img[alt^="Foto de"])';
const V2_CHAT_BODY_SELECTOR = 'div#attendanceMessages';
const V2_TEXTAREA_SELECTOR = 'textarea.chat_textarea';

let osTemplates = [];
async function loadTemplatesV2() {
    osTemplates = await loadTemplatesFromStorage();
}

// ===================================================================================
// NOVA LÓGICA DE MENU PARA RESPOSTAS RÁPIDAS
// ===================================================================================

/**
 * Insere o texto da resposta rápida no textarea do chat.
 * @param {string} text - O texto a ser inserido.
 */
function insertReplyText(text) {
    const textarea = document.querySelector(V2_TEXTAREA_SELECTOR);
    if (textarea) {
        textarea.value = processDynamicPlaceholders(text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
    }
}

/**
 * Renderiza a interface de botões (seja de categorias ou de respostas) dentro do container.
 * @param {HTMLElement} container - O elemento div onde os botões serão desenhados.
 * @param {object} groupedReplies - Objeto com as respostas agrupadas por subcategoria.
 * @param {string|null} activeCategory - A categoria a ser exibida, ou null para mostrar o menu principal.
 */
function renderReplyUI(container, groupedReplies, activeCategory = null) {
    container.innerHTML = ''; // Limpa o container

    // Se uma categoria específica foi selecionada, mostra as respostas dela
    if (activeCategory && groupedReplies[activeCategory]) {
        // Botão de Voltar
        const backButton = document.createElement('button');
        backButton.textContent = '↩️ Voltar';
        backButton.style.cssText = 'padding: 6px 10px; font-size: 12px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;';
        backButton.onclick = () => renderReplyUI(container, groupedReplies, null);
        container.appendChild(backButton);

        // Botões de Resposta
        groupedReplies[activeCategory].forEach(reply => {
            const button = document.createElement('button');
            button.textContent = reply.title;
            button.title = reply.text;
            button.style.cssText = 'padding: 6px 10px; font-size: 12px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;';
            button.onclick = () => insertReplyText(reply.text);
            container.appendChild(button);
        });

    // Se nenhuma categoria foi selecionada, mostra o menu de categorias
    } else {
        Object.keys(groupedReplies).forEach(subCategory => {
            const button = document.createElement('button');
            button.textContent = subCategory;
            button.style.cssText = 'padding: 6px 10px; font-size: 12px; background-color: #e2e8f0; color: #1a202c; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; font-weight: 500;';
            button.onclick = () => renderReplyUI(container, groupedReplies, subCategory);
            container.appendChild(button);
        });
    }
}

/**
 * Função principal que encontra o local na página, prepara os dados e inicia o menu de respostas.
 */
function createQuickReplyButtonsV2() {
    const quickReplies = osTemplates.filter(t => t.category === 'quick_reply');
    if (quickReplies.length === 0) return;

    // Agrupa as respostas por subcategoria, igual fizemos na V1
    const repliesByCategory = quickReplies.reduce((acc, reply) => {
        const subCategory = reply.subCategory || 'Geral';
        if (!acc[subCategory]) acc[subCategory] = [];
        acc[subCategory].push(reply);
        return acc;
    }, {});

    const containerId = 'atiQuickRepliesContainerV2';
    
    // Procura o local para injetar o menu
    const interval = setInterval(() => {
        const targetArea = document.querySelector(V2_TEXTAREA_SELECTOR)?.closest('div.flex.mx-auto');
        if (targetArea) {
            clearInterval(interval); 
            if (document.getElementById(containerId)) return;

            const buttonContainer = document.createElement('div');
            buttonContainer.id = containerId;
            buttonContainer.style.cssText = 'padding: 0 10px 8px; display: flex; gap: 8px; justify-content: flex-start; flex-wrap: wrap;';
            
            // Insere o container na página
            targetArea.parentNode.insertBefore(buttonContainer, targetArea);
            
            // Renderiza a UI inicial (menu de categorias)
            renderReplyUI(buttonContainer, repliesByCategory, null);
        }
    }, 500);
}


// ===================================================================================
// Funções de Ação e Interface para a V2 (sem alterações)
// ===================================================================================

function showNotificationV2(message, isError = false) {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 10px 20px; background-color: ${isError ? "#dc3545" : "#007bff"}; color: #fff; border-radius: 5px; z-index: 9999999;`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3000);
}

function findSuggestedTemplateV2(allTexts) {
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

function showOSModalV2() {
    if (document.getElementById('osModalV2')) return;
    const chatHeader = document.querySelector(V2_CHAT_HEADER_SELECTOR);
    const chatBody = document.querySelector(V2_CHAT_BODY_SELECTOR);
    if (!chatHeader || !chatBody) {
        showNotificationV2("Elementos do chat (V2) não encontrados.", true);
        return;
    }
    const clientChatTexts = extractClientChatAfterAssignment(chatBody);
    const suggestedTemplate = findSuggestedTemplateV2(clientChatTexts);
    const { firstName, phoneNumber } = extractDataFromHeader(chatHeader);
    const osBaseText = `${phoneNumber || ''} ${firstName || ''} | E A OCORRENCIA: `.trim();
    const osOnlyTemplates = osTemplates.filter(t => t.category !== 'quick_reply');
    const templatesByCategory = osOnlyTemplates.reduce((acc, template) => {
        const category = template.category || 'Outros';
        if (!acc[category]) acc[category] = [];
        acc[category].push(template);
        return acc;
    }, {});
    let modelsHTML = '';
    for (const category in templatesByCategory) {
        modelsHTML += `<h4 style="margin-top: 15px; margin-bottom: 5px;">${category.toUpperCase()}</h4>`;
        modelsHTML += templatesByCategory[category].map(t => `<button class="template-btn" data-template-text="${t.text}">${t.title}</button>`).join('');
    }
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'osModalV2';
    modalBackdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background-color: #333; color: #fff; padding: 20px; border-radius: 8px; width: 600px; max-width: 90%;';
    const suggestionHTML = suggestedTemplate ? `<div><strong>Sugestão:</strong><button class="template-btn" data-template-text="${suggestedTemplate.text}">${suggestedTemplate.title}</button></div>` : '';
    modalContent.innerHTML = `<h3>CRIAR ORDEM DE SERVIÇO</h3> ${suggestionHTML} <div><label>DESCRIÇÃO:</label><textarea id="osTextAreaV2" style="width: 98%; height: 150px; background-color: #222; color:#fff; border: 1px solid #555; padding: 5px; text-transform: uppercase;"></textarea></div><div><strong>TODOS OS MODELOS:</strong>${modelsHTML}</div><div><button id="copyOsBtnV2">COPIAR O.S.</button><button id="cancelOsBtnV2">CANCELAR</button></div>`;
    modalBackdrop.appendChild(modalContent);
    document.body.appendChild(modalBackdrop);
    const osTextArea = document.getElementById('osTextAreaV2');
    osTextArea.value = processDynamicPlaceholders(osBaseText).toUpperCase();
    osTextArea.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
    modalContent.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const templateText = btn.getAttribute('data-template-text');
            const fullText = osBaseText + " " + templateText;
            osTextArea.value = processDynamicPlaceholders(fullText).toUpperCase();
        });
    });
    document.getElementById('copyOsBtnV2').onclick = () => { navigator.clipboard.writeText(osTextArea.value); showNotificationV2("O.S. Copiada!"); modalBackdrop.remove(); };
    document.getElementById('cancelOsBtnV2').onclick = () => modalBackdrop.remove();
}

function copyContactInfoV2() {
    const header = document.querySelector(V2_CHAT_HEADER_SELECTOR);
    if (!header) {
        showNotificationV2("Cabeçalho do chat (V2) não encontrado!", true);
        return;
    }
    const { firstName, phoneNumber } = extractDataFromHeader(header);
    if (phoneNumber || firstName) {
        const result = `${phoneNumber || ''} ${firstName || ''} |`.trim();
        navigator.clipboard.writeText(result).then(() => showNotificationV2(`Contato copiado: ${result}`)).catch(() => showNotificationV2("Erro ao copiar!", true));
    } else {
        showNotificationV2("Não foi possível extrair nome ou telefone.", true);
    }
}

function copyCPFFromChatV2() {
    const chatBody = document.querySelector(V2_CHAT_BODY_SELECTOR);
    if (!chatBody) {
        showNotificationV2("Corpo do chat (V2) não encontrado!", true);
        return;
    }
    const allMessageTexts = collectTextFromMessages(chatBody);
    const foundCPF = findCPF(allMessageTexts);
    if (foundCPF) {
        navigator.clipboard.writeText(foundCPF).then(() => showNotificationV2(`CPF/CNPJ copiado: ${foundCPF}`)).catch(() => showNotificationV2("Erro ao copiar!", true));
    } else {
        showNotificationV2("Nenhum CPF/CNPJ encontrado no chat.", true);
    }
}

function initializeActionsV2() {
    if (document.getElementById('actionsContainerV2')) return;
    const container = document.createElement("div");
    container.id = "actionsContainerV2";
    container.style.cssText = "position: absolute; z-index: 9999; display: flex; gap: 10px; bottom: 10px; left: 20px;";
    const copyContactBtn = document.createElement("button");
    copyContactBtn.textContent = "Copiar Contato";
    copyContactBtn.style.cssText = "padding: 8px 12px; background-color: #007bff; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;";
    copyContactBtn.onclick = copyContactInfoV2;
    container.appendChild(copyContactBtn);
    const copyCpfBtn = document.createElement("button");
    copyCpfBtn.textContent = "Copiar CPF";
    copyCpfBtn.style.cssText = "padding: 8px 12px; background-color: #17a2b8; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;";
    copyCpfBtn.onclick = copyCPFFromChatV2;
    container.appendChild(copyCpfBtn);
    const osButton = document.createElement("button");
    osButton.textContent = "Criar O.S.";
    osButton.style.cssText = "padding: 8px 12px; background-color: #6f42c1; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;";
    osButton.onclick = showOSModalV2;
    container.appendChild(osButton);
    const targetElement = document.querySelector(V2_SIDEBAR_SELECTOR);
    if (targetElement) {
        targetElement.style.position = 'relative';
        targetElement.appendChild(container);
    }
}

// ===================================================================================
// NOVA LÓGICA DE INICIALIZAÇÃO PERSISTENTE (O "VIGIA")
// ===================================================================================

/**
 * Função principal que verifica se os elementos existem e desenha os botões.
 * É "idempotente", ou seja, pode ser chamada várias vezes sem criar duplicatas.
 */
function runV2Features() {
    // Tenta criar os botões de ação (Copiar Contato, etc.)
    if (document.querySelector(V2_SIDEBAR_SELECTOR) && !document.getElementById('actionsContainerV2')) {
        initializeActionsV2();
    }

    // Tenta criar os botões de resposta rápida
    if (document.querySelector(V2_TEXTAREA_SELECTOR) && !document.getElementById('atiQuickRepliesContainerV2')) {
        createQuickReplyButtonsV2();
    }
}

/**
 * Inicia o "vigia" que monitora a página por mudanças.
 */
function initializeV2Observer() {
    const observer = new MutationObserver((mutationsList) => {
        // Para qualquer mudança na página, tentamos rodar nossas funções de novo
        runV2Features();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    console.log("ATI Extensão (V2): 'Vigia' persistente iniciado.");
}

(async function() {
    await loadTemplatesV2(); // Carrega os templates uma vez
    runV2Features(); // Tenta rodar uma vez no carregamento inicial
    initializeV2Observer(); // Inicia o "vigia" para qualquer mudança futura
})();