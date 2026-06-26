// =================================================================
// MODAL DE O.S — Handlers de eventos internos
// =================================================================

import { SgpData, SgpOccurrenceType } from '../../sgp/types'
import { saveDraft } from './osDraft'
import { processDynamicPlaceholders } from './osModalTypes'

// =================================================================
// SALVAR RASCUNHO AO DIGITAR
// =================================================================

export function setupDraftSaving(chatId: string, osTextArea: HTMLTextAreaElement, modalElement: HTMLElement, getSgpData: () => SgpData | null): void {
  const updateDraftFn = () => {
    saveDraft(chatId, {
      osText: osTextArea.value,
      selectedContract: modalElement.querySelector<HTMLInputElement>('input[name="selected_contract"]:checked')?.value ?? null,
      selectedContractText: modalElement.querySelector<HTMLInputElement>('input[name="selected_contract"]:checked')?.closest('label')?.querySelector('span')?.textContent ?? null,
      occurrenceType: modalElement.querySelector<HTMLInputElement>('#occurrenceTypeSelectedValue')?.value ?? null,
      occurrenceTypeText: modalElement.querySelector<HTMLInputElement>('#occurrenceTypeSearchInput')?.value ?? null,
      sgpData: getSgpData(),
    })
  }

  osTextArea.addEventListener('input', updateDraftFn)

  modalElement.addEventListener('change', (e) => {
    const target = e.target as HTMLElement
    if (target.matches('input[name="selected_contract"]')) {
      updateDraftFn()
    }
  })

  modalElement.addEventListener('input', (e) => {
    const target = e.target as HTMLElement
    if (target.id === 'occurrenceTypeSearchInput') {
      updateDraftFn()
    }
  })

  modalElement.addEventListener('ati:draft-update', updateDraftFn)
}

// =================================================================
// CHECKBOX — Gerar O.S. trava Ocorrência Encerrada
// =================================================================

export function setupOsCheckbox(osCheckbox: HTMLInputElement, statusCheckbox: HTMLInputElement, statusLabel: HTMLElement, modalElement: HTMLElement): void {
  const osFieldsContainer = modalElement.querySelector<HTMLElement>('#modal-os-fields-container')

  const updateVisibility = () => {
    if (osCheckbox.checked) {
      statusCheckbox.checked = false
      statusCheckbox.disabled = true
      statusLabel.classList.add('disabled')
      if (osFieldsContainer) osFieldsContainer.style.display = 'flex'
    } else {
      statusCheckbox.disabled = false
      statusCheckbox.checked = true
      statusLabel.classList.remove('disabled')
      if (osFieldsContainer) osFieldsContainer.style.display = 'none'
    }
  }

  // Executa imediatamente para garantir o estado inicial
  updateVisibility()

  osCheckbox.addEventListener('change', updateVisibility)
}

// =================================================================
// BOTÕES DE TEMPLATE
// =================================================================

export function setupTemplateButtons(modalElement: HTMLElement, osTextArea: HTMLTextAreaElement, osBaseText: string, getOccurrenceTypes: () => SgpOccurrenceType[], is53: boolean | (() => boolean)): void {
  modalElement.querySelectorAll<HTMLButtonElement>('.template-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const templateText = btn.getAttribute('data-template-text') ?? ''
      osTextArea.value = processDynamicPlaceholders(osBaseText + templateText).toUpperCase()
      osTextArea.focus()

      // Seleciona tipo de ocorrência automaticamente se template tiver typeId
      const typeId35 = btn.getAttribute('data-occurrence-type-id')
      const typeId53 = btn.getAttribute('data-occurrence-type-id-53')
      const typeName = btn.getAttribute('data-occurrence-type-name')

      const searchInput = modalElement.querySelector<HTMLInputElement>('#occurrenceTypeSearchInput')
      const hiddenInput = modalElement.querySelector<HTMLInputElement>('#occurrenceTypeSelectedValue')

      if (searchInput && hiddenInput) {
        const types = getOccurrenceTypes()
        let found: SgpOccurrenceType | undefined
        const activeIs53 = typeof is53 === 'function' ? is53() : is53

        if (activeIs53) {
          // 1. Tenta match exato pelo ID de 53 (se o nome coincidir com o esperado)
          if (typeId53) {
            const byId = types.find((t) => String(t.id) === String(typeId53) || String(t.id_53) === String(typeId53))
            if (byId && (!typeName || byId.text.toLowerCase().trim() === typeName.toLowerCase().trim())) {
              found = byId
            }
          }
          // 2. Fallback: match por nome amigável
          if (!found && typeName) {
            const cleanName = typeName.toLowerCase().trim()
            found = types.find((t) => t.text.toLowerCase().trim() === cleanName)
          }
        } else {
          // 1. Tenta match exato pelo ID de 35 (legado) (se o nome coincidir com o esperado)
          if (typeId35) {
            const byId = types.find((t) => String(t.id) === String(typeId35) || String(t.id_35) === String(typeId35))
            if (byId && (!typeName || byId.text.toLowerCase().trim() === typeName.toLowerCase().trim())) {
              found = byId
            }
          }
          // 2. Fallback: match por nome amigável
          if (!found && typeName) {
            const cleanName = typeName.toLowerCase().trim()
            found = types.find((t) => t.text.toLowerCase().trim() === cleanName)
          }
        }

        if (found) {
          searchInput.value = found.text
          hiddenInput.value = found.id
          searchInput.dispatchEvent(new CustomEvent('ati:draft-update', { bubbles: true }))
        }
      }
    })
  })
}

// =================================================================
// PERÍODO DE AGENDAMENTO — Campo extra dinâmico
// =================================================================

export function setupPeriodoChangeListener(modalElement: HTMLElement): void {
  const osPeriodoSelect = modalElement.querySelector<HTMLSelectElement>('#osPeriodo')
  const osPeriodoExtraGroup = modalElement.querySelector<HTMLElement>('#osPeriodoExtraGroup')
  const lblPeriodoExtra = modalElement.querySelector<HTMLElement>('#lblPeriodoExtra')
  const osPeriodoExtraInput = modalElement.querySelector<HTMLInputElement>('#osPeriodoExtra')

  if (!osPeriodoSelect || !osPeriodoExtraGroup || !lblPeriodoExtra || !osPeriodoExtraInput) return

  const updatePeriodoExtraVisibility = () => {
    const val = osPeriodoSelect.value
    if (val === 'manha') {
      osPeriodoExtraGroup.style.display = 'flex'
      lblPeriodoExtra.textContent = 'Detalhes do Agendamento (Manhã)'
      osPeriodoExtraInput.placeholder = 'Ex: até as 11, após 10, etc.'
    } else if (val === 'tarde') {
      osPeriodoExtraGroup.style.display = 'flex'
      lblPeriodoExtra.textContent = 'Detalhes do Agendamento (Tarde)'
      osPeriodoExtraInput.placeholder = 'Ex: até as 15, após 14, etc.'
    } else if (val === 'outros') {
      osPeriodoExtraGroup.style.display = 'flex'
      lblPeriodoExtra.textContent = 'Detalhes do Agendamento'
      osPeriodoExtraInput.placeholder = 'Descreva o agendamento personalizado...'
    } else {
      osPeriodoExtraGroup.style.display = 'none'
      osPeriodoExtraInput.value = ''
    }
  }

  // Executa imediatamente para garantir o estado inicial
  updatePeriodoExtraVisibility()

  osPeriodoSelect.addEventListener('change', updatePeriodoExtraVisibility)
}
