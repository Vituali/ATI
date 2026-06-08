// =================================================================
// CONTENT SCRIPT — SGP
// Injeta o painel flutuante e preenche formulários de ocorrência
// =================================================================

import { injectSgpMenu, handleOpenOS } from './SgpMenu'
import { showToast } from '../chatmix/helpers'

console.log('Extensão ATI: SGP content script carregado.')

// Recupera a sessão do usuário no storage para inicializar o painel flutuante
chrome.storage.local.get(['ati_user_session'], (result) => {
  const session = result.ati_user_session
  if (session) {
    injectSgpMenu()
  }
})

// Função auxiliar para exibir popups modais elegantes no SGP
function showSgpPromptModal(
  title: string,
  text: string,
  confirmText: string,
  cancelText: string,
  onConfirm: () => void
) {
  const overlay = document.createElement('div')
  overlay.className = 'ati-sgp-modal-overlay'
  
  overlay.innerHTML = `
    <div class="ati-sgp-modal-card">
      <div class="ati-sgp-modal-title">${title}</div>
      <div class="ati-sgp-modal-body">${text}</div>
      <div class="ati-sgp-modal-actions">
        <button class="ati-sgp-modal-btn ati-sgp-modal-btn--secondary">${cancelText}</button>
        <button class="ati-sgp-modal-btn ati-sgp-modal-btn--primary">${confirmText}</button>
      </div>
    </div>
  `
  
  document.body.appendChild(overlay)
  
  // Força reflow e exibe com animação suave
  setTimeout(() => overlay.classList.add('show'), 10)
  
  const close = () => {
    overlay.classList.remove('show')
    setTimeout(() => overlay.remove(), 300)
  }
  
  const cancelBtn = overlay.querySelector('.ati-sgp-modal-btn--secondary') as HTMLButtonElement
  const confirmBtn = overlay.querySelector('.ati-sgp-modal-btn--primary') as HTMLButtonElement
  
  cancelBtn.addEventListener('click', close)
  confirmBtn.addEventListener('click', () => {
    close()
    onConfirm()
  })
}

const isOccurrencePage = window.location.pathname.includes('/ocorrencia/add/')
const isPromessaPage = window.location.pathname.includes('/financeiro/promessapagamento/cliente/') && window.location.pathname.includes('/add/')
const isOsAddPage = window.location.pathname.includes('/ordemservico/add/')

function findDateInput(): HTMLInputElement | null {
  return (
    document.querySelector<HTMLInputElement>('input.vDateField') ||
    document.querySelector<HTMLInputElement>('input[name*="vencimento"]') ||
    document.querySelector<HTMLInputElement>('input[name*="data"]') ||
    document.querySelector<HTMLInputElement>('input[id*="vencimento"]') ||
    document.querySelector<HTMLInputElement>('input[id*="data"]') ||
    document.querySelector<HTMLInputElement>('input[type="date"]')
  )
}

// Helper para somar 2 dias úteis
function getComprovanteDate(baseDate: Date = new Date()): Date {
  const resultDate = new Date(baseDate)
  let businessDaysAdded = 0
  while (businessDaysAdded < 2) {
    resultDate.setDate(resultDate.getDate() + 1)
    const dayOfWeek = resultDate.getDay()
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysAdded++
    }
  }
  return resultDate
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function showPaymentPromiseMenuModal(clientId: string, contractId?: string | null) {
  const overlay = document.createElement('div')
  overlay.className = 'ati-sgp-modal-overlay'
  
  const today = new Date()
  const comprovanteDate = getComprovanteDate(today)
  const comprovanteDateStr = formatDate(comprovanteDate)
  const todayIso = today.toISOString().split('T')[0]
  
  overlay.innerHTML = `
    <div class="ati-sgp-modal-card">
      <div class="ati-sgp-modal-title">🤝 Promessa de Pagamento</div>
      <div class="ati-sgp-modal-body">
        Identificamos que você acabou de registrar uma ocorrência de pagamento. Como deseja prosseguir com a liberação temporária?
      </div>
      
      <div class="ati-sgp-option-group">
        <button class="ati-sgp-option-btn" id="ati-btn-comprovante">
          <span class="option-icon">📄</span>
          <div class="option-details">
            <span class="option-title">Liberar por Comprovante</span>
            <span class="option-subtitle">Até 2 dias úteis (${comprovanteDateStr})</span>
          </div>
        </button>
        
        <button class="ati-sgp-option-btn" id="ati-btn-promessa">
          <span class="option-icon">📅</span>
          <div class="option-details">
            <span class="option-title">Liberar por Promessa</span>
            <span class="option-subtitle">Escolher data personalizada</span>
          </div>
        </button>
      </div>
      
      <div class="ati-sgp-date-picker-container" id="ati-date-picker-container" style="display: none;">
        <label for="ati-promessa-date-input">Escolha a data limite:</label>
        <div class="date-input-row">
          <input type="date" id="ati-promessa-date-input" min="${todayIso}">
          <button class="ati-sgp-modal-btn ati-sgp-modal-btn--primary" id="ati-btn-confirm-date">Confirmar</button>
        </div>
      </div>
      
      <div class="ati-sgp-modal-actions">
        <button class="ati-sgp-modal-btn ati-sgp-modal-btn--secondary" id="ati-btn-cancel">Ignorar</button>
      </div>
    </div>
  `
  
  document.body.appendChild(overlay)
  setTimeout(() => overlay.classList.add('show'), 10)
  
  const close = () => {
    overlay.classList.remove('show')
    setTimeout(() => overlay.remove(), 300)
  }
  
  const btnComprovante = overlay.querySelector('#ati-btn-comprovante') as HTMLButtonElement
  const btnPromessa = overlay.querySelector('#ati-btn-promessa') as HTMLButtonElement
  const btnCancel = overlay.querySelector('#ati-btn-cancel') as HTMLButtonElement
  const datePickerContainer = overlay.querySelector('#ati-date-picker-container') as HTMLDivElement
  const dateInput = overlay.querySelector('#ati-promessa-date-input') as HTMLInputElement
  const btnConfirmDate = overlay.querySelector('#ati-btn-confirm-date') as HTMLButtonElement
  
  btnComprovante.addEventListener('click', () => {
    close()
    let promessaUrl = `${window.location.origin}/admin/financeiro/promessapagamento/cliente/${clientId}/add/?ati_promessa_date=${comprovanteDateStr}`
    if (contractId) {
      promessaUrl += `&ati_promessa_contract=${contractId}`
    }
    window.location.href = promessaUrl
  })
  
  btnPromessa.addEventListener('click', () => {
    datePickerContainer.style.display = 'flex'
    dateInput.focus()
  })
  
  btnConfirmDate.addEventListener('click', () => {
    const rawValue = dateInput.value
    if (!rawValue) {
      showToast('⚠️ Selecione uma data antes de prosseguir.', 'error')
      return
    }
    
    const parts = rawValue.split('-')
    if (parts.length === 3) {
      const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`
      close()
      let promessaUrl = `${window.location.origin}/admin/financeiro/promessapagamento/cliente/${clientId}/add/?ati_promessa_date=${formatted}`
      if (contractId) {
        promessaUrl += `&ati_promessa_contract=${contractId}`
      }
      window.location.href = promessaUrl
    }
  })
  
  btnCancel.addEventListener('click', close)
}

;(window as any).showPaymentPromiseMenuModal = showPaymentPromiseMenuModal

// Preenchimento automático da data na página de Promessa de Pagamento
if (isPromessaPage) {
  try {
    const params = new URLSearchParams(window.location.search)
    const promessaDate = params.get('ati_promessa_date')
    if (promessaDate) {
      const waitAndFillDate = (attempts: number) => {
        const input = findDateInput()
        if (input) {
          if (input.type === 'date') {
            const parts = promessaDate.split('/')
            if (parts.length === 3) {
              input.value = `${parts[2]}-${parts[1]}-${parts[0]}`
            } else {
              input.value = promessaDate
            }
          } else {
            input.value = promessaDate
          }
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
          if ((window as any).jQuery) {
            (window as any).jQuery(input).trigger('change')
          }
          showToast('📅 Data da promessa preenchida automaticamente!', 'success')
        } else if (attempts < 30) {
          setTimeout(() => waitAndFillDate(attempts + 1), 300)
        }
      }
      waitAndFillDate(0)
    }

    const promessaContract = params.get('ati_promessa_contract')
    if (promessaContract) {
      const waitAndFillContract = (attempts: number) => {
        const select = document.querySelector('#id_cobranca') as HTMLSelectElement | null
        if (select) {
          let foundValue: string | null = null
          
          // 1. Tenta correspondência direta pelo valor da option
          for (let i = 0; i < select.options.length; i++) {
            const opt = select.options[i]
            if (opt.value === promessaContract) {
              foundValue = opt.value
              break
            }
          }
          
          // 2. Tenta encontrar pelo texto (ex: "Contrato: 16036")
          if (!foundValue) {
            for (let i = 0; i < select.options.length; i++) {
              const opt = select.options[i]
              const text = opt.textContent || ''
              if (text.includes(`Contrato: ${promessaContract}`) || text.includes(`Contrato:${promessaContract}`)) {
                foundValue = opt.value
                break
              }
            }
          }
          
          // 3. Tenta correspondência flexível (ex: o número do contrato está no texto)
          if (!foundValue) {
            for (let i = 0; i < select.options.length; i++) {
              const opt = select.options[i]
              const text = opt.textContent || ''
              const match = text.match(/\b\d+\b/g)
              if (match && match.includes(promessaContract)) {
                foundValue = opt.value
                break
              }
            }
          }
          
          if (foundValue) {
            select.value = foundValue
            select.dispatchEvent(new Event('input', { bubbles: true }))
            select.dispatchEvent(new Event('change', { bubbles: true }))
            if ((window as any).jQuery) {
              (window as any).jQuery(select).trigger('change')
            }
            showToast('📄 Contrato preenchido automaticamente!', 'success')
          } else {
            console.warn(`Extensão ATI: Contrato ${promessaContract} não encontrado no select.`)
          }
        } else if (attempts < 30) {
          setTimeout(() => waitAndFillContract(attempts + 1), 300)
        }
      }
      waitAndFillContract(0)
    }
  } catch (err) {
    console.error('Erro ao preencher dados da promessa:', err)
  }
}

// Verificação pós-redirecionamento de cadastro de ocorrência
if (!isOccurrencePage && !isPromessaPage && !isOsAddPage) {
  try {
    const pendingClientId = sessionStorage.getItem('ati_just_submitted_payment_occurrence')
    const pendingTimestampStr = sessionStorage.getItem('ati_just_submitted_payment_timestamp')
    const pendingContractId = sessionStorage.getItem('ati_just_submitted_payment_contract')
    
    if (pendingClientId && pendingTimestampStr) {
      const pendingTimestamp = parseInt(pendingTimestampStr, 10)
      const now = Date.now()
      
      // Validade de 3 minutos para a ação (dando tempo caso passe por página de O.S. ou redirecionamentos)
      if (now - pendingTimestamp < 180000) {
        let hasSuccessMessage = false
        const msgContainer = document.querySelector('.messagelist, .messagelist2, .alert-success, .alert, .messages, .message')
        if (msgContainer) {
          const containerText = msgContainer.textContent?.toLowerCase() || ''
          hasSuccessMessage = !!(
            msgContainer.querySelector('.success') ||
            containerText.includes('sucesso') ||
            containerText.includes('cadastrad') ||
            containerText.includes('adicionad') ||
            containerText.includes('salv')
          )
        } else {
          // Fallback mais leve limitando a busca ao container principal de conteúdo
          const contentEl = document.querySelector('#content, #content-main, #container')
          if (contentEl) {
            const contentText = contentEl.textContent?.toLowerCase() || ''
            hasSuccessMessage = (
              contentText.includes('sucesso') ||
              contentText.includes('cadastrada') ||
              contentText.includes('cadastrado') ||
              contentText.includes('adicionada') ||
              contentText.includes('adicionado') ||
              contentText.includes('salvo') ||
              contentText.includes('salva')
            )
          }
        }
        
        if (hasSuccessMessage) {
          sessionStorage.removeItem('ati_just_submitted_payment_occurrence')
          sessionStorage.removeItem('ati_just_submitted_payment_timestamp')
          sessionStorage.removeItem('ati_just_submitted_payment_contract')
          
          // Abre o novo menu de opções de Promessa de Pagamento se não estiver desativado
          chrome.storage.local.get('hideSgpPromisePrompt', (result) => {
            if (!result.hideSgpPromisePrompt) {
              showPaymentPromiseMenuModal(pendingClientId, pendingContractId)
            }
          })
        } else {
          // Se não há mensagem de sucesso na página, limpa para não ficar pendente
          sessionStorage.removeItem('ati_just_submitted_payment_occurrence')
          sessionStorage.removeItem('ati_just_submitted_payment_timestamp')
          sessionStorage.removeItem('ati_just_submitted_payment_contract')
        }
      } else {
        sessionStorage.removeItem('ati_just_submitted_payment_occurrence')
        sessionStorage.removeItem('ati_just_submitted_payment_timestamp')
        sessionStorage.removeItem('ati_just_submitted_payment_contract')
      }
    }
  } catch (err) {
    console.error('Erro ao verificar redirecionamento pós ocorrência:', err)
  }
}

if (isOccurrencePage) {
  // Escuta o submit do formulário para detectar ocorrências de pagamento
  document.addEventListener('submit', () => {
    try {
      const typeSelect = document.querySelector('#id_tipo') as HTMLSelectElement | null
      const select2Container = document.querySelector('#select2-id_tipo-container')
      
      let optionText = ''
      if (typeSelect && typeSelect.selectedIndex >= 0) {
        const selectedOption = typeSelect.options[typeSelect.selectedIndex]
        optionText = selectedOption ? selectedOption.textContent || '' : ''
      }
      
      if (!optionText && select2Container) {
        optionText = select2Container.getAttribute('title') || select2Container.textContent || ''
      }
      
      const lowerText = optionText.toLowerCase().trim()
      
      if (
        lowerText.includes('comunicação') ||
        lowerText.includes('comunicacao') ||
        lowerText.includes('promessa') ||
        lowerText.includes('acordo')
      ) {
        const urlMatch = window.location.pathname.match(/\/cliente\/(\d+)/)
        const clientId = urlMatch ? urlMatch[1] : null
        if (clientId) {
          sessionStorage.setItem('ati_just_submitted_payment_occurrence', clientId)
          sessionStorage.setItem('ati_just_submitted_payment_timestamp', Date.now().toString())
          
          // Salva também o contrato se selecionado
          const contractSelect = document.querySelector('#id_clientecontrato, #id_cobranca') as HTMLSelectElement | null
          if (contractSelect && contractSelect.value) {
            sessionStorage.setItem('ati_just_submitted_payment_contract', contractSelect.value)
          }
        }
      }
    } catch (err) {
      console.error('Erro ao monitorar tipo de ocorrência:', err)
    }
  })

  const requestId = new URLSearchParams(window.location.search).get('ati_req_id')
  const storageKey = requestId ? `pendingSgpData_${requestId}` : 'pendingSgpData'

  chrome.storage.local.get([storageKey, 'ati_user_session', 'hideSgpOsPrompt'], (result) => {
    const data = result[storageKey]
    const session = result.ati_user_session
    const username = (session?.sgpUsername ?? session?.username)?.toLowerCase() ?? ''
    const hideOsPrompt = !!result.hideSgpOsPrompt

    if (!data) {
      console.log('Extensão ATI: Sem dados pendentes para esta requisição.')
      // Sugerir usar o O.S. (Auxiliar) via Popup Modal se não estiver oculto
      if (!hideOsPrompt) {
        showSgpPromptModal(
          '📋 O.S. (Auxiliar)',
          'Você está na tela de adicionar ocorrência. Deseja utilizar o auxiliador de O.S. para selecionar templates e preencher os dados automaticamente?',
          'Sim, abrir auxiliador',
          'Não, preencher manualmente',
          () => {
            handleOpenOS()
          }
        )
      }
      return
    }

    console.log(`Extensão ATI: Dados pendentes encontrados (${storageKey}), carregando sgpFill.js...`)
    chrome.storage.local.remove(storageKey)

    // Injeta o script externo primeiro
    const script = document.createElement('script')
    script.src = chrome.runtime.getURL('src/contentScript/sgp/sgpFill.js')

    // Quando carregar, envia os dados via postMessage
    script.onload = () => {
      window.postMessage(
        {
          type: 'ATI_SGP_FILL',
          data,
          username,
          fullname: session?.nomeCompleto?.toLowerCase() ?? '',
        },
        window.location.origin,
      )
      script.remove()
    }

    document.documentElement.appendChild(script)
  })
}

// =================================================================
// NOVO: Coletor de Potências Ópticas (Varredura de Rede)
// =================================================================
const isOpticalListPage = window.location.pathname.includes('/network/onu/optical/list/')

if (isOpticalListPage) {
  const injectFloatingButton = async () => {
    const table = document.querySelector('table.tablelist')
    if (!table) return

    if (document.getElementById('ati-btn-enviar-sinais')) return

    // Recupera a sessão do usuário para verificar se é admin
    const sessionResult: any = await new Promise((resolve) => {
      chrome.storage.local.get(['ati_user_session'], resolve);
    });
    const session = sessionResult?.ati_user_session;
    if (!session || session.role !== 'admin') {
      console.log('Extensão ATI: Botão de Enviar Sinais ocultado (requer privilégio de administrador).');
      return;
    }

    const btn = document.createElement('button')
    btn.id = 'ati-btn-enviar-sinais'
    btn.style.position = 'fixed'
    btn.style.bottom = '80px'
    btn.style.right = '20px'
    btn.style.zIndex = '99999'
    btn.style.background = 'linear-gradient(135deg, #0064ff 0%, #00d2ff 100%)'
    btn.style.color = '#fff'
    btn.style.border = 'none'
    btn.style.padding = '12px 20px'
    btn.style.borderRadius = '10px'
    btn.style.fontWeight = 'bold'
    btn.style.cursor = 'pointer'
    btn.style.boxShadow = '0 4px 15px rgba(0, 100, 255, 0.4)'
    btn.style.transition = 'all 0.2s ease'
    btn.innerText = '📊 Enviar Sinais ao Painel ATI'

    btn.onmouseover = () => {
      btn.style.transform = 'scale(1.05)'
    }
    btn.onmouseout = () => {
      btn.style.transform = 'scale(1)'
    }

    btn.onclick = async () => {
      btn.disabled = true
      btn.innerText = '⏳ Enviando...'
      
      try {
        const headers: string[] = []
        table.querySelectorAll('thead th').forEach((th) => {
          headers.push(th.textContent?.trim().toLowerCase() || '')
        })

        const getColIndex = (name: string) => headers.findIndex(h => h.includes(name))

        const idxOlt = getColIndex("olt")
        const idxPon = getColIndex("pon") !== -1 ? getColIndex("pon") : getColIndex("slot")
        const idxVlan = getColIndex("vlan")
        const idxId = getColIndex("id") !== -1 ? getColIndex("id") : getColIndex("contrato")
        const idxRx = getColIndex("rx")
        const idxTx = getColIndex("tx")
        const idxRxOlt = getColIndex("rx olt") !== -1 ? getColIndex("rx olt") : getColIndex("olt rx")
        const idxLogin = getColIndex("login")
        const idxContrato = getColIndex("contrato")
        const idxNome = getColIndex("nome")
        const idxBairro = getColIndex("bairro")
        const idxEndereco = getColIndex("endereço") !== -1 ? getColIndex("endereço") : getColIndex("endereco")

        // Helper para buscar Nome, Bairro e Endereço na página de detalhes do serviço
        const fetchClientDetails = async (servicoId: string) => {
          try {
            const url = `${window.location.origin}/admin/servicos/internet/${servicoId}/`;
            const response = await fetch(url, { credentials: 'include' });
            if (!response.ok) return { nome: "", bairro: "", endereco: "" };
            const htmlText = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            
            // 1. Tenta obter o nome do cliente a partir de links para o cadastro de cliente na página
            let nome = "";
            const allLinks = Array.from(doc.querySelectorAll('a'));
            
            // Log de diagnóstico dos links de cliente
            console.log('[ATI DEBUG] Analisando todos os links da página de detalhes...');
            allLinks.forEach(link => {
              const href = link.getAttribute('href') || "";
              if (href.includes('/admin/cliente/cliente/') && !href.includes('/add/') && !href.includes('/list/')) {
                console.log(`[ATI DEBUG] Link de cliente candidato: href="${href}", texto="${link.textContent?.trim()}"`);
              }
            });

            const clientAnchor = allLinks.find(link => {
              const href = link.getAttribute('href') || "";
              // Evita links de listagem ou de adicionar
              return href.includes('/admin/cliente/cliente/') && 
                     !href.includes('/add/') && 
                     !href.endsWith('/cliente/') && 
                     !href.includes('/list/') && 
                     link.textContent?.trim() && 
                     !/^(alterar|excluir|histórico|historico|add|adicionar|limpar)$/i.test(link.textContent.trim());
            });

            if (clientAnchor) {
              const clientText = clientAnchor.textContent?.trim() || "";
              // Exemplo: "3634 - DILSON LOPES DA SILVA JUNIOR" ou "DILSON LOPES DA SILVA JUNIOR"
              if (clientText.includes(' - ')) {
                const parts = clientText.split(' - ');
                if (/^\d+$/.test(parts[0].trim())) {
                  nome = parts.slice(1).join(' - ').trim();
                } else {
                  nome = clientText;
                }
              } else {
                nome = clientText;
              }
              console.log('[ATI DEBUG] Nome extraído do link de cliente:', nome);
            }

            // 2. Fallback para os breadcrumbs se não achar pelo link
            if (!nome) {
              const breadcrumbEl = doc.querySelector('.breadcrumbs, .breadcrumb');
              if (breadcrumbEl) {
                const anchors = Array.from(breadcrumbEl.querySelectorAll('a'));
                const clientLinkInBreadcrumbs = anchors.find(a => a.getAttribute('href')?.includes('/admin/cliente/cliente/'));
                if (clientLinkInBreadcrumbs) {
                  nome = clientLinkInBreadcrumbs.textContent?.trim() || "";
                }
              }
            }

            // 3. Fallback para h1 heading
            if (!nome) {
              const heading = doc.querySelector('#content-main h1, #content h1, h1');
              if (heading) {
                const headingText = heading.textContent?.trim() || "";
                console.log('[ATI DEBUG] Heading text:', headingText);
                if (headingText.includes('|')) {
                  nome = headingText.split('|').pop()?.trim() || "";
                } else if (headingText.includes(' - ')) {
                  nome = headingText.split(' - ').pop()?.trim() || "";
                }
              }
            }

            console.log('[ATI DEBUG] Nome final detectado para o serviço ' + servicoId + ':', nome);

            const getInputValue = (id: string) => {
              const input = doc.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
              return input ? input.value?.trim() || "" : "";
            };

            // Tenta obter o bairro da instalação, senão da cobrança
            let bairro = getInputValue('id_enderecoinst-bairro') || getInputValue('id_enderecocob-bairro');
            
            // Endereço de instalação
            let logradouro = getInputValue('id_enderecoinst-logradouro');
            let numero = getInputValue('id_enderecoinst-numero');
            let complemento = getInputValue('id_enderecoinst-complemento');
            
            // Se não achar instalação, tenta cobrança
            if (!logradouro) {
              logradouro = getInputValue('id_enderecocob-logradouro');
              numero = getInputValue('id_enderecocob-numero');
              complemento = getInputValue('id_enderecocob-complemento');
            }

            let endereco = "";
            if (logradouro) {
              endereco = logradouro;
              if (numero) endereco += `, ${numero}`;
              if (complemento) endereco += ` - ${complemento}`;
            }

            return { nome, bairro, endereco };
          } catch (e) {
            console.error("Erro ao carregar detalhes do cliente:", e);
            return { nome: "", bairro: "", endereco: "" };
          }
        };

        const dados: any[] = [];
        table.querySelectorAll('tbody tr').forEach((row) => {
          const cells = row.querySelectorAll('td');
          if (cells.length === 0) return;

          const getVal = (index: number) => {
            if (index === -1 || index >= cells.length) return "";
            return cells[index].textContent?.trim() || "";
          };

          // Extrai ID do contrato da coluna de contrato (primeiro grupo de dígitos)
          const contratoVal = getVal(idxContrato);
          const contratoIdMatch = contratoVal.match(/^(\d+)/);
          const contratoId = contratoIdMatch ? contratoIdMatch[1] : "";

          // Extrai o nome do cliente (parte após o " - ")
          let nome = "";
          if (contratoVal.includes(" - ")) {
            nome = contratoVal.split(" - ").slice(1).join(" - ").trim();
          } else {
            const loginVal = getVal(idxLogin);
            if (loginVal.includes(" - ")) {
              nome = loginVal.split(" - ").slice(1).join(" - ").trim();
            }
          }

          // Tenta extrair o link do serviço e o ID do serviço da coluna de login
          const loginCell = cells[idxLogin];
          let servicoId = "";
          if (loginCell) {
            const anchor = loginCell.querySelector('a');
            if (anchor) {
              const href = anchor.getAttribute('href') || "";
              if (href) {
                const servicoIdMatch = href.match(/\/servicos\/internet\/(\d+)/);
                if (servicoIdMatch) {
                  servicoId = servicoIdMatch[1];
                }
              }
            }
          }

          dados.push({
            olt: getVal(idxOlt),
            pon: getVal(idxPon),
            vlan: getVal(idxVlan),
            id: getVal(idxId),
            rx: getVal(idxRx),
            tx: getVal(idxTx),
            rxOlt: getVal(idxRxOlt),
            login: getVal(idxLogin),
            contrato: getVal(idxContrato),
            nome: nome || getVal(idxNome),
            bairro: getVal(idxBairro),
            endereco: getVal(idxEndereco),
            status: "Não Verificado",
            servicoId,
            contratoId
          });
        });

        if (dados.length === 0) {
          showToast('⚠️ Nenhuma linha de potência encontrada na tabela.', 'error');
          btn.disabled = false;
          btn.innerText = '📊 Enviar Sinais ao Painel ATI';
          return;
        }

        btn.disabled = true;
        btn.innerText = '⏳ Carregando cache...';

        // Recupera atendente e token da sessão
        const sessionResult: any = await new Promise((resolve) => {
          chrome.storage.local.get(['ati_user_session'], resolve);
        });
        const session = sessionResult?.ati_user_session;
        const idToken = session?.idToken || '';
        const atendente = session?.nomeCompleto || 'Victor (Extension)';

        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'site-ati-75d83';
        const dbUrl = import.meta.env.MODE === 'development'
          ? `http://127.0.0.1:9000/clientes_cadastro.json?ns=${projectId}`
          : `https://${projectId}-default-rtdb.firebaseio.com/clientes_cadastro.json`;

        // 1. Baixa o cache de clientes já conhecidos do Firebase
        let cacheClientes: Record<string, { bairro: string, endereco: string, updatedAt?: number }> = {};
        try {
          const separator = dbUrl.includes('?') ? '&' : '?';
          const authParam = idToken ? `${separator}auth=${idToken}` : '';
          const cacheResponse = await fetch(`${dbUrl}${authParam}`, { signal: AbortSignal.timeout(5000) });
          if (cacheResponse.ok) {
            cacheClientes = await cacheResponse.json() || {};
          }
        } catch (e) {
          console.warn("Falha ao ler cache do Firebase, buscando direto no SGP:", e);
        }

        // 2. Mescla os dados locais com o cache (validade de 1 semana)
        const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias
        dados.forEach(item => {
          const cache = cacheClientes[item.id] as any;
          const cacheValido = cache && cache.updatedAt && (Date.now() - cache.updatedAt < CACHE_MAX_AGE);
          
          // Se o nome no cache for vazio, igual ao login ou "ATI DIGITAL", forçamos a busca para atualizar
          const nomeCacheIncorreto = cache && (!cache.nome || cache.nome === item.login || cache.nome === "ATI DIGITAL");

          if (cacheValido && cache.bairro && cache.endereco && !nomeCacheIncorreto) {
            item.nome = cache.nome || item.nome;
            item.bairro = cache.bairro;
            item.endereco = cache.endereco;
            item.shouldFetch = false;
          } else {
            item.shouldFetch = !!item.servicoId;
          }
        });

        // 3. Executa a busca em segundo plano apenas dos que não estão no cache (lotes de 15)
        const paraBuscar = dados.filter(item => item.shouldFetch);
        const total = paraBuscar.length;
        let completed = 0;

        if (total > 0) {
          btn.innerText = `⏳ Buscando Endereços (0/${total})...`;
          const concurrencyLimit = 15;

          const executeFetch = async (item: any) => {
            const details = await fetchClientDetails(item.servicoId);
            item.nome = details.nome || item.nome;
            item.bairro = details.bairro || item.bairro;
            item.endereco = details.endereco || item.endereco;
            completed++;
            btn.innerText = `⏳ Buscando Endereços (${completed}/${total})...`;
          };

          for (let i = 0; i < paraBuscar.length; i += concurrencyLimit) {
            const batch = paraBuscar.slice(i, i + concurrencyLimit).map(item => executeFetch(item));
            await Promise.all(batch);
          }
        }

        // Limpa campos temporários de todos
        dados.forEach(item => {
          delete item.shouldFetch;
          item.serviceUrl = item.servicoId ? `${window.location.origin}/admin/servicos/internet/${item.servicoId}/` : "";
        });

        btn.innerText = '⏳ Enviando Sinais ao Painel...';

        // O Vite vai injetar o modo correto de build
        const backendUrl = import.meta.env.MODE === 'development'
          ? `http://127.0.0.1:5001/${projectId}/us-central1/receberDadosPotencia`
          : `https://us-central1-${projectId}.cloudfunctions.net/receberDadosPotencia`;

        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ atendente, dados })
        });

        const resData = await response.json();

        if (resData.ok) {
          showToast(`🚀 ${dados.length} sinais enviados com sucesso ao Painel!`, 'success');
        } else {
          showToast(`❌ Falha ao processar sinais: ${resData.error || 'Erro desconhecido'}`, 'error');
        }
      } catch (err: any) {
        showToast(`❌ Erro de conexão: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.innerText = '📊 Enviar Sinais ao Painel ATI';
      }
    }

    document.body.appendChild(btn)
  }

  // Pequeno atraso para garantir a renderização da tabela
  setTimeout(injectFloatingButton, 1500)
}

