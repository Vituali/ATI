// =================================================================
// MODAL DE SELEÇÃO DE SGP
// Exibido ao pressionar o botão O.S ou SGP por 2 segundos
// =================================================================

import { SGP_IP_35, SGP_IP_53 } from '../../background/sgp/constants'
import { safeSendMessage } from '../chatmix/helpers'
import { icon } from '../../utils/iconSvgs'

export async function showSgpSelectionModal(): Promise<string | null> {
  return new Promise((resolve) => {
    // Remove qualquer modal existente
    const existing = document.querySelector('.ati-sgp-selector-overlay')
    if (existing) existing.remove()

    const overlay = document.createElement('div')
    overlay.className = 'ati-sgp-selector-overlay'

    const modal = document.createElement('div')
    modal.className = 'ati-sgp-selector-modal'

    const header = document.createElement('div')
    header.className = 'ati-sgp-selector-header'
    header.innerHTML = `${icon.settings} Selecionar Servidor SGP`

    const body = document.createElement('div')
    body.className = 'ati-sgp-selector-body'

    const helpText = document.createElement('div')
    helpText.className = 'ati-sgp-selector-help'
    helpText.textContent = 'Escolha qual endereço usar para abrir o SGP:'
    body.appendChild(helpText)

    const options = [
      { label: 'Servidor .53 (Novo)', value: SGP_IP_53 },
      { label: 'Servidor .35 (Antigo)', value: SGP_IP_35 },
    ]

    chrome.storage.local.get('ati_preferred_sgp', (result) => {
      const currentPref = result.ati_preferred_sgp

      options.forEach((opt) => {
        const btn = document.createElement('button')
        btn.className = 'ati-sgp-selector-btn'
        if (currentPref === opt.value) {
          btn.classList.add('ati-sgp-selector-btn--active')
          const labelSpan = document.createElement('span')
          labelSpan.textContent = opt.label
          const badge = document.createElement('small')
          badge.textContent = ' (Atual)'
          btn.append(labelSpan, badge)
        } else {
          btn.textContent = opt.label
        }

        btn.onclick = async () => {
          await chrome.storage.local.set({ ati_preferred_sgp: opt.value })
          // Limpa cache para forçar troca imediata
          await safeSendMessage({ action: 'clearSgpCache', cacheKey: 'all' })
          await chrome.storage.local.remove('sgp_status_cache')

          cleanup()
          resolve(opt.value)
        }
        body.appendChild(btn)
      })

      const footer = document.createElement('div')
      footer.className = 'ati-sgp-selector-footer'

      const cancelBtn = document.createElement('button')
      cancelBtn.className = 'ati-sgp-selector-cancel'
      cancelBtn.textContent = 'Fechar'
      cancelBtn.onclick = () => {
        cleanup()
        resolve(null)
      }
      footer.appendChild(cancelBtn)

      modal.appendChild(header)
      modal.appendChild(body)
      modal.appendChild(footer)
      overlay.appendChild(modal)
      document.body.appendChild(overlay)
    })

    function cleanup() {
      overlay.remove()
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup()
        resolve(null)
      }
    })
  })
}
