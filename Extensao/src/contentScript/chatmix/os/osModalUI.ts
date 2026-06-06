// =================================================================
// MODAL DE O.S — Criação do modal genérico (UI pura)
// =================================================================

import { ModalResult } from '../../sgp/types'
import { ModalConfig } from './osModalTypes'

export function createModal(config: ModalConfig): {
  promise: Promise<ModalResult>
  controller: AbortController
} {
  const controller = new AbortController()

  const promise = new Promise<ModalResult>((resolve, reject) => {
    document.querySelector('.ati-os-modal-overlay')?.remove()

    const isSgpPage = window.location.hostname.includes('sgp') || 
                      window.location.hostname.includes('201.158.20.35') || 
                      window.location.hostname.includes('201.158.20.53');

    const addedDarkClass = isSgpPage && !document.documentElement.classList.contains('dark');
    if (addedDarkClass) {
      document.documentElement.classList.add('dark');
    }

    const overlay = document.createElement('div')
    overlay.className = 'ati-os-modal-overlay'

    const modal = document.createElement('div')
    modal.className = 'ati-os-modal'

    const buttonsHTML = config.footerButtons.map((btn) => `<button class="main-btn ${btn.className}" value="${btn.value}" ${btn.disabled ? 'disabled' : ''}>${btn.text}</button>`).join('')

    modal.innerHTML = `
      <div class="ati-os-modal-header">${config.title}</div>
      <div class="ati-os-modal-body">${config.bodyHTML}</div>
      <div class="ati-os-modal-footer">${buttonsHTML}</div>
    `

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    const closeModal = (reason: string) => {
      if (addedDarkClass) {
        document.documentElement.classList.remove('dark');
      }
      controller.abort()
      overlay.remove()
      reject(new Error(reason))
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal('cancel')
    })

    modal.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.main-btn')
      if (!target) return

      const action = target.value

      if (action === 'cancel') {
        closeModal('cancel')
        return
      }

      const osTextArea = modal.querySelector<HTMLTextAreaElement>('#osTextArea')
      const selectedContractInput = modal.querySelector<HTMLInputElement>('input[name="selected_contract"]:checked')
      const occurrenceTypeInput = modal.querySelector<HTMLInputElement>('#occurrenceTypeSelectedValue')
      const statusCheckbox = modal.querySelector<HTMLInputElement>('#occurrenceStatusCheckbox')
      const createOSCheckbox = modal.querySelector<HTMLInputElement>('#shouldCreateOSCheckbox')

      const data = {
        osText: osTextArea?.value ?? '',
        selectedContract: selectedContractInput?.value ?? null,
        occurrenceType: occurrenceTypeInput?.value ?? null,
        occurrenceStatus: (statusCheckbox?.checked ? '1' : '2') as '1' | '2',
        shouldCreateOS: createOSCheckbox?.checked ?? false,
      }

      if (addedDarkClass) {
        document.documentElement.classList.remove('dark');
      }
      controller.abort()
      overlay.remove()
      resolve({ action, data })
    })
  })

  return { promise, controller }
}

// =================================================================
// HTML DO BODY DO MODAL DE O.S
// =================================================================

export function buildOsModalBodyHTML(templatesHTML: string): string {
  return `
    <div id="modal-sgp-contracts-container"><div class="modal-loader">Carregando contratos...</div></div>
    <div id="modal-occurrence-types-container"><div class="modal-loader">Carregando tipos de ocorrência...</div></div>

    <label class="modal-textarea-label" for="osTextArea">Descrição</label>
    <textarea id="osTextArea" class="modal-textarea"></textarea>

    <div class="modal-checkboxes">
      <label class="modal-checkbox-label" id="lblOccurrenceStatus">
        <span>Ocorrência Encerrada?</span>
        <input type="checkbox" id="occurrenceStatusCheckbox" checked>
        <span class="toggle-track"></span>
      </label>
      <label class="modal-checkbox-label">
        <span>Gerar O.S.?</span>
        <input type="checkbox" id="shouldCreateOSCheckbox">
        <span class="toggle-track"></span>
      </label>
    </div>

    <div class="modal-templates-container">
      ${templatesHTML}
    </div>
  `
}
