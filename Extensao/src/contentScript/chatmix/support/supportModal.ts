// =================================================================
// MODAL DE SUPORTE — Lógica e Interface do Painel do Cliente
// =================================================================

import './supportModal.css'
import { ClientData, SgpContract, SgpData } from '../../sgp/types'
import { formatPhoneNumber, showToast, safeSendMessage } from '../helpers'
import { smartOpenSGP } from '../../sgp/actions'
import { currentChatId, setLastExtractedData } from '../state'
import { ensureFreshToken } from '../auth/session'
import type { SgpSupportData } from '../../../background/sgp/support'
import type { GetSgpFormParamsRequest, FetchSupportDataRequest } from '../../../background/types'
import { icon } from '../../../utils/iconSvgs'

function parseFriendlyExplanation(text: string): string {
  if (!text) return ''
  return text
    .split('<br>')
    .map((line) => {
      let iconSvg = ''
      let colorClass = ''

      if (line.includes('[WARN]')) {
        iconSvg = icon.alertTriangle
        colorClass = 'ati-diag-warn'
        line = line.replace('[WARN]', '')
      } else if (line.includes('[ALERT]')) {
        iconSvg = icon.alertTriangle
        colorClass = 'ati-diag-alert'
        line = line.replace('[ALERT]', '')
      } else if (line.includes('[ENERGIA]')) {
        iconSvg = icon.zap
        colorClass = 'ati-diag-energy'
        line = line.replace('[ENERGIA]', '')
      } else if (line.includes('[OFF]')) {
        iconSvg = icon.x
        colorClass = 'ati-diag-offline'
        line = line.replace('[OFF]', '')
      } else if (line.includes('[SLEEP]') || line.includes('[DORM]')) {
        iconSvg = icon.lock
        colorClass = 'ati-diag-dormant'
        line = line.replace(/\[SLEEP\]|\[DORM\]/, '')
      } else if (line.includes('[OK]')) {
        iconSvg = icon.check
        colorClass = 'ati-diag-ok'
        line = line.replace('[OK]', '')
      } else if (line.includes('[INFO]')) {
        iconSvg = icon.fileText
        colorClass = 'ati-diag-info'
        line = line.replace('[INFO]', '')
      } else {
        return `<div class="ati-diag-line">${line}</div>`
      }

      return `
        <div class="ati-diag-line ${colorClass}">
          <span class="ati-diag-icon">${iconSvg}</span>
          <span class="ati-diag-text">${line.trim()}</span>
        </div>
      `
    })
    .join('')
}

function showLoadingOverlay(message: string): HTMLElement {
  const loadingId = 'ati-support-loading-overlay'
  document.getElementById(loadingId)?.remove()

  const overlay = document.createElement('div')
  overlay.id = loadingId
  overlay.className = 'ati-support-modal-overlay'
  overlay.innerHTML = `
    <div class="ati-support-modal" style="max-width: 380px; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;">
      <div class="status-dot-pulsing" style="width: 20px; height: 20px;"></div>
      <div style="font-weight: 600; font-size: 15px; color: var(--text-white);">${message}</div>
      <div style="font-size: 12px; color: var(--text-muted);">Aguarde alguns instantes...</div>
    </div>
  `
  document.body.appendChild(overlay)
  return overlay
}

function hideLoadingOverlay() {
  document.getElementById('ati-support-loading-overlay')?.remove()
}

function showContractSelectionModal(contracts: SgpContract[], onSelect: (contract: SgpContract) => void, onCancel: () => void) {
  const modalId = 'ati-support-contract-selection-overlay'
  document.getElementById(modalId)?.remove()

  const overlay = document.createElement('div')
  overlay.id = modalId
  overlay.className = 'ati-support-modal-overlay'

  const getStatusClass = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes('cancelado') || lower.includes('inativo') || lower.includes('suspenso')) {
      return 'ati-support-status-badge--offline'
    }
    return 'ati-support-status-badge--online'
  }

  const getDotClass = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes('cancelado') || lower.includes('inativo') || lower.includes('suspenso')) {
      return 'status-dot-offline'
    }
    return 'status-dot-pulsing'
  }

  const getStatusText = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes('cancelado')) return 'Cancelado'
    if (lower.includes('inativo')) return 'Inativo'
    if (lower.includes('suspenso')) return 'Suspenso'
    return 'Ativo'
  }

  const contractsHtml = contracts
    .map((c) => {
      const statusClass = getStatusClass(c.text)
      const dotClass = getDotClass(c.text)
      const statusText = getStatusText(c.text)
      return `
        <button class="ati-contract-item-btn" data-contract-id="${c.id}">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 6px;">
            <span style="font-weight: 600; font-size: 13px; color: var(--text-white);">Contrato #${c.id}</span>
            <span class="ati-support-status-badge ${statusClass}">
              <span class="${dotClass}"></span>
              <span>${statusText}</span>
            </span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${c.text}">
            ${c.text}
          </div>
        </button>
      `
    })
    .join('')

  overlay.innerHTML = `
    <div class="ati-support-modal" style="max-width: 460px;">
      <div class="ati-support-modal-header">
        <div class="ati-support-modal-title"><span class="support-header-icon">${icon.clipboardList}</span> Selecione o Contrato</div>
        <button class="ati-support-modal-close" id="ati-support-select-close-x">&times;</button>
      </div>
      <div class="ati-support-modal-body">
        <p style="margin: 0 0 16px; font-size: 13px; color: var(--text-grey);">
          Este cliente possui múltiplos contratos. Selecione qual deseja verificar no painel de suporte:
        </p>
        <div class="ati-support-contracts-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 250px; overflow-y: auto; padding-right: 4px;">
          ${contractsHtml}
        </div>
      </div>
      <div class="ati-support-modal-footer">
        <button class="ati-support-close-btn" id="ati-support-select-cancel">Cancelar</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  const cleanup = () => {
    overlay.remove()
    document.removeEventListener('keydown', handleKeyDown)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanup()
      onCancel()
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  document.getElementById('ati-support-select-close-x')?.addEventListener('click', () => {
    cleanup()
    onCancel()
  })
  document.getElementById('ati-support-select-cancel')?.addEventListener('click', () => {
    cleanup()
    onCancel()
  })

  overlay.querySelectorAll('.ati-contract-item-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const contractId = btn.getAttribute('data-contract-id')
      const selected = contracts.find((c) => c.id === contractId)
      cleanup()
      if (selected) {
        onSelect(selected)
      } else {
        onCancel()
      }
    })
  })
}

function getPowerColor(valStr: string): string {
  if (!valStr || valStr === '--' || valStr.toLowerCase().includes('unknown') || valStr.toLowerCase().includes('invalid')) {
    return '#9ca3af'
  }
  const val = parseFloat(valStr)
  if (isNaN(val)) return '#9ca3af'

  if (val >= -8.0 || val < -27.0) {
    return '#f87171' // Crítico
  }
  if (val > -15.0 || val < -26.0) {
    return '#facc15' // Alerta
  }
  return '#4ade80' // Normal
}

function getPowerBadge(valStr: string): string {
  if (!valStr || valStr === '--' || valStr.toLowerCase().includes('unknown') || valStr.toLowerCase().includes('invalid')) {
    return ''
  }
  const val = parseFloat(valStr)
  if (isNaN(val)) return ''

  if (val >= -8.0 || val < -27.0) {
    return ' <span style="font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px; background: rgba(248, 113, 113, 0.2); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); margin-left: 6px;">CRÍTICO</span>'
  }
  if (val > -15.0 || val < -26.0) {
    return ' <span style="font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px; background: rgba(250, 204, 21, 0.2); color: #facc15; border: 1px solid rgba(250, 204, 21, 0.4); margin-left: 6px;">ALERTA</span>'
  }
  return ''
}

function renderSupportModal(clientData: ClientData, contract: SgpContract, supportData: SgpSupportData) {
  const modalId = 'ati-support-modal-root'
  document.getElementById(modalId)?.remove()

  const overlay = document.createElement('div')
  overlay.id = modalId
  overlay.className = 'ati-support-modal-overlay'

  const formattedPhone = clientData.phoneNumber ? formatPhoneNumber(clientData.phoneNumber) : 'Não informado'
  const cpfDisplay = clientData.cpfCnpj || 'Não informado'

  const statusBadgeClass = supportData.status === 'online' ? 'ati-support-status-badge--online' : 'ati-support-status-badge--offline'

  const statusDotClass = supportData.status === 'online' ? 'status-dot-pulsing' : 'status-dot-offline'

  const statusLabel = supportData.status === 'online' ? 'ONLINE' : 'OFFLINE'

  const rxOnuColor = getPowerColor(supportData.rxPowerOnu)
  const rxOltColor = getPowerColor(supportData.rxPowerOlt)

  overlay.innerHTML = `
    <div class="ati-support-modal">
      <div class="ati-support-modal-header">
        <div class="ati-support-modal-title"><span class="support-header-icon">${icon.settings}</span> Painel de Suporte - Contrato #${contract.id}</div>
        <button class="ati-support-modal-close" id="ati-support-close-x">&times;</button>
      </div>
      
      <div class="ati-support-modal-body">
        <!-- Informações do Cliente -->
        <div class="ati-support-section">
          <div class="ati-support-section-title">Informações do Cliente</div>
          <div class="ati-support-info-grid">
            <div class="ati-support-info-card">
              <div class="ati-support-info-label">Nome Completo</div>
              <div class="ati-support-info-value" title="${clientData.fullName}">${clientData.fullName}</div>
            </div>
            <div class="ati-support-info-card">
              <div class="ati-support-info-label">Telefone</div>
              <div class="ati-support-info-value">${formattedPhone}</div>
            </div>
            <div class="ati-support-info-card">
              <div class="ati-support-info-label">CPF / CNPJ</div>
              <div class="ati-support-info-value">${cpfDisplay}</div>
            </div>
          </div>
        </div>

        <!-- Conexão FTTx -->
        <div class="ati-support-section">
          <div class="ati-support-section-title">Conexão FTTx (${supportData.oltModel || 'OLT Nokia'})</div>
          <div class="ati-support-olt-box">
            <div class="ati-support-olt-header">
              <div class="ati-support-olt-title" title="${supportData.oltName}">${supportData.oltName}</div>
              <div class="ati-support-status-badge ${statusBadgeClass}">
                <span class="${statusDotClass}"></span>
                <span>${statusLabel}</span>
              </div>
            </div>
            
            <div class="ati-support-olt-details">
              <span>Slot: <strong>${supportData.slot}</strong></span>
              <span>PON: <strong>${supportData.pon}</strong></span>
              <span>ID: <strong>${supportData.onuId}</strong></span>
              <span>VLAN: <strong>${supportData.vlan}</strong></span>
              <span>Modo: <strong>${supportData.modo}</strong></span>
              <span>Addr: <strong>${supportData.addr}</strong></span>
            </div>

            <div class="ati-support-optics-grid">
              <div class="ati-support-optics-card">
                <div class="ati-support-optics-label">Tempo Online</div>
                <div class="ati-support-optics-value ati-support-optics-value--info" style="font-size:12px;">${supportData.uptime}</div>
              </div>
              <div class="ati-support-optics-card">
                <div class="ati-support-optics-label">Potência RX ONU</div>
                <div class="ati-support-optics-value" style="color: ${rxOnuColor}; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <span>${supportData.rxPowerOnu} ${supportData.rxPowerOnu === '--' ? '' : 'dBm'}</span>
                  ${getPowerBadge(supportData.rxPowerOnu)}
                </div>
              </div>
              <div class="ati-support-optics-card">
                <div class="ati-support-optics-label">Potência RX OLT</div>
                <div class="ati-support-optics-value" style="color: ${rxOltColor}; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <span>${supportData.rxPowerOlt} ${supportData.rxPowerOlt === '--' ? '' : 'dBm'}</span>
                  ${getPowerBadge(supportData.rxPowerOlt)}
                </div>
              </div>
            </div>

            <div class="ati-support-olt-details" style="grid-template-columns: 1fr 1fr; margin-top: 10px; margin-bottom: 0;">
              <span>Distância: <strong>${supportData.distance} ${supportData.distance === '--' ? '' : 'km'}</strong></span>
              <span>Temp ONU: <strong>${supportData.tempOnu} ${supportData.tempOnu === '--' ? '' : '°C'}</strong></span>
            </div>

            <!-- Informações de Conexão -->
            <div class="ati-support-section-title" style="margin-top: 16px; margin-bottom: 8px; color: #a7f3d0; border-bottom-color: rgba(167, 243, 208, 0.2); font-size: 10px;">Informações de Conexão</div>
            <div class="ati-support-olt-details" style="grid-template-columns: 1fr 1fr; margin-bottom: 0;">
              <span>IP: <strong>${supportData.ip || 'Não informado'}</strong></span>
              <span>MAC: <strong>${supportData.mac || 'Não informado'}</strong></span>
              <span>Protocolo: <strong>${supportData.protocolo || 'Não informado'}</strong></span>
              <span>NAS: <strong>${supportData.nas || 'Não informado'}</strong></span>
              <span style="grid-column: span 2;">Data Conexão: <strong>${supportData.dataConexao || 'Não informado'}</strong></span>
              ${
                supportData.status === 'offline' && supportData.dataQueda
                  ? `
                <span style="grid-column: span 2; color: #f87171;">Data Queda (Radius): <strong>${supportData.dataQueda}</strong></span>
                <span style="grid-column: span 2; color: #f87171;">Motivo Queda (Radius): <strong>${supportData.motivoQueda || 'Não informado'}</strong></span>
              `
                  : ''
              }
            </div>
          </div>
        </div>

        <!-- Análise da Conexão -->
        <div class="ati-support-section">
          <div class="ati-support-section-title">Análise da OLT</div>
          <div style="background: var(--bg-overlay-subtle); border: 1px solid var(--border-glass); border-radius: 10px; padding: 16px; font-size: 12.5px; line-height: 1.5; color: var(--text-main); display: flex; flex-direction: column; gap: 10px; max-height: 180px; overflow-y: auto;" class="ati-diag-container">
            ${parseFriendlyExplanation(supportData.friendlyExplanation)}
          </div>
        </div>

        <!-- Ações de Suporte -->
        <div class="ati-support-section">
          <div class="ati-support-section-title">Ações Rápidas</div>
          <div class="ati-support-actions-grid">
            <button class="ati-support-btn ati-support-btn--reset" id="ati-support-btn-reset">
              ${icon.refresh} Reset ONU
            </button>
            <button class="ati-support-btn ati-support-btn--command-send" id="ati-support-btn-tl1-send">
              ${icon.zap} TL1 Enviar Comandos
            </button>
            <button class="ati-support-btn ati-support-btn--command-remove" id="ati-support-btn-tl1-remove">
              ${icon.x} TL1 Remover Comandos
            </button>
            <button class="ati-support-btn ati-support-btn--sgp-contract" id="ati-support-btn-sgp-open">
              ${icon.globe} Abrir Contrato no SGP
            </button>
          </div>
        </div>
      </div>

      <div class="ati-support-modal-footer" style="display:flex; justify-content:space-between; align-items:center;">
        <button class="ati-support-close-btn" id="ati-support-btn-refresh" style="background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); color: #93c5fd; padding: 9px 16px;">
          ${icon.refresh} Refazer Busca
        </button>
        <button class="ati-support-close-btn" id="ati-support-close-footer">Fechar</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  // --- Helpers de fechamento ---
  const closeModal = () => {
    overlay.remove()
    document.removeEventListener('keydown', handleKeyDown)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal()
    }
  }

  // --- Handlers de Fechamento ---
  document.getElementById('ati-support-close-x')?.addEventListener('click', closeModal)
  document.getElementById('ati-support-close-footer')?.addEventListener('click', closeModal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal()
    }
  })
  document.addEventListener('keydown', handleKeyDown)

  // --- Handlers de Ação ---
  document.getElementById('ati-support-btn-reset')?.addEventListener('click', async () => {
    if (!supportData.sgpOnuId) {
      showToast('ID da ONU não identificado para esta ação.', 'error')
      return
    }
    const baseUrl = supportData.sgpUrl || contract.baseUrl || ''
    showToast(`Enviando sinal de reinicialização para ONU Nokia na OLT (ID: ${supportData.onuId})...`, 'info', 3000)
    try {
      const response = await safeSendMessage<any>({
        action: 'executeOnuCommand',
        baseUrl,
        sgpOnuId: supportData.sgpOnuId,
        command: 'reset',
      })
      if (response?.success) {
        showToast('ONU reiniciada com sucesso!', 'success', 4000)
      } else {
        showToast(`Erro ao reiniciar ONU: ${response?.error || 'Erro desconhecido'}`, 'error')
      }
    } catch (err: any) {
      showToast(`Falha na requisição: ${err.message || err}`, 'error')
    }
  })

  document.getElementById('ati-support-btn-tl1-send')?.addEventListener('click', async () => {
    if (!supportData.sgpOnuId) {
      showToast('ID da ONU não identificado para esta ação.', 'error')
      return
    }
    const baseUrl = supportData.sgpUrl || contract.baseUrl || ''
    showToast(`Enviando comandos TL1 para OLT (Slot: ${supportData.slot} / PON: ${supportData.pon})...`, 'info', 3000)
    try {
      const response = await safeSendMessage<any>({
        action: 'executeOnuCommand',
        baseUrl,
        sgpOnuId: supportData.sgpOnuId,
        command: 'tl1-add',
      })
      if (response?.success) {
        showToast('Comandos TL1 enviados com sucesso!', 'success', 4000)
      } else {
        showToast(`Erro ao enviar comandos TL1: ${response?.error || 'Erro desconhecido'}`, 'error')
      }
    } catch (err: any) {
      showToast(`Falha na requisição: ${err.message || err}`, 'error')
    }
  })

  document.getElementById('ati-support-btn-tl1-remove')?.addEventListener('click', async () => {
    if (!supportData.sgpOnuId) {
      showToast('ID da ONU não identificado para esta ação.', 'error')
      return
    }
    const baseUrl = supportData.sgpUrl || contract.baseUrl || ''
    showToast('Removendo comandos TL1 da ONU na OLT...', 'info', 3000)
    try {
      const response = await safeSendMessage<any>({
        action: 'executeOnuCommand',
        baseUrl,
        sgpOnuId: supportData.sgpOnuId,
        command: 'tl1-delete',
      })
      if (response?.success) {
        showToast('Comandos TL1 removidos com sucesso!', 'success', 4000)
      } else {
        showToast(`Erro ao remover comandos TL1: ${response?.error || 'Erro desconhecido'}`, 'error')
      }
    } catch (err: any) {
      showToast(`Falha na requisição: ${err.message || err}`, 'error')
    }
  })

  document.getElementById('ati-support-btn-sgp-open')?.addEventListener('click', async () => {
    showToast('Abrindo contratos do cliente no SGP...', 'info', 2000)
    try {
      const baseUrl = supportData.sgpUrl || contract.baseUrl || supportData.oltName
      if (baseUrl && baseUrl.startsWith('http')) {
        const url = `${baseUrl}/admin/cliente/${contract.clientId}/contratos/`
        window.open(url, '_blank')
        closeModal()
      } else {
        await smartOpenSGP(clientData, currentChatId ?? undefined)
        closeModal()
      }
    } catch (err: any) {
      showToast(`Erro ao abrir contrato: ${err.message || err}`, 'error')
    }
  })

  // --- Botão Refazer Busca ---
  document.getElementById('ati-support-btn-refresh')?.addEventListener('click', async () => {
    closeModal()
    const chatId = currentChatId
    if (chatId) {
      const cacheKey = `ati_support_cache_${chatId}`
      await chrome.storage.local.remove(cacheKey)
      showToast('Limpando cache e refazendo busca na OLT...', 'info', 2000)
    }
    showSupportModal(clientData)
  })
}

export async function showSupportModal(clientData: ClientData): Promise<void> {
  const chatId = currentChatId
  if (!chatId) {
    showToast('Não foi possível identificar o ID do atendimento atual.', 'error')
    return
  }

  // 1. Verifica cache local
  const cacheKey = `ati_support_cache_${chatId}`
  try {
    const cacheResult = await chrome.storage.local.get(cacheKey)
    const cached = cacheResult[cacheKey]
    if (cached) {
      renderSupportModal(clientData, cached.contract, cached.supportData)
      return
    }
  } catch (err) {
    console.warn('Extensão ATI: Erro ao ler cache de suporte.', err)
  }

  // 2. Sem cache, inicia fluxo de busca
  showLoadingOverlay('Identificando cliente e contratos no SGP...')

  try {
    const session = await ensureFreshToken()
    if (!session) {
      hideLoadingOverlay()
      showToast('Sessão expirada. Faça login novamente.', 'error')
      return
    }

    // Busca os dados do cliente (incluindo contratos) no SGP via background
    const response = await safeSendMessage<GetSgpFormParamsRequest>({
      action: 'getSgpFormParams',
      clientData,
      chatId,
      idToken: session.idToken,
      uid: session.uid,
    })

    if (!response?.success || !response.data) {
      hideLoadingOverlay()
      showToast(response?.message || 'Falha ao buscar dados no SGP.', 'error')
      return
    }

    const sgpData = response.data as SgpData

    // Sincroniza o ID e a origem consolidados de volta para o estado local da extensão
    if (sgpData.clientSgpId && sgpData.clientSgpOrigin) {
      clientData.clientSgpId = sgpData.clientSgpId
      clientData.clientSgpOrigin = sgpData.clientSgpOrigin
      setLastExtractedData(chatId, clientData)
      console.log(`Extensão ATI: ID do cliente (${sgpData.clientSgpId}) e origem (${sgpData.clientSgpOrigin}) sincronizados no estado local.`)
    }

    const contracts = sgpData.contracts || []

    if (contracts.length === 0) {
      hideLoadingOverlay()
      showToast('Nenhum contrato ativo encontrado para este cliente.', 'error')
      return
    }

    const loadSupportForContract = async (contract: SgpContract) => {
      showLoadingOverlay('Carregando potência e dados de sinal da OLT Nokia...')
      try {
        const supportRes = await safeSendMessage<FetchSupportDataRequest>({
          action: 'fetchSupportData',
          baseUrl: contract.baseUrl || sgpData.clientSgpOrigin || '',
          contractId: contract.id,
          clientId: contract.clientId,
        })

        hideLoadingOverlay()

        if (supportRes?.success && supportRes.data) {
          const supportData = supportRes.data as SgpSupportData
          // Salva no cache local
          await chrome.storage.local.set({
            [cacheKey]: {
              contract,
              clientData,
              supportData,
            },
          })
          // Renderiza o modal
          renderSupportModal(clientData, contract, supportData)
        } else {
          showToast(supportRes?.error || 'Erro ao carregar dados de potência da OLT.', 'error')
        }
      } catch (err: any) {
        hideLoadingOverlay()
        showToast(`Falha de conexão com a OLT: ${err.message || err}`, 'error')
      }
    }

    // Se houver apenas 1 contrato, vai direto
    if (contracts.length === 1) {
      await loadSupportForContract(contracts[0])
    } else {
      // Múltiplos contratos, exibe modal de seleção
      hideLoadingOverlay()
      showContractSelectionModal(
        contracts,
        (selectedContract) => {
          loadSupportForContract(selectedContract)
        },
        () => {
          console.log('Seleção de contrato cancelada.')
        },
      )
    }
  } catch (error: any) {
    hideLoadingOverlay()
    showToast(`Erro ao carregar dados: ${error.message || error}`, 'error')
  }
}
