// sgp.js - Versão final com seletor de atendente e preenchimento estável

// --- CONFIGURAÇÃO DOS ATENDENTES ---
// Adicione ou remova atendentes aqui. O 'valor' deve ser o código do SGP.
const ATTENDANTS = {
    'VICTORH': '99',
    'LUCASJ': '100',
    // Adicione mais atendentes se precisar, no formato: 'NOME': 'CODIGO'
};
// ------------------------------------

/**
 * Função auxiliar robusta para definir o valor de um campo select2 e disparar o evento.
 * @param {string} selector - O seletor jQuery do elemento.
 * @param {string} value - O valor a ser definido.
 * @param {number} delay - O tempo de espera em milissegundos.
 */
const setValueWithDelay = (selector, value, delay) => {
    return new Promise(resolve => {
        setTimeout(() => {
            try {
                const element = $(selector);
                if (element.length > 0) {
                    element.val(value);
                    const event = new Event('change', { bubbles: true });
                    element[0].dispatchEvent(event);
                    console.log(`[Extensão ATI] Campo ${selector} preenchido com valor ${value}.`);
                }
                resolve();
            } catch (error) {
                console.error(`[Extensão ATI] Erro ao preencher o campo ${selector}:`, error);
                resolve(); // Continua mesmo se um campo falhar
            }
        }, delay);
    });
};

/**
 * Função principal que lê os dados da área de transferência e preenche o formulário.
 */
async function fillSgpForm() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        if (!clipboardText.includes(' | ')) {
            alert('O texto na área de transferência não parece ser uma O.S. válida.');
            return;
        }

        console.log('[Extensão ATI] Preenchendo formulário...');
        const osContent = clipboardText;
        $('#id_conteudo').val(osContent.toUpperCase());

        // Usa a função robusta para preencher os campos necessários
        await setValueWithDelay('#id_setor', '2', 100);      // Fixo: Suporte Tecnico
        await setValueWithDelay('#id_metodo', '3', 100);     // Fixo: Suporte Online

        const selectedAttendant = localStorage.getItem('sgp_selected_attendant');
        if (selectedAttendant) {
            await setValueWithDelay('#id_responsavel', selectedAttendant, 100);
        }

        const contratoOptions = $('#id_clientecontrato option');
        if (contratoOptions.length === 2) {
            const contratoValue = $(contratoOptions[1]).val();
            await setValueWithDelay('#id_clientecontrato', contratoValue, 100);
        }
        
        console.log('[Extensão ATI] Preenchimento concluído!');

    } catch (error) {
        console.error('[Extensão ATI] Erro ao preencher formulário SGP:', error);
        alert('Ocorreu um erro ao tentar preencher o formulário.');
    }
}

/**
 * Cria e injeta o seletor de atendente na página.
 */
function injectAttendantSelector() {
    if (document.getElementById('attendant-selector-container')) return;

    const container = document.createElement('div');
    container.id = 'attendant-selector-container';
    container.style.cssText = 'position: absolute; top: 10px; right: 450px; z-index: 9999; display: flex; align-items: center; color: white;';

    const label = document.createElement('label');
    label.innerText = 'Atendente da Extensão:';
    label.style.marginRight = '10px';
    label.style.fontWeight = 'bold';

    const select = document.createElement('select');
    select.id = 'sgp-attendant-selector';
    select.style.padding = '5px';
    select.style.borderRadius = '4px';
    
    Object.keys(ATTENDANTS).forEach(name => {
        const option = document.createElement('option');
        option.value = ATTENDANTS[name];
        option.innerText = name;
        select.appendChild(option);
    });

    const savedAttendant = localStorage.getItem('sgp_selected_attendant');
    if (savedAttendant) {
        select.value = savedAttendant;
    } else {
        // Se nada estiver salvo, salva o primeiro da lista como padrão
        localStorage.setItem('sgp_selected_attendant', select.value);
    }

    select.addEventListener('change', () => {
        localStorage.setItem('sgp_selected_attendant', select.value);
    });

    container.appendChild(label);
    container.appendChild(select);

    document.getElementById('header-right').prepend(container);
}

/**
 * Adiciona o botão de preenchimento automático na página.
 */
function injectSgpButton() {
    if (document.getElementById('fill-from-chatmix-btn')) return;
    
    const submitButton = document.getElementById('btacao');
    if (submitButton) {
        const customButton = document.createElement('input');
        customButton.id = 'fill-from-chatmix-btn';
        customButton.type = 'button';
        customButton.value = 'Preencher com Dados do Chatmix';
        customButton.className = 'button blue';
        customButton.style.marginLeft = '10px';
        customButton.addEventListener('click', fillSgpForm);
        submitButton.parentNode.insertBefore(customButton, submitButton.nextSibling);
    }
}

// Inicia o script
const readyCheckInterval = setInterval(() => {
    if (document.getElementById('btacao') && document.getElementById('header-right')) {
        clearInterval(readyCheckInterval);
        injectSgpButton();
        injectAttendantSelector();
    }
}, 500);