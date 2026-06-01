// =================================================================
// MODAL DE SELEÇÃO DE CADASTROS DO SGP
// Exibido apenas quando um contato tem mais de 1 registration (Client ID)
// =================================================================

import './clientModal.css'

export async function showClientSelectionModal(clients: { id: string; text: string }[]): Promise<string | null> {
  return new Promise((resolve) => {
    // Remove qualquer modal existente
    const existing = document.querySelector('.ati-client-modal-overlay')
    if (existing) existing.remove()

    const overlay = document.createElement('div')
    overlay.className = 'ati-client-modal-overlay'

    const modal = document.createElement('div')
    modal.className = 'ati-client-modal'

    const header = document.createElement('div')
    header.className = 'ati-client-modal-header'
    header.innerHTML = '👥 Selecionar Cadastro (SGP)'

    const body = document.createElement('div')
    body.className = 'ati-client-modal-body'

    const helpText = document.createElement('div')
    helpText.className = 'ati-client-modal-help'
    helpText.textContent = 'Este cliente possui múltiplos cadastros no SGP. Selecione qual você deseja abrir:'
    body.appendChild(helpText)

    // Summary calculation
    const summary = {
      ativos: 0,
      velRed: 0,
      suspensos: 0,
      cancelados: 0,
      inativos: 0,
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
        case 'ativo':     return 4
        case 'vel-red':   return 3
        case 'suspenso':  return 2
        case 'inativo':   return 1
        case 'cancelado': return 0
        default:          return 0
      }
    }

    // Ordena por prioridade: ativo > vel-red > suspenso > inativo > cancelado
    const sortedClients = [...clients].sort((a, b) => {
      const scoreA = getStatusScore(getStatus(a.text))
      const scoreB = getStatusScore(getStatus(b.text))
      return scoreB - scoreA
    })

    sortedClients.forEach((client) => {
      const status = getStatus(client.text)
      if (status === 'ativo') summary.ativos++
      else if (status === 'vel-red') summary.velRed++
      else if (status === 'suspenso') summary.suspensos++
      else if (status === 'cancelado') summary.cancelados++
      else if (status === 'inativo') summary.inativos++

      const btn = document.createElement('button')
      btn.className = `ati-client-modal-btn ati-client-modal-btn--${status}`
      const displayId = client.id.includes('|') ? client.id.split('|')[1] : client.id
      btn.textContent = `ID ${displayId} - ${client.text}`

      btn.onclick = () => {
        cleanup()
        resolve(client.id)
      }
      body.appendChild(btn)
    })

    // Adiciona o contador de resumo
    const summaryEl = document.createElement('div')
    summaryEl.className = 'ati-client-modal-summary'
    summaryEl.innerHTML = `Ativos: ${summary.ativos} | Ativos Vel. Red.: ${summary.velRed} | Inativos: ${summary.inativos} | Suspensos: ${summary.suspensos} | Cancelados: ${summary.cancelados}`
    body.appendChild(summaryEl)

    const footer = document.createElement('div')
    footer.className = 'ati-client-modal-footer'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'ati-client-modal-cancel'
    cancelBtn.textContent = 'Cancelar'

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

    function cleanup() {
      overlay.remove()
    }

    // Fecha ao clicar fora
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup()
        resolve(null)
      }
    })
  })
}
