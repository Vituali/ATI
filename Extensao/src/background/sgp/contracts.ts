// =================================================================
// SGP — CONTRATOS E STATUS ONLINE/OFFLINE
// =================================================================

import { SgpClient } from './constants'

export function extractOptions(html: string, selectIdRegex: RegExp): { id: string; text: string }[] {
  const match = html.match(selectIdRegex)
  const options: { id: string; text: string }[] = []
  if (match?.[1]) {
    const optionRegex = /<option[^>]+value=['"](\d+)['"][^>]*>([\s\S]*?)<\/option>/g
    let m
    while ((m = optionRegex.exec(match[1])) !== null) {
      if (m[1]) options.push({ id: m[1], text: m[2].trim().replace(/&nbsp;/g, ' ') })
    }
  }
  return options
}

// Busca status online/offline de cada contrato na página /contratos/ do cliente
// Estrutura do SGP: <td> CONTRATO_ID </td> ... <span class="badge red">Offline</span>
//                                           ou <span class="badge green">Online</span>
export async function fetchContractOnlineStatus(baseUrl: string, clientId: string): Promise<Map<string, boolean>> {
  const statusMap = new Map<string, boolean>()

  try {
    const response = await fetch(`${baseUrl}/admin/cliente/${clientId}/contratos/`, {
      credentials: 'include',
      signal: AbortSignal.timeout(8000),
    })
    const html = await response.text()

    // Extrai cada <tr> da tabela de contratos
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
    let rowMatch

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const row = rowMatch[1]

      // Pega o primeiro <td> — contém o ID do contrato
      const idMatch = row.match(/<td[^>]*>\s*(\d+)\s*<\/td>/)
      if (!idMatch) continue

      const contratoId = idMatch[1]

      // Verifica badge online/offline dentro da mesma linha
      const isOnline = /badge green/i.test(row)
      const isOffline = /badge red/i.test(row)

      if (isOnline || isOffline) {
        statusMap.set(contratoId, isOnline)
        console.log(`Extensão ATI: Contrato ${contratoId} — ${isOnline ? '[ONLINE]' : '[OFFLINE]'}`)
      }
    }
  } catch (error) {
    console.warn(`Extensão ATI: Não foi possível buscar status dos contratos.`, error)
  }

  return statusMap
}

export async function buildContracts(baseUrl: string, client: SgpClient, html: string, multipleClients: boolean, onlineStatusMap?: Map<string, boolean>): Promise<any[]> {
  const initialContracts = extractOptions(html, /<select[^>]+id=['"]id_clientecontrato['"][^>]*>([\s\S]*?)<\/select>/)

  // Recupera endereços previamente cacheados em lote
  const cacheKeys = initialContracts.map((c) => `contract_addr_${c.id}`)
  const cachedData = await chrome.storage.local.get(cacheKeys)

  const mappedContracts = initialContracts.map((c) => ({
    ...c,
    clientId: client.id,
    baseUrl: baseUrl,
    text: multipleClients ? `[Cadastro ${client.id}] ${c.text}` : c.text,
    online: onlineStatusMap && onlineStatusMap.has(c.id) ? onlineStatusMap.get(c.id) : null,
    cancelled: c.text.toLowerCase().includes('cancelado'),
  }))

  // Busca endereço de cada contrato
  const contractsWithAddress = await Promise.all(
    mappedContracts.map(async (contract) => {
      const lowerText = contract.text.toLowerCase()
      if (contract.cancelled || lowerText.includes('inativo') || lowerText.includes('suspenso')) {
        return contract
      }

      // 1. Tenta recuperar do cache local
      const cachedAddr = cachedData[`contract_addr_${contract.id}`]
      if (cachedAddr) {
        console.log(`Extensão ATI: Endereço cacheado encontrado para contrato ${contract.id}: ${cachedAddr}`)
        return { ...contract, text: `${contract.text} - ${cachedAddr}` }
      }

      // 2. Se não estiver no cache, realiza a busca
      try {
        const servRes = await fetch(`${baseUrl}/admin/clientecontrato/servico/list/ajax/?contrato_id=${contract.id}`, { credentials: 'include', signal: AbortSignal.timeout(8000) })
        const services = await servRes.json()
        if (services?.length > 0 && services[0].id) {
          const detailRes = await fetch(`${baseUrl}/admin/atendimento/ocorrencia/servico/detalhe/ajax/?servico_id=${services[0].id}&contrato_id=${contract.id}`, { credentials: 'include', signal: AbortSignal.timeout(8000) })
          const details = await detailRes.json()
          if (details?.length > 0 && details[0]?.end_instalacao) {
            const address = details[0].end_instalacao
            await chrome.storage.local.set({ [`contract_addr_${contract.id}`]: address })
            return { ...contract, text: `${contract.text} - ${address}` }
          }
        }
      } catch {
        console.warn(`Extensão ATI: Sem endereço para contrato ${contract.id}.`)
      }
      return contract
    }),
  )

  return contractsWithAddress
}
