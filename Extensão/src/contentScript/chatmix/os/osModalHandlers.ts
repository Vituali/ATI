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

export function setupOsCheckbox(osCheckbox: HTMLInputElement, statusCheckbox: HTMLInputElement, statusLabel: HTMLElement): void {
  osCheckbox.addEventListener('change', () => {
    if (osCheckbox.checked) {
      statusCheckbox.checked = false
      statusCheckbox.disabled = true
      statusLabel.classList.add('disabled')
    } else {
      statusCheckbox.disabled = false
      statusCheckbox.checked = true
      statusLabel.classList.remove('disabled')
    }
  })
}

// =================================================================
// BOTÕES DE TEMPLATE
// =================================================================

export function setupTemplateButtons(modalElement: HTMLElement, osTextArea: HTMLTextAreaElement, osBaseText: string, getOccurrenceTypes: () => SgpOccurrenceType[], is53: boolean): void {
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

        if (is53) {
          // 1. Tenta match exato pelo ID de 53
          if (typeId53) {
            found = types.find((t) => String(t.id) === String(typeId53))
          }
          // 2. Fallback: match por nome amigável
          if (!found && typeName) {
            const cleanName = typeName.toLowerCase().trim()
            found = types.find((t) => t.text.toLowerCase().trim() === cleanName)
          }
        } else {
          // 1. Tenta match exato pelo ID de 35 (legado)
          if (typeId35) {
            found = types.find((t) => String(t.id) === String(typeId35))
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
