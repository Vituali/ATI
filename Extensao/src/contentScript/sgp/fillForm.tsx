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
          
          // Abre o novo menu de opções de Promessa de Pagamento
          showPaymentPromiseMenuModal(pendingClientId, pendingContractId)
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

  chrome.storage.local.get([storageKey, 'ati_user_session'], (result) => {
    const data = result[storageKey]
    const session = result.ati_user_session
    const username = (session?.sgpUsername ?? session?.username)?.toLowerCase() ?? ''

    if (!data) {
      console.log('Extensão ATI: Sem dados pendentes para esta requisição.')
      // Sugerir usar o O.S. (Auxiliar) via Popup Modal
      showSgpPromptModal(
        '📋 O.S. (Auxiliar)',
        'Você está na tela de adicionar ocorrência. Deseja utilizar o auxiliador de O.S. para selecionar templates e preencher os dados automaticamente?',
        'Sim, abrir auxiliador',
        'Não, preencher manualmente',
        () => {
          handleOpenOS()
        }
      )
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
