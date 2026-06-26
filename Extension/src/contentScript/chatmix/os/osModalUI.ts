// =================================================================
// MODAL DE O.S — Criação do modal genérico (UI pura)
// =================================================================

import { ModalResult } from '../../sgp/types'
import { ModalConfig } from './osModalTypes'
import { icon } from '../../../utils/iconSvgs'

export function createModal(config: ModalConfig): {
  promise: Promise<ModalResult>
  controller: AbortController
} {
  const controller = new AbortController()

  const promise = new Promise<ModalResult>((resolve, reject) => {
    document.querySelector('.ati-os-modal-overlay')?.remove()

    const isSgpPage = window.location.hostname.includes('sgp') || window.location.hostname.includes('201.158.20.35') || window.location.hostname.includes('201.158.20.53')

    const addedDarkClass = isSgpPage && !document.documentElement.classList.contains('dark')
    if (addedDarkClass) {
      document.documentElement.classList.add('dark')
    }

    const overlay = document.createElement('div')
    overlay.className = 'ati-os-modal-overlay'

    const modal = document.createElement('div')
    modal.className = 'ati-os-modal'

    const buttonsHTML = config.footerButtons.map((btn) => `<button class="main-btn ${btn.className}" value="${btn.value}" ${btn.disabled ? 'disabled' : ''}>${btn.text}</button>`).join('')

    modal.innerHTML = `
      <div class="ati-os-modal-header"><span class="os-header-icon">${icon.fileText}</span> ${config.title}</div>
      <div class="ati-os-modal-body">${config.bodyHTML}</div>
      <div class="ati-os-modal-footer">${buttonsHTML}</div>
    `

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    const closeModal = (reason: string) => {
      if (addedDarkClass) {
        document.documentElement.classList.remove('dark')
      }
      controller.abort()
      overlay.remove()
      reject(new Error(reason))
    }

    let isDateModified = false

    overlay.addEventListener('change', (e) => {
      const target = e.target as HTMLElement
      if (target.id === 'osDataAgendamento') {
        isDateModified = true
      }
    })

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

      // Capture OS fields
      const osMotivo = modal.querySelector<HTMLSelectElement>('#osMotivo')?.value ?? null
      const osPrioridade = modal.querySelector<HTMLSelectElement>('#osPrioridade')?.value ?? null
      const osDataAgendamento = modal.querySelector<HTMLInputElement>('#osDataAgendamento')?.value ?? null
      const osPeriodo = modal.querySelector<HTMLSelectElement>('#osPeriodo')?.value ?? null
      const osPeriodoExtra = modal.querySelector<HTMLInputElement>('#osPeriodoExtra')?.value ?? ''
      const osResponsavel = modal.querySelector<HTMLSelectElement>('#osResponsavel')?.value ?? null
      const osTecnicos = Array.from(modal.querySelectorAll<HTMLOptionElement>('#osTecnicos option:checked')).map((o) => o.value)
      const osObservacao = modal.querySelector<HTMLTextAreaElement>('#osObservacao')?.value ?? ''

      const data = {
        osText: osTextArea?.value ?? '',
        selectedContract: selectedContractInput?.value ?? null,
        occurrenceType: occurrenceTypeInput?.value ?? null,
        occurrenceStatus: (statusCheckbox?.checked ? '1' : '2') as '1' | '2',
        shouldCreateOS: createOSCheckbox?.checked ?? false,
        osMotivo,
        osPrioridade,
        osDataAgendamento,
        osDateModified: isDateModified,
        osPeriodo,
        osPeriodoExtra,
        osResponsavel,
        osTecnicos,
        osObservacao,
      }

      if (addedDarkClass) {
        document.documentElement.classList.remove('dark')
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
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`

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

    <div class="modal-date-container">
      <label class="modal-textarea-label" style="margin-top: 0; margin-bottom: 6px;" for="osDataAgendamento">Data Agendamento</label>
      <input type="date" id="osDataAgendamento" class="modal-input-date" value="${todayStr}">
    </div>

    <!-- Container dos campos adicionais de O.S. (oculto por padrão) -->
    <div id="modal-os-fields-container" class="modal-os-fields-container">
      <h4 class="modal-category-title" style="margin-top: 0; margin-bottom: 4px;">Dados do Agendamento O.S.</h4>
      
      <div class="modal-grid-2">
        <div class="modal-field-group">
          <label class="modal-textarea-label" for="osMotivo">Motivo</label>
          <select id="osMotivo" class="modal-select">
            <option value="4" selected>Corretiva</option>
            <option value="1">Instalação de KIT</option>
            <option value="2">Remoção de KIT</option>
            <option value="3">Preventiva</option>
            <option value="5">Financeiro</option>
            <option value="6">Mudança Endereço</option>
            <option value="7">Renovação de fidelidade</option>
            <option value="8">Upgrade</option>
            <option value="9">Mudança de ponto</option>
            <option value="100029">Migracao para Fibra Optica</option>
            <option value="100030">Entrada de predio e expansao- Instalacao</option>
            <option value="100032">MIGRACAO PLANO PREMIUM</option>
            <option value="100034">MIGRAÇAO ATI DIGITAL</option>
          </select>
        </div>

        <div class="modal-field-group">
          <label class="modal-textarea-label" for="osPrioridade">Prioridade</label>
          <select id="osPrioridade" class="modal-select">
            <option value="1">Baixa</option>
            <option value="2" selected>Normal</option>
            <option value="3">Alta</option>
          </select>
        </div>
      </div>

      <div class="modal-grid-2">
        <div class="modal-field-group">
          <label class="modal-textarea-label" for="osPeriodo">Período de Agendamento</label>
          <select id="osPeriodo" class="modal-select">
            <option value="" selected>---------</option>
            <option value="48h">Prazo de 48 horas</option>
            <option value="manha">Manhã (09:00 - 12:00)</option>
            <option value="tarde">Tarde (13:00 - 17:00)</option>
            <option value="outros">Outros</option>
          </select>
        </div>

        <div class="modal-field-group">
          <label class="modal-textarea-label" for="osResponsavel">Técnico Responsável</label>
          <select id="osResponsavel" class="modal-select">
            <option value="">Carregando técnicos...</option>
          </select>
        </div>
      </div>

      <div class="modal-field-group" id="osPeriodoExtraGroup" style="display: none;">
        <label class="modal-textarea-label" id="lblPeriodoExtra" for="osPeriodoExtra">Detalhes do Agendamento</label>
        <input type="text" id="osPeriodoExtra" class="modal-textarea" placeholder="" value="">
      </div>

      <div class="modal-field-group" id="osTecnicosAuxiliaresGroup" style="display: none;">
        <label class="modal-textarea-label" for="osTecnicos">Técnico(s) auxiliar(es)</label>
        <select id="osTecnicos" class="modal-select" multiple style="height: 100px;">
          <!-- Preenchido dinamicamente -->
        </select>
        <span class="modal-help-text">Mantenha Ctrl pressionado para selecionar múltiplos</span>
      </div>

      <div class="modal-field-group">
        <label class="modal-textarea-label" for="osObservacao">Observação</label>
        <textarea id="osObservacao" class="modal-textarea" rows="3" placeholder="Observações adicionais para a O.S..."></textarea>
      </div>
    </div>

    <div class="modal-templates-container">
      ${templatesHTML}
    </div>
  `
}
