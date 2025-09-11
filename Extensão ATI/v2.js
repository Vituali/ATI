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
    // Seleciona todas as mensagens e pega o texto de cada uma
    chatBody.querySelectorAll('p.mensagem').forEach(p => {
        texts.push(p.textContent.trim());
    });
    return texts;
}

function extractAndFormatConversationV2(chatBody) {
    if (!chatBody) return "";

    const allMessages = Array.from(chatBody.querySelectorAll('p.mensagem'));
    const assignmentKeyword = "atendimento atribuído ao atendente";
    let conversationStarted = false;
    const relevantTexts = [];

    for (const message of allMessages) {
        const text = message.textContent.trim();
        const lowerCaseText = text.toLowerCase();

        // Procura pelo marco zero da conversa
        if (lowerCaseText.includes(assignmentKeyword)) {
            conversationStarted = true;
            continue; // Pula para a próxima mensagem
        }

        // Se a conversa humana já começou, captura a mensagem
        if (conversationStarted) {
            // Verifica se a mensagem é do próprio atendente
            if (lowerCaseText.startsWith("victor disse:")) {
                 // Remove o "VICTOR disse:" e adiciona um marcador claro
                relevantTexts.push(`VICTOR: ${text.substring(13).trim()}`);
            } else {
                // Se não for do atendente, assume que é do cliente
                relevantTexts.push(`CLIENTE: ${text}`);
            }
        }
    }
    
    // Se, por algum motivo, não encontrar a atribuição, retorna as últimas 10 mensagens como fallback
    if (!conversationStarted) {
        return allMessages.slice(-10).map(m => m.textContent.trim()).join('\n');
    }

    return relevantTexts.join('\n');
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
            <button class="action-btn action-btn--os">Criar O.S.</button>
            <button class="action-btn action-btn--ai">🤖 Copiar Prompt IA</button>
        `;
        container.querySelector('.action-btn--contact').onclick = copyContactInfoV2;
        container.querySelector('.action-btn--cpf').onclick = copyCPFFromChatV2;
        container.querySelector('.action-btn--os').onclick = showOSModalV2;
        container.querySelector('.action-btn--ai').onclick = handleCopyPromptClick;
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

async function handleCopyPromptClick() {
    showNotification("🤖 Copiando prompt filtrado...");

    const chatBody = findActiveChatBodyV2();
    if (!chatBody) return showNotification("Nenhum chat ativo para copiar.", true);
    
    // --- MUDANÇA PRINCIPAL AQUI ---
    // Chamamos a nova função que filtra a automação
    const customerText = extractAndFormatConversationV2(chatBody);
    // --- FIM DA MUDANÇA ---

    if (!customerText) return showNotification("Não há mensagens de cliente para analisar.", true);
    
    const companyProceduresContext = `
- Para problemas de conexão, primeiro entenda a situação e depois siga as etapas de diagnóstico. Somente como último caso, acione uma equipe técnica.
- O horário do suporte é de Seg a Sab de 08:00 as 21:00 e Dom/Feriados de 09:00 as 21:00.
- Os planos de internet são: 600 MEGA, 800 MEGA e 920 MEGA.

- Etapas de Diagnóstico Obrigatórias (siga na ordem):
1. Verificar se o cliente já reiniciou o modem/roteador. **Se não, peça para fazer.**
2. Testar a conexão via cabo. **Pergunte ao cliente se é possível testar com um cabo de rede.**
3. Realizar o teste de velocidade. **Peça ao cliente para acessar speedtest.net e informar os resultados de download e upload.**
4. Confirmar o número de dispositivos conectados. **Pergunte quantos aparelhos estão usando a internet no momento.**

- Somente se todos os passos acima não resolverem, ofereça o acionamento da equipe técnica com prazo de até 48h.
`;

    const prompt = `
Você é um atendente de suporte da empresa 'ATI Internet'. Seu nome é Victor.
Sua resposta deve ser profissional, amigável e resolver o problema do cliente.

---
REGRAS IMPORTANTES:
1. Gere respostas CURTAS e DIRETAS, ideais para um chat.
2. Se uma explicação for longa, divida-a em 2 mensagens curtas e sequenciais.
3. Siga estritamente os procedimentos e informações da empresa listados abaixo.
---
PROCEDIMENTOS E INFORMAÇÕES DA EMPRESA:
${companyProceduresContext}
---
CONVERSA COM O CLIENTE:
${customerText}
---

Sugira a resposta ideal seguindo TODAS as regras:
    `;

    try {
        await navigator.clipboard.writeText(prompt.trim());
        showNotification("✅ Prompt para IA copiado!", false);
    } catch (error) {
        console.error("Erro ao copiar o prompt:", error);
        showNotification("Falha ao copiar o prompt.", true);
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