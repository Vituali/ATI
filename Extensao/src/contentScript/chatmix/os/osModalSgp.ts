// =================================================================
// MODAL DE O.S — Comunicação com o SGP (busca e renderização)
// =================================================================

import { SgpData, SgpContract, ClientData } from '../../sgp/types'
import { GetSgpFormParamsRequest, RefreshSgpOnlineStatusesRequest, GetGlobalOccurrenceTypesRequest } from '../../../background/types'
import { OsDraft } from './osDraft'
import { safeSendMessage } from '../helpers'
import { log, logError } from '../state'

// =================================================================
// POPULAR CONTRATOS
// =================================================================

export function populateContracts(container: Element | null, contracts: SgpContract[]): void {
  if (!container) return

  const valid = Array.isArray(contracts) ? contracts.filter((c) => c?.id) : []

  if (valid.length === 0) {
    container.innerHTML = `
      <h4 class="modal-category-title">Selecione o Contrato</h4>
      <div class="modal-loader">Nenhum contrato encontrado.</div>
    `
    return
  }

  const getStatus = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes('cancelado')) return 'cancelado'
    if (lower.includes('inativo')) return 'inativo'
    if (lower.includes('suspenso')) return 'suspenso'
    if (lower.includes('reduzida') || lower.includes('vel. red') || lower.includes('v. red')) return 'vel-red'
    if (lower.includes('ativo')) return 'ativo'
    return 'inativo'
  }

  const getStatusScore = (status: string): number => {
    switch (status) {
      case 'ativo':
        return 4
      case 'vel-red':
        return 3
      case 'suspenso':
        return 2
      case 'inativo':
        return 1
      case 'cancelado':
        return 0
      default:
        return 0
    }
  }

  const summary = { ativos: 0, velRed: 0, suspensos: 0, cancelados: 0, inativos: 0 }

  // Ordena por prioridade: ativo > vel-red > suspenso > inativo > cancelado
  const sorted = [...valid].sort((a, b) => {
    const scoreA = getStatusScore(getStatus(a.text))
    const scoreB = getStatusScore(getStatus(b.text))
    return scoreB - scoreA
  })

  const html = sorted
    .map((contract, index) => {
      const status = getStatus(contract.text)
      if (status === 'ativo') summary.ativos++
      else if (status === 'vel-red') summary.velRed++
      else if (status === 'suspenso') summary.suspensos++
      else if (status === 'cancelado') summary.cancelados++
      else if (status === 'inativo') summary.inativos++

      const badge = contract.online === true ? `<span class="contract-status contract-status--online">● Online</span>` : contract.online === false ? `<span class="contract-status contract-status--offline">● Offline</span>` : ''

      const finalStatus = contract.cancelled ? 'cancelado' : status
      const statusClass = `contract-item--${finalStatus}`

      return `
      <label class="template-btn contract-item ${statusClass}">
        <input type="radio" name="selected_contract" value="${contract.id}" ${index === 0 ? 'checked' : ''}>
        <span>${contract.text}</span>
        ${badge}
      </label>
    `
    })
    .join('')

  const summaryHTML =
    valid.length > 1
      ? `<div class="modal-status-summary">
        Ativos: ${summary.ativos} | Vel. Red.: ${summary.velRed} | Inativos: ${summary.inativos} | Suspensos: ${summary.suspensos} | Cancelados: ${summary.cancelados}
       </div>`
      : ''

  container.innerHTML = `
    <h4 class="modal-category-title">Selecione o Contrato</h4>
    ${summaryHTML}
    <div class="modal-btn-group">${html}</div>
  `
}

// =================================================================
// POPULAR TIPOS DE OCORRÊNCIA
// =================================================================

export function populateOccurrenceTypes(container: Element | null, occurrenceTypes: { id: string; text: string }[], signal: AbortSignal): void {
  if (!container) return

  const valid = Array.isArray(occurrenceTypes) ? occurrenceTypes.filter((t) => t?.id) : []

  if (valid.length === 0) {
    container.innerHTML = `
      <h4 class="modal-category-title">Tipo de Ocorrência</h4>
      <div class="modal-loader">Nenhum tipo encontrado.</div>
    `
    return
  }

  container.innerHTML = `
    <h4 class="modal-category-title">Tipo de Ocorrência</h4>
    <div class="searchable-select-container">
      <input type="text" id="occurrenceTypeSearchInput" class="modal-textarea" placeholder="Pesquisar tipo..." autocomplete="off">
      <input type="hidden" id="occurrenceTypeSelectedValue">
      <div id="occurrenceTypeOptions" class="searchable-options-list">
        ${valid.map((t) => `<div class="searchable-option" data-value="${t.id}">${t.text}</div>`).join('')}
      </div>
    </div>
  `

  const searchInput = container.querySelector<HTMLInputElement>('#occurrenceTypeSearchInput')!
  const hiddenInput = container.querySelector<HTMLInputElement>('#occurrenceTypeSelectedValue')!
  const optionsContainer = container.querySelector<HTMLDivElement>('#occurrenceTypeOptions')!
  const allOptions = Array.from(optionsContainer.querySelectorAll<HTMLDivElement>('.searchable-option'))

  // Track focused option index for keyboard navigation
  let focusedIndex = -1

  if (valid.length > 0) {
    searchInput.value = valid[0].text
    hiddenInput.value = valid[0].id
  }

  const clearFocus = () => {
    allOptions.forEach((opt) => opt.classList.remove('focus'))
    focusedIndex = -1
  }

  const updateFocus = (newIndex: number) => {
    clearFocus()
    focusedIndex = newIndex
    const opt = allOptions[focusedIndex]
    if (opt) {
      opt.classList.add('focus')
      // Ensure the focused option is visible
      opt.scrollIntoView({ block: 'nearest' })
    }
  }

  searchInput.addEventListener('focus', () => {
    optionsContainer.style.display = 'block'
    searchInput.select()
    // Reset focus when opening
    clearFocus()
  })

  searchInput.addEventListener('input', () => {
    const filter = searchInput.value.toUpperCase()
    hiddenInput.value = ''
    let hasVisible = false
    let firstVisibleIndex = -1

    allOptions.forEach((opt, idx) => {
      const matches = (opt.textContent ?? '').toUpperCase().includes(filter)
      opt.style.display = matches ? '' : 'none'
      if (matches) {
        if (firstVisibleIndex === -1) firstVisibleIndex = idx
        hasVisible = true
      }
    })

    optionsContainer.style.display = hasVisible ? 'block' : 'none'
    // Reset focus to first visible option
    if (hasVisible) {
      updateFocus(firstVisibleIndex)
    } else {
      clearFocus()
    }
  })

  // Keyboard navigation
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (optionsContainer.style.display !== 'block') {
        optionsContainer.style.display = 'block'
        // Focus first visible
        const firstIdx = allOptions.findIndex((opt) => opt.style.display !== 'none')
        if (firstIdx >= 0) updateFocus(firstIdx)
        return
      }
      // Move focus down
      let nextIdx = focusedIndex + 1
      while (nextIdx < allOptions.length && allOptions[nextIdx].style.display === 'none') {
        nextIdx++
      }
      if (nextIdx < allOptions.length) updateFocus(nextIdx)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (optionsContainer.style.display !== 'block') {
        optionsContainer.style.display = 'block'
        const lastIdx = allOptions.length - 1
        const lastVisible = [...allOptions].reverse().findIndex((opt) => opt.style.display !== 'none')
        if (lastVisible >= 0) updateFocus(lastIdx - lastVisible)
        return
      }
      // Move focus up
      let prevIdx = focusedIndex - 1
      while (prevIdx >= 0 && allOptions[prevIdx].style.display === 'none') {
        prevIdx--
      }
      if (prevIdx >= 0) updateFocus(prevIdx)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < allOptions.length) {
        const opt = allOptions[focusedIndex]
        hiddenInput.value = opt.getAttribute('data-value') ?? ''
        searchInput.value = opt.innerText
        optionsContainer.style.display = 'none'
        clearFocus()
        searchInput.dispatchEvent(new CustomEvent('ati:draft-update', { bubbles: true }))
      }
    } else if (e.key === 'Escape') {
      optionsContainer.style.display = 'none'
      clearFocus()
    }
  })

  allOptions.forEach((opt) => {
    opt.addEventListener('mousedown', (e) => {
      e.preventDefault()
      hiddenInput.value = opt.getAttribute('data-value') ?? ''
      searchInput.value = opt.innerText
      optionsContainer.style.display = 'none'
      clearFocus()
      searchInput.dispatchEvent(new CustomEvent('ati:draft-update', { bubbles: true }))
    })
  })

  // Signal do AbortController do modal — listener removido automaticamente ao fechar
  document.addEventListener(
    'click',
    (e) => {
      if (!container.contains(e.target as Node)) {
        optionsContainer.style.display = 'none'
        clearFocus()
      }
    },
    { signal },
  )
}

// =================================================================
// POPULAR TÉCNICOS
// =================================================================

export function populateTechnicians(modalElement: HTMLElement, technicians: { id: string; username: string }[]): void {
  const responsavelSelect = modalElement.querySelector<HTMLSelectElement>('#osResponsavel')
  const tecnicosSelect = modalElement.querySelector<HTMLSelectElement>('#osTecnicos')
  const tecnicosAuxGroup = modalElement.querySelector<HTMLElement>('#osTecnicosAuxiliaresGroup')

  if (!responsavelSelect || !tecnicosSelect) return

  // Limpa existentes
  responsavelSelect.innerHTML = '<option value="">---------</option>'
  tecnicosSelect.innerHTML = ''

  const validTechs = Array.isArray(technicians) ? technicians.filter((t) => t?.id) : []

  if (validTechs.length === 0) {
    responsavelSelect.innerHTML = '<option value="">Nenhum técnico encontrado</option>'
    return
  }

  // Ordena alfabeticamente
  const sorted = [...validTechs].sort((a, b) => a.username.localeCompare(b.username))

  // Preenche opções
  let defaultVal = ''
  sorted.forEach((tech) => {
    const isPlantonista = tech.username.toUpperCase().includes('PLANTONISTA')
    const optionText = tech.username.toUpperCase()

    const opt = document.createElement('option')
    opt.value = tech.id
    opt.textContent = optionText
    responsavelSelect.appendChild(opt)

    if (isPlantonista && !defaultVal) {
      defaultVal = tech.id
    }

    // Preenche auxiliares
    const optAux = document.createElement('option')
    optAux.value = tech.id
    optAux.textContent = optionText
    tecnicosSelect.appendChild(optAux)
  })

  // Define padrão para plantonista se encontrado
  if (defaultVal) {
    responsavelSelect.value = defaultVal
  }

  // Verifica visibilidade inicial do grupo de auxiliares
  const isPlantonista = responsavelSelect.options[responsavelSelect.selectedIndex]?.text.toLowerCase().includes('plantonista')
  if (tecnicosAuxGroup) {
    tecnicosAuxGroup.style.display = isPlantonista ? 'none' : 'flex'
  }

  // Escuta alteração do responsável para alternar auxiliares
  responsavelSelect.addEventListener('change', () => {
    const isPlantonistaNow = responsavelSelect.options[responsavelSelect.selectedIndex]?.text.toLowerCase().includes('plantonista')
    if (tecnicosAuxGroup) {
      tecnicosAuxGroup.style.display = isPlantonistaNow ? 'none' : 'flex'
    }
  })
}

// =================================================================
// CARREGAR DADOS DO SGP — cache ou busca completa
// =================================================================

export interface LoadSgpDataParams {
  clientData: ClientData
  chatId: string
  idToken: string
  uid?: string
  modalElement: HTMLElement
  sgpButton: HTMLButtonElement
  signal: AbortSignal
  existingDraft: OsDraft | null
  onSgpDataLoaded: (data: SgpData) => void
}

export function loadSgpData({ clientData, chatId, idToken, uid, modalElement, sgpButton, signal, existingDraft, onSgpDataLoaded }: LoadSgpDataParams): void {
  const isSgpPage = window.location.hostname.includes('sgp') || window.location.hostname.includes('201.158.20.35') || window.location.hostname.includes('201.158.20.53')

  if (isSgpPage) {
    console.log('Extensão ATI: Extraindo contratos e tipos diretamente do formulário do SGP local...')
    const contractSelect = document.querySelector('#id_clientecontrato') as HTMLSelectElement | null
    const occurrenceTypeSelect = document.querySelector('#id_tipo') as HTMLSelectElement | null
    const responsibleSelect = document.querySelector('#id_responsavel') as HTMLSelectElement | null

    const contracts: SgpContract[] = []
    if (contractSelect) {
      Array.from(contractSelect.options).forEach((opt) => {
        if (opt.value) {
          contracts.push({
            id: opt.value,
            text: opt.textContent?.trim() || '',
            clientId: clientData.clientSgpId || '',
            baseUrl: window.location.origin,
            online: null,
          })
        }
      })
    }

    const occurrenceTypes: any[] = []
    if (occurrenceTypeSelect) {
      Array.from(occurrenceTypeSelect.options).forEach((opt) => {
        if (opt.value) {
          occurrenceTypes.push({
            id: opt.value,
            text: opt.textContent?.trim() || '',
          })
        }
      })
    }

    const responsibleUsers: any[] = []
    if (responsibleSelect) {
      Array.from(responsibleSelect.options).forEach((opt) => {
        if (opt.value) {
          responsibleUsers.push({
            id: opt.value,
            username: opt.textContent?.trim().toLowerCase() || '',
          })
        }
      })
    }

    const sgpData: SgpData = {
      clientSgpId: clientData.clientSgpId || '',
      clientSgpOrigin: window.location.origin,
      contracts,
      responsibleUsers,
      occurrenceTypes,
    }

    onSgpDataLoaded(sgpData)
    populateContracts(modalElement.querySelector('#modal-sgp-contracts-container'), sgpData.contracts)
    populateOccurrenceTypes(modalElement.querySelector('#modal-occurrence-types-container'), sgpData.occurrenceTypes, signal)
    sgpButton.disabled = false
    return
  }

  if (existingDraft?.sgpData) {
    // --- Usa dados em cache do draft ---
    const sgpData = existingDraft.sgpData as SgpData
    onSgpDataLoaded(sgpData)

    populateContracts(modalElement.querySelector('#modal-sgp-contracts-container'), sgpData.contracts)
    populateOccurrenceTypes(modalElement.querySelector('#modal-occurrence-types-container'), sgpData.occurrenceTypes, signal)
    sgpButton.disabled = false

    // Restaura contrato selecionado
    if (existingDraft.selectedContract) {
      const radio = modalElement.querySelector<HTMLInputElement>(`input[name="selected_contract"][value="${existingDraft.selectedContract}"]`)
      if (radio) radio.checked = true
    }

    // Restaura tipo de ocorrência
    if (existingDraft.occurrenceType && existingDraft.occurrenceTypeText) {
      const searchInput = modalElement.querySelector<HTMLInputElement>('#occurrenceTypeSearchInput')
      const hiddenInput = modalElement.querySelector<HTMLInputElement>('#occurrenceTypeSelectedValue')
      if (searchInput && hiddenInput) {
        searchInput.value = existingDraft.occurrenceTypeText
        hiddenInput.value = existingDraft.occurrenceType
      }
    }

    // Refresh silencioso do status online/offline
    safeSendMessage<RefreshSgpOnlineStatusesRequest>({
      action: 'refreshSgpOnlineStatuses',
      clientData,
      chatId,
    })
      .then((response: { success?: boolean; data?: unknown }) => {
        if (response?.success && response.data) {
          const freshData = response.data as SgpData
          sgpData.contracts = freshData.contracts
          populateContracts(modalElement.querySelector('#modal-sgp-contracts-container'), sgpData.contracts)
          // Restaura seleção após re-render
          if (existingDraft.selectedContract) {
            const radio = modalElement.querySelector<HTMLInputElement>(`input[name="selected_contract"][value="${existingDraft.selectedContract}"]`)
            if (radio) radio.checked = true
          }
        }
      })
      .catch(() => {
        /* Falha silenciosa — mantém status antigo na tela */
      })
  } else {
    // --- Busca completa no SGP ---
    const tStart = performance.now()
    let occurrenceTypesPopulated = false

    // Fast-path: Busca rápida dos tipos de ocorrência globais de forma assíncrona
    safeSendMessage<GetGlobalOccurrenceTypesRequest>({
      action: 'getGlobalOccurrenceTypes',
      idToken,
    })
      .then((res: any) => {
        if (res?.success && Array.isArray(res.types) && res.types.length > 0) {
          if (!occurrenceTypesPopulated) {
            occurrenceTypesPopulated = true
            console.log(`Extensão ATI: Tipos de ocorrência globais carregados via Fast-Path (${res.types.length} tipos).`)

            // Expõe os tipos rápidos para o modal (por ex., habilita botões de template)
            onSgpDataLoaded({
              occurrenceTypes: res.types,
              contracts: [],
              responsibleUsers: [],
              clientSgpId: '',
            })

            const container = modalElement.querySelector('#modal-occurrence-types-container')
            populateOccurrenceTypes(container, res.types, signal)

            // Restaura tipo de ocorrência do draft se existir
            if (existingDraft?.occurrenceType && existingDraft?.occurrenceTypeText) {
              const searchInput = modalElement.querySelector<HTMLInputElement>('#occurrenceTypeSearchInput')
              const hiddenInput = modalElement.querySelector<HTMLInputElement>('#occurrenceTypeSelectedValue')
              if (searchInput && hiddenInput) {
                searchInput.value = existingDraft.occurrenceTypeText
                hiddenInput.value = existingDraft.occurrenceType
              }
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Extensão ATI: Falha ao carregar tipos de ocorrência globais de forma rápida:', err)
      })

    safeSendMessage<GetSgpFormParamsRequest>({
      action: 'getSgpFormParams',
      clientData,
      chatId,
      idToken,
      uid,
    })
      .then((response: { success?: boolean; data?: unknown; message?: string }) => {
        const tEnd = performance.now()
        log(`⏱️ [ATI Perf] getSgpFormParams demorou ${(tEnd - tStart).toFixed(1)}ms.`)
        if (response?.success) {
          const sgpData = response.data as SgpData
          onSgpDataLoaded(sgpData)
          populateContracts(modalElement.querySelector('#modal-sgp-contracts-container'), sgpData.contracts)

          if (!occurrenceTypesPopulated) {
            occurrenceTypesPopulated = true
            populateOccurrenceTypes(modalElement.querySelector('#modal-occurrence-types-container'), sgpData.occurrenceTypes, signal)
          } else {
            console.log('Extensão ATI: Ignorando repopulação de tipos de ocorrência pois já foram carregados pelo Fast-Path.')
          }

          sgpButton.disabled = false
        } else {
          throw new Error(response?.message ?? 'Falha ao buscar dados do SGP.')
        }
      })
      .catch((error: Error) => {
        const tEndErr = performance.now()
        logError(`⏱️ [ATI Perf] getSgpFormParams falhou após ${(tEndErr - tStart).toFixed(1)}ms. Erro:`, error)
        console.error('Extensão ATI: Erro ao buscar dados SGP.', error)
        modalElement.querySelectorAll('.modal-loader').forEach((l) => {
          l.textContent = `Erro: ${error.message}`
        })
        sgpButton.textContent = 'Falha no SGP'
      })
  }
}
