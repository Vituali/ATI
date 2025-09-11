// sgp.js - Versão com 3 fluxos: Padrão, Comprovante e Promessa (v8)

// --- CONFIGURAÇÃO DOS ATENDENTES ---

const ATTENDANTS = {
    'VICTORH': '99',
    'LUCASJ': '100',
    
};
// ------------------------------------

/**
 * Função auxiliar para criar uma pausa.
 * @param {number} ms - Tempo em milissegundos para esperar.
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Função auxiliar para formatar a data e hora atuais no padrão DD/MM/AAAA HH:mm:ss.
 */
function getCurrentFormattedDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Função de preenchimento que usa dispatchEvent nativo.
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
                resolve();
            }
        }, delay);
    });
};

/**
 * Função principal que lê os dados e preenche o formulário.
 */
async function fillSgpForm() {
    try {

        const clipboardText = await navigator.clipboard.readText();
        const upperCaseText = clipboardText.toUpperCase();

        // --- 1. PREENCHIMENTO DE CAMPOS COMUNS A TODOS OS FLUXOS ---

        // Define o responsável (usuário logado)
        const selectedAttendant = localStorage.getItem('sgp_selected_attendant');
        if (selectedAttendant) {
            await setValueWithDelay('#id_responsavel', selectedAttendant, 100);
        }

        // Filtra as opções para encontrar contratos que não estão "Cancelados"
        const validContracts = $('#id_clientecontrato option').filter(function() {
            // A opção deve ter um valor e o texto não pode incluir 'Cancelado'
            return $(this).val() !== '' && !$(this).text().toUpperCase().includes('CANCELADO');
        });

        // Decide o que fazer com base no número de contratos válidos encontrados
        if (validContracts.length > 1) {
            // Se houver mais de um contrato válido, avisa o usuário para selecionar
            alert('[Extensão ATI] Existem múltiplos contratos ativos. Por favor, selecione o contrato correto manualmente.');
        
        } else if (validContracts.length === 1) {
            // Se houver exatamente um contrato válido, seleciona-o
            const contractId = validContracts.val();
            await setValueWithDelay('#id_clientecontrato', contractId, 100);
        }
        // Se validContracts.length for 0, nenhum contrato será selecionado.

        // Define os valores fixos para todos os atendimentos
        await setValueWithDelay('#id_setor', '2', 100);     // Suporte
        await setValueWithDelay('#id_metodo', '3', 100);    // Suporte Online
        await setValueWithDelay('#id_status', '1', 100);    // Encerrada

        // Preenche conteúdo e data
        $('#id_conteudo').val(clipboardText); // Pode usar o texto original ou upperCaseText
        $('#id_data_agendamento').val(getCurrentFormattedDateTime());
        
        // Garante que a O.S. esteja sempre desmarcada
        $('#id_os').prop('checked', false);

        // --- 2. TRATAMENTO DOS CASOS ESPECIAIS ---

        // Pausa estratégica APÓS definir o setor, caso o campo "tipo" dependa dele
        await wait(200); 

        const isComprovante = upperCaseText.includes('ENVIO DE COMPROVANTE');
        const isPromessa = upperCaseText.includes('PROMESSA DE PAGAMENTO');
        const isLentidao = upperCaseText.includes('CLIENTE RELATA LENTIDÃO');

        let tipoOcorrencia = ''; // Por padrão, o tipo fica vazio

        if (isComprovante) {
            tipoOcorrencia = '42'; // Financeiro- Comunicação de pagamento
        }

        else if (isPromessa) {
            tipoOcorrencia = '41'; // Financeiro - Promessa de pagamento
        }
        
        else if (isLentidao) {
            tipoOcorrencia = '3'; // Suporte - Acesso lento
        }
        // Se um tipo foi definido, preenche o campo
        if (tipoOcorrencia) {
            await setValueWithDelay('#id_tipo', tipoOcorrencia, 100);
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