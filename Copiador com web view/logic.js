// logic.js - Funções para extração e processamento de dados da página.

async function loadTemplatesFromStorage() {
    return new Promise((resolve) => {
        // 1. Descobre qual atendente está salvo no armazenamento da extensão.
        chrome.storage.local.get('atendenteAtual', async ({ atendenteAtual }) => {
            if (!atendenteAtual) {
                console.log("[Extensão ATI] Nenhum atendente definido. Use o site-painel para fazer login.");
                resolve([]); // Resolve com array vazio se ninguém estiver logado.
                return;
            }

            console.log(`[Extensão ATI] Tentando carregar modelos para: ${atendenteAtual}`);
            try {
                // 2. Busca os dados do Firebase para esse atendente específico.
                const firebaseTemplates = await fetchTemplatesFromFirebase(atendenteAtual);

                // 3. Salva os dados mais recentes no cache local da extensão.
                await chrome.storage.local.set({ cachedOsTemplates: firebaseTemplates });
                console.log(`[Extensão ATI] ${firebaseTemplates.length} modelos de '${atendenteAtual}' carregados do Firebase.`);
                resolve(firebaseTemplates);

            } catch (error) {
                console.error("[Extensão ATI] Falha ao carregar do Firebase. Tentando usar o cache local.", error);
                
                // 4. Se o Firebase falhar, tenta usar o último cache salvo.
                chrome.storage.local.get('cachedOsTemplates', (cache) => {
                    if (cache.cachedOsTemplates) {
                        console.log("[Extensão ATI] Modelos carregados do cache como fallback.");
                        resolve(cache.cachedOsTemplates);
                    } else {
                        console.error("[Extensão ATI] Cache também está vazio. Nenhum modelo carregado.");
                        resolve([]);
                    }
                });
            }
        });
    });
}
function findActiveAttendanceElement() {
    const allAttendanceDivs = document.querySelectorAll('section.chat .attendance');
    for (const attendance of allAttendanceDivs) {
        const style = window.getComputedStyle(attendance);
        if (style.display !== 'none' && style.visibility !== 'hidden' && attendance.offsetHeight > 0) {
            return attendance;
        }
    }
    return null;
}

function findActiveChatHeader() {
    const activeAttendance = findActiveAttendanceElement();
    return activeAttendance ? activeAttendance.querySelector('header') : null;
}

function findActiveChatBody() {
    const activeAttendance = findActiveAttendanceElement();
    return activeAttendance ? activeAttendance.querySelector('.messages') : null;
}

function processDynamicPlaceholders(text) {
    if (typeof text !== 'string') return '';
    const now = new Date();
    const hour = now.getHours();
    let saudacao = '';
    let despedida = '';
    if (hour >= 5 && hour < 12) {
        saudacao = 'Bom dia';
        despedida = 'tenha uma excelente manhã';
    } else if (hour >= 12 && hour < 18) {
        saudacao = 'Boa tarde';
        despedida = 'tenha uma excelente tarde';
    } else {
        saudacao = 'Boa noite';
        despedida = 'tenha uma excelente noite';
    }
    let processedText = text.replace(/\[SAUDACAO\]/gi, saudacao);
    processedText = processedText.replace(/\[DESPEDIDA\]/gi, despedida);
    return processedText;
}

function isVisible(element) {
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    element.getBoundingClientRect().height > 0
  );
}

function collectTextFromMessages(rootElement) {
    const texts = [];
    if (!rootElement) return texts;
    
    // Seletor que funciona tanto na V1 (.item) quanto na V2 (div com ID message-)
    const messageItems = rootElement.querySelectorAll('.item, div[id^="message-"]');
    
    messageItems.forEach(item => {
        if (isVisible(item)) {
            // Na V2, o texto está em um parágrafo <p> com a classe .break-words
            // Na V1, o texto está em um parágrafo <p> com a classe .mensagem
            // Este seletor procura por ambos. Se não encontrar, pega o texto geral do item.
            const messageTextElement = item.querySelector('p.break-words, p.mensagem');
            if (messageTextElement) {
                texts.push(messageTextElement.textContent || "");
            } else {
                texts.push(item.textContent || "");
            }
        }
    });
    return texts;
}
function extractDataFromHeader(headerElement) {
    let firstName = "";
    let phoneNumber = "";
    if (headerElement) {
        let nameElement = headerElement.querySelector('.client_name');
        let phoneElement = headerElement.querySelector('.client_user');
        if (!nameElement) nameElement = headerElement.querySelector('h2.font-medium');
        if (!phoneElement) phoneElement = headerElement.querySelector('span.font-medium');
        if (nameElement) firstName = (nameElement.textContent || "").trim().split(' ')[0].toUpperCase();
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
            }
        }
    }
    return { firstName, phoneNumber };
}

function isValidCPF(cpf) {
    if (typeof cpf !== 'string') return false;
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    return true;
}

function isValidCNPJ(cnpj) {
    if (typeof cnpj !== 'string') return false;
    cnpj = cnpj.replace(/[^\d]/g, '');
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += numbers.charAt(length - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result != digits.charAt(0)) return false;
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += numbers.charAt(length - i) * pos--;
        if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result != digits.charAt(1)) return false;
    return true;
}

function findCPF(allTexts) {
    const cpfCnpjRegex = /\b(\d{11}|\d{14})\b/g;
    const validMatches = [];
    const blacklist = ['código de barras', 'boleto', 'fatura', 'pix', 'linha digitável'];
    for (const text of allTexts) {
        if (blacklist.some(keyword => text.toLowerCase().includes(keyword))) continue;
        const cleanText = text.replace(/[.\-\/]/g, "");
        const potentialMatches = cleanText.match(cpfCnpjRegex);
        if (potentialMatches) {
            for (const match of potentialMatches) {
                if (match.length === 11 && isValidCPF(match)) validMatches.push(match);
                else if (match.length === 14 && isValidCNPJ(match)) validMatches.push(match);
            }
        }
    }
    return validMatches.length > 0 ? validMatches[validMatches.length - 1] : null;
}

function extractClientChatAfterAssignment(chatContainerElement) {
    const assignmentKeyword = "atendimento atribuído ao atendente";
    let assignmentMessageFound = false;
    const clientTexts = [];
    if (!chatContainerElement) return [];
    const allMessageItems = Array.from(chatContainerElement.querySelectorAll('.item'));
    for (const item of allMessageItems) {
        const itemText = item.textContent.toLowerCase();
        if (!assignmentMessageFound && itemText.includes(assignmentKeyword)) {
            assignmentMessageFound = true;
            continue;
        }
        if (assignmentMessageFound) {
            if (!item.classList.contains('sent')) {
                clientTexts.push(item.textContent.trim());
            }
        }
    }
    return clientTexts;
}