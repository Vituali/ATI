// =================================================================
// SGP — OCORRÊNCIAS E ABERTURA DE ABAS
// =================================================================

import { ClientData } from './constants'
import { getSgpStatus } from './auth'
import { findClientInSgp } from './search'
import { fetchContractOnlineStatus, buildContracts, extractOptions } from './contracts'
import { hasSgpFormCache, getSgpFormCache, setSgpFormCache } from './cache'
import { SgpData, SgpContract, SgpUser, SgpOccurrenceType } from '../../contentScript/sgp/types'

export async function focusOrOpenTab(url: string, clientId?: string): Promise<void> {
  if (clientId) {
    // Busca abas do SGP pelo título: "SGP - NOME DO CLIENTE (19433)"
    // Isso funciona independente da rota atual (/contratos/, /servicos/, etc.)
    const sgpTabs = await chrome.tabs.query({
      url: ['https://sgp.atiinternet.com.br/admin/*', 'http://201.158.20.35:8000/admin/*', 'http://201.158.20.53:8000/admin/*'],
    })

    const titlePattern = new RegExp(`SGP - .+\\(${clientId}\\)`)
    const match = sgpTabs.find((tab) => tab.title && titlePattern.test(tab.title))

    if (match) {
      console.log(`Extensão ATI: Focando aba existente do cliente ${clientId} pelo título — "${match.title}"`)
      await chrome.tabs.update(match.id!, { active: true })
      await chrome.windows.update(match.windowId!, { focused: true })
      return
    }
  }

  console.log(`Extensão ATI: Abrindo nova aba — ${url}`)
  await chrome.tabs.create({ url })
}

export async function handleOpenInSgp(clientData: ClientData, cachedContract: string | null, forceClientId?: string, uid?: string): Promise<any> {
  // Forçamos uma verificação real de login para garantir que não vamos abrir uma aba
  // que caia na tela de login (especialmente se o ID vier do cache ou for extraído do DOM).
  const { isLoggedIn, baseUrl } = await getSgpStatus(true)

  if (cachedContract) {
    console.log(`Extensão ATI: Usando contrato cacheado — ${cachedContract}`)
    const url = `${baseUrl}/admin/clientecontrato/${cachedContract}/change/`
    await focusOrOpenTab(url, cachedContract)
    return { success: true, clientId: cachedContract }
  }

  if (!isLoggedIn) {
    console.warn('Extensão ATI: Não logado no SGP, abrindo login...')
    await focusOrOpenTab(`${baseUrl}/accounts/login/`)
    return { success: true }
  }

  if (forceClientId) {
    console.log(`Extensão ATI: ID do cliente forçado — ID ${forceClientId}`)
    await focusOrOpenTab(`${baseUrl}/admin/cliente/${forceClientId}/contratos/`, forceClientId)
    return { success: true, clientId: forceClientId }
  }

  if (clientData.clientSgpId) {
    // Só utiliza o ID extraído do DOM se ele pertencer EXATAMENTE ao mesmo ambiente (baseUrl) atual
    if (clientData.clientSgpOrigin === baseUrl) {
      console.log(`Extensão ATI: ID do cliente extraído do DOM — ID ${clientData.clientSgpId}`)
      await focusOrOpenTab(`${baseUrl}/admin/cliente/${clientData.clientSgpId}/contratos/`, clientData.clientSgpId)
      return { success: true, clientId: clientData.clientSgpId }
    } else {
      console.log(`Extensão ATI: ID ${clientData.clientSgpId} ignorado pois a origem (${clientData.clientSgpOrigin || 'desconhecida'}) não coincide com o ambiente ativo (${baseUrl}). Forçando nova busca...`)
    }
  }

  const hasData = clientData.clientSgpId || clientData.cpfCnpj || (clientData.fullName && clientData.fullName !== 'Cliente') || clientData.phoneNumber

  if (!hasData) {
    console.warn('Extensão ATI: Sem dados do cliente, abrindo admin como fallback.')
    await focusOrOpenTab(`${baseUrl}/admin/`)
    return { success: true }
  }

  const clients = await findClientInSgp(baseUrl, clientData, uid)

  if (clients && clients.length > 0) {
    if (clients.length === 1) {
      const client = clients[0]
      console.log(`Extensão ATI: Cliente encontrado — ID ${client.id}`)
      await focusOrOpenTab(`${baseUrl}/admin/cliente/${client.id}/contratos/`, client.id)
      return { success: true, clientId: client.id }
    } else {
      console.log(`Extensão ATI: Múltiplos clientes encontrados — ${clients.length} opções`)

      const enrichedClients = await Promise.all(
        clients.map(async (client) => {
          try {
            const url = `${baseUrl}/admin/atendimento/cliente/${client.id}/ocorrencia/add/`
            const response = await fetch(url, {
              credentials: 'include',
              signal: AbortSignal.timeout(8000),
            })
            if (!response.ok) throw new Error('Network response was not ok')
            const html = await response.text()

            const initialContracts = extractOptions(html, /<select[^>]+id=['"]id_clientecontrato['"][^>]*>([\s\S]*?)<\/select>/)
            const needsOnlineStatus = initialContracts.some((c) => {
              const lower = c.text.toLowerCase()
              return !lower.includes('cancelado') && !lower.includes('inativo') && !lower.includes('suspenso')
            })

            const onlineStatusMap = needsOnlineStatus ? await fetchContractOnlineStatus(baseUrl, client.id) : new Map<string, boolean>()

            const contracts = await buildContracts(baseUrl, client, html, false, onlineStatusMap)

            const clientText = contracts.length > 0 ? contracts.map((c) => c.text).join(' | ') : 'Sem contratos ativos'

            return { id: client.id, text: clientText }
          } catch (e) {
            console.warn(`Extensão ATI: Erro ao buscar contratos para cliente ${client.id}.`, e)
            return { id: client.id, text: 'Erro ao buscar contratos ou sem contratos' }
          }
        }),
      )

      return { success: true, multipleClients: true, clients: enrichedClients }
    }
  } else {
    console.warn('Extensão ATI: Cliente não encontrado, abrindo admin geral.')
    await focusOrOpenTab(`${baseUrl}/admin/`)
    return { success: true }
  }
}

export async function getSgpFormParams(clientData: ClientData, chatId: string, idToken: string, uid?: string): Promise<SgpData> {
  const { isLoggedIn, baseUrl } = await getSgpStatus()
  if (!isLoggedIn) throw new Error('Não está logado no SGP.')

  const clientKey = clientData.clientSgpId || clientData.cpfCnpj || clientData.phoneNumber || clientData.fullName || chatId

  // Adiciona o baseUrl na chave para evitar que IDs de um ambiente (.35)
  // sejam usados em outro (.53) onde podem ser diferentes.
  const cacheKey = `${baseUrl}_${clientKey}`

  if (await hasSgpFormCache(cacheKey)) {
    console.log(`Extensão ATI: Usando cache SGP (cacheKey: ${cacheKey}) para atendimento ${chatId}`)
    return (await getSgpFormCache(cacheKey)) as SgpData
  }

  const clients = await findClientInSgp(baseUrl, clientData, uid)
  if (!clients || clients.length === 0) throw new Error('Cliente não encontrado no SGP.')

  console.log(`Extensão ATI: Buscando dados do formulário para ${clients.length} cliente(s).`)

  let allContracts: SgpContract[] = []
  let responsibleUsers: SgpUser[] = []
  let occurrenceTypes: SgpOccurrenceType[] = []

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i]
    const url = `${baseUrl}/admin/atendimento/cliente/${client.id}/ocorrencia/add/`

    try {
      const response = await fetch(url, {
        credentials: 'include',
        signal: AbortSignal.timeout(10000),
      })
      const html = await response.text()

      if (html.includes('id_username') && html.includes('id_password')) {
        await chrome.storage.local.remove('sgp_status_cache')
        throw new Error('Sua sessão no SGP expirou. Faça o login novamente.')
      }

      const initialContracts = extractOptions(html, /<select[^>]+id=['"]id_clientecontrato['"][^>]*>([\s\S]*?)<\/select>/)
      const needsOnlineStatus = initialContracts.some((c) => {
        const lower = c.text.toLowerCase()
        return !lower.includes('cancelado') && !lower.includes('inativo') && !lower.includes('suspenso')
      })

      // Busca status online/offline dos contratos deste cliente apenas se necessário
      const onlineStatusMap = needsOnlineStatus ? await fetchContractOnlineStatus(baseUrl, client.id) : new Map<string, boolean>()

      const contracts = await buildContracts(baseUrl, client, html, clients.length > 1, onlineStatusMap)

      allContracts = allContracts.concat(contracts)

      if (i === 0) {
        responsibleUsers = extractOptions(html, /<select[^>]+id=['"]id_responsavel['"][^>]*>([\s\S]*?)<\/select>/).map((u) => ({ id: u.id, username: u.text.toLowerCase() }))
        occurrenceTypes = extractOptions(html, /<select[^>]+id=['"]id_tipo['"][^>]*>([\s\S]*?)<\/select>/)
      }
    } catch (error) {
      console.error(`Extensão ATI: Falha ao buscar dados para cliente ${client.id}.`, error)
      throw error
    }
  }

  if (allContracts.length === 0) throw new Error('Nenhum contrato encontrado.')

  const result = {
    clientSgpId: clients[0].id,
    contracts: allContracts,
    responsibleUsers,
    occurrenceTypes,
  }

  await setSgpFormCache(cacheKey, result)
  return result
}

// Nova função exclusiva para atualizar status sem sobrecarregar SGP
export async function refreshSgpOnlineStatuses(clientData: ClientData, chatId: string): Promise<SgpData | null> {
  const { baseUrl } = await getSgpStatus()

  const clientKey = clientData?.clientSgpId || clientData?.cpfCnpj || clientData?.phoneNumber || clientData?.fullName || chatId

  const cacheKey = `${baseUrl}_${clientKey}`
  const cached = await getSgpFormCache(cacheKey)
  if (!cached || !cached.clientSgpId) return null

  try {
    const needsOnlineStatus = cached.contracts.some((c: SgpContract) => {
      // @ts-ignore
      const textLower = (c.text || '').toLowerCase()
      return !textLower.includes('cancelado') && !textLower.includes('inativo') && !textLower.includes('suspenso')
    })

    const onlineMap = needsOnlineStatus ? await fetchContractOnlineStatus(baseUrl, cached.clientSgpId) : new Map<string, boolean>()

    cached.contracts = cached.contracts.map((contract: SgpContract) => ({
      ...contract,
      online: onlineMap.has(contract.id) ? onlineMap.get(contract.id) : null,
    }))

    await setSgpFormCache(cacheKey, cached)
    return cached
  } catch (error) {
    console.error('Extensão ATI: Falha ao renovar status online.', error)
    return cached
  }
}

export async function createOccurrenceVisually(data: Record<string, any>): Promise<void> {
  const { isLoggedIn, baseUrl } = await getSgpStatus(true)
  if (!isLoggedIn) throw new Error('Não está logado no SGP.')

  const requestId = Math.random().toString(36).substring(2, 9)
  const url = `${baseUrl}/admin/atendimento/cliente/${data.clientSgpId}/ocorrencia/add/?ati_req_id=${requestId}`

  await chrome.storage.local.set({ [`pendingSgpData_${requestId}`]: data })
  await chrome.tabs.create({ url, active: true })
}
