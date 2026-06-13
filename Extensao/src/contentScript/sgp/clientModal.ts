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

    const getClientOverallStatus = (clientText: string): string => {
      const parts = clientText.split('|').map((p) => p.trim())
      let maxScore = -1
      let bestStatus = 'inativo'
      for (const part of parts) {
        const status = getStatus(part)
        const score = getStatusScore(status)
        if (score > maxScore) {
          maxScore = score
          bestStatus = status
        }
      }
      return bestStatus
    }

    // Ordena por prioridade: ativo > vel-red > suspenso > inativo > cancelado
    const sortedClients = [...clients].sort((a, b) => {
      const scoreA = getStatusScore(getClientOverallStatus(a.text))
      const scoreB = getStatusScore(getClientOverallStatus(b.text))
      return scoreB - scoreA
    })

    sortedClients.forEach((client) => {
      const overallStatus = getClientOverallStatus(client.text)

      // Extrai o label do sistema e os contratos reais do texto
      let systemLabel = 'SGP'
      let rawText = client.text
      const labelMatch = client.text.match(/^\[(.*?)\]/)
      if (labelMatch) {
        systemLabel = labelMatch[1]
        rawText = client.text.replace(/^\[.*?\]\s*-\s*/, '')
      }

      // Calcula o resumo e os itens a partir de rawText
      const parts = rawText.split('|').map((p) => p.trim())
      parts.forEach((part) => {
        const status = getStatus(part)
        if (status === 'ativo') summary.ativos++
        else if (status === 'vel-red') summary.velRed++
        else if (status === 'suspenso') summary.suspensos++
        else if (status === 'cancelado') summary.cancelados++
        else if (status === 'inativo') summary.inativos++
      })

      const displayId = client.id.includes('|') ? client.id.split('|')[1] : client.id

      // Constrói as linhas de contrato em HTML
      const contractRowsHtml = parts
        .map((part) => {
          if (part.toLowerCase().includes('sem contratos') || part.trim() === '') {
            return `
            <div class="ati-client-contract-row ati-client-contract-row--empty">
              <span>${part}</span>
            </div>
          `
          }

          const partParts = part.split(' - ').map((s) => s.trim())
          const contractId = partParts[0] || 'Sem ID'
          let contractStatus = 'Inativo'
          let contractVenc = ''
          let contractPop = ''

          for (const sp of partParts) {
            if (sp.startsWith('Status:')) {
              contractStatus = sp.replace('Status:', '').trim()
            } else if (sp.startsWith('Venc:')) {
              contractVenc = sp.replace('Venc:', '').trim()
            } else if (sp.startsWith('Pop:')) {
              contractPop = sp.replace('Pop:', '').trim()
            }
          }

          const statusClass = getStatus(part)

          return `
          <div class="ati-client-contract-row">
            <span class="ati-contract-id">#${contractId}</span>
            ${contractPop ? `<span class="ati-contract-pop">${contractPop}</span>` : ''}
            ${contractVenc ? `<span class="ati-contract-venc">Dia ${contractVenc}</span>` : ''}
            <span class="ati-contract-status-badge ati-contract-status-badge--${statusClass}">${contractStatus}</span>
          </div>
        `
        })
        .join('')

      const btn = document.createElement('button')
      btn.className = `ati-client-modal-btn ati-client-modal-btn--${overallStatus}`
      btn.innerHTML = `
        <div class="ati-client-card-header">
          <span class="ati-client-card-system">${systemLabel}</span>
          <span class="ati-client-card-id">Cadastro ID ${displayId}</span>
        </div>
        <div class="ati-client-card-contracts">
          ${contractRowsHtml}
        </div>
      `

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
