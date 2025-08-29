// v2.js - Versão FINAL e ROBUSTA, adaptada para a nova estrutura do Chatmix V2

console.log("ATI Extensão: Script V2 (Final) carregado!");

// --- Seletores de DOM ATUALIZADOS para a nova estrutura da V2 ---
const V2_SIDEBAR_SELECTOR = 'div[data-v-2983523e].chat_sidebar';
const V2_CHAT_HEADER_SELECTOR = 'div[data-v-6cea75da].chat_content header';
const V2_CHAT_BODY_SELECTOR = 'div#attendanceMessages';
const V2_TEXTAREA_SELECTOR = 'textarea.chat_textarea';
const V2_QUICK_REPLY_INJECTION_POINT_SELECTOR = 'div.flex.mx-auto';

let osTemplates = [];

// --- Funções de Lógica Central (já existentes, sem alterações) ---

async function loadTemplatesV2() {
    osTemplates = await loadTemplatesFromStorage(); // Função do seu logic.js
}

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

// --- Funções "Detetive" e de Extração de Dados (com seletores corrigidos) ---

function findActiveChatHeaderV2() {
    return document.querySelector(V2_CHAT_HEADER_SELECTOR);
}

function findActiveChatBodyV2() {
    return document.querySelector(V2_CHAT_BODY_SELECTOR);
}

function extractDataFromHeaderV2(headerElement) {
    if (!headerElement) return { firstName: "", phoneNumber: "" };
    const nameElement = headerElement.querySelector('h2.text-base');
    const phoneElement = headerElement.querySelector('span.text-sm');
    const firstName = nameElement ? (nameElement.textContent || "").trim().split(' ')[0].toUpperCase() : "";
    let phoneNumber = phoneElement ? (phoneElement.textContent || "").replace(/\D/g, '') : "";
    return { firstName, phoneNumber };
}

function collectTextFromMessagesV2(chatBody) {
    const texts = [];
    if (!chatBody) return texts;
    chatBody.querySelectorAll('p.mensagem').forEach(p => texts.push(p.textContent.trim()));
    return texts;
}

// --- Lógica das Respostas Rápidas (já existente, sem alterações) ---
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

// --- Funções de Ação dos Botões (Funcionais) ---
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
    // Sua lógica de modal (que já está correta) vai aqui
    // Exemplo simplificado para garantir que o clique funciona
    const header = findActiveChatHeaderV2();
    if (!header) return showNotification("Abra um chat para criar O.S.", true);
    showNotification("Função 'Criar O.S.' chamada com sucesso!");
    // Cole aqui sua lógica completa de criação de modal que já funcionava
}

// --- Funções de Injeção de UI (Reescritas) ---

function injectUIElements() {
    // 1. Injeta o contêiner de botões de ação
    const sidebar = document.querySelector(V2_SIDEBAR_SELECTOR);
    if (sidebar && !document.getElementById('actionsContainerV2')) {
        console.log("ATI Extensão: Injetando botões de ação na V2...");
        const container = document.createElement("div");
        container.id = "actionsContainerV2";
        // Estilos serão aplicados pelo seu injected.css
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

    // 2. Injeta o contêiner de respostas rápidas
    const textarea = document.querySelector(V2_TEXTAREA_SELECTOR);
    if (textarea && !document.getElementById('atiQuickRepliesContainerV2')) {
        console.log("ATI Extensão: Injetando respostas rápidas na V2...");
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

// O "Vigia" que monitora a página por mudanças e injeta a UI quando os elementos certos aparecem
const observer = new MutationObserver((mutations) => {
    // Não precisa verificar se já inicializou, pois as funções de injeção já fazem isso
    injectUIElements();
});

(async function main() {
    await loadTemplatesV2(); // Carrega os dados da sua base
    injectCSS('injected.css'); // Injeta seus estilos
    
    // Tenta injetar uma vez, caso a página já esteja pronta
    injectUIElements(); 
    
    // Inicia o "vigia" para garantir que a UI apareça mesmo com carregamento dinâmico
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();