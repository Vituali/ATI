import { ClientData, SGP_IP_35, SGP_IP_53 } from './constants'
import { getSgpStatus, updateSgpStatusCache, ensureSgpSession } from './auth'
import { findClientInSgp } from './search'
import { fetchContractOnlineStatus, buildContracts, extractOptions } from './contracts'
import { hasSgpFormCache, getSgpFormCache, setSgpFormCache } from './cache'
import { SgpData, SgpContract, SgpUser, SgpOccurrenceType } from '../../contentScript/sgp/types'

const getTs = () => `[${new Date().toLocaleTimeString('pt-BR')}]`

const sgpScrapeMemoryCache = new Map<string, {
  contracts: SgpContract[]
  responsibleUsers: SgpUser[]
  occurrenceTypes: SgpOccurrenceType[]
  timestamp: number
}>()

function getScrapeCache(key: string) {
  const cached = sgpScrapeMemoryCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.timestamp > 120000) { // 2 minutos TTL
    sgpScrapeMemoryCache.delete(key)
    return null
  }
  return cached
}

function setScrapeCache(key: string, data: { contracts: SgpContract[]; responsibleUsers: SgpUser[]; occurrenceTypes: SgpOccurrenceType[] }) {
  if (sgpScrapeMemoryCache.size > 20) {
    sgpScrapeMemoryCache.clear()
  }
  sgpScrapeMemoryCache.set(key, { ...data, timestamp: Date.now() })
}

export async function focusOrOpenTab(url: string, clientId?: string): Promise<void> {
  if (clientId) {
    // Busca abas do SGP pelo título: "SGP - NOME DO CLIENTE (19433)"
    // Isso funciona independente da rota atual (/contratos/, /servicos/, etc.)
    const sgpTabs = await chrome.tabs.query({
      url: ['http://201.158.20.35:8000/admin/*', 'http://201.158.20.53:8000/admin/*'],
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

async function enrichSgpClient(baseUrl: string, client: { id: string; text: string }, label: string, fastEnrich = false): Promise<{ id: string; text: string; systemLabel: string; baseUrl: string; isActive: boolean }> {
  const tStart = performance.now()
  try {
    const url = `${baseUrl}/admin/atendimento/cliente/${client.id}/ocorrencia/add/`
    const response = await fetch(url, {
      credentials: 'include',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Network response was not ok')
    const html = await response.text()

    const initialContracts = extractOptions(html, /<select[^>]+id=['"]id_clientecontrato['"][^>]*>([\s\S]*?)<\/select>/)
    
    let contracts: any[] = []
    if (fastEnrich) {
      // Fast path: mapeia contratos sem fazer requisições de status online e endereço
      contracts = initialContracts.map((c) => ({
        ...c,
        clientId: client.id,
        baseUrl: baseUrl,
        text: c.text,
        online: null,
        cancelled: c.text.toLowerCase().includes('cancelado'),
      }))
    } else {
      const needsOnlineStatus = initialContracts.some((c) => {
        const lower = c.text.toLowerCase()
        return !lower.includes('cancelado') && !lower.includes('inativo') && !lower.includes('suspenso')
      })

      const onlineStatusMap = needsOnlineStatus ? await fetchContractOnlineStatus(baseUrl, client.id) : new Map<string, boolean>()
      contracts = await buildContracts(baseUrl, client, html, false, onlineStatusMap)
    }

    const clientText = contracts.length > 0 ? contracts.map((c) => c.text).join(' | ') : 'Sem contratos ativos'
    
    // Verifica se algum contrato está ativo
    const isActive = contracts.some((c) => {
      const lower = c.text.toLowerCase()
      return lower.includes('ativo') && !lower.includes('inativo')
    })

    if (!fastEnrich) {
      // Extrai e armazena em cache de memória os dados do formulário raspados
      const responsibleUsers = extractOptions(html, /<select[^>]+id=['"]id_responsavel['"][^>]*>([\s\S]*?)<\/select>/).map((u) => ({ id: u.id, username: u.text.toLowerCase() }))
      const occurrenceTypes = extractOptions(html, /<select[^>]+id=['"]id_tipo['"][^>]*>([\s\S]*?)<\/select>/)
      setScrapeCache(`${baseUrl}_${client.id}`, { contracts, responsibleUsers, occurrenceTypes })
    }

    const tEnd = performance.now()
    console.log(`${getTs()} ⏱️ [ATI Perf] Enriquecimento do cliente ID ${client.id} em ${label} demorou ${(tEnd - tStart).toFixed(1)}ms. (FastEnrich: ${fastEnrich})`)

    return { 
      id: client.id, 
      text: clientText, 
      systemLabel: label, 
      baseUrl, 
      isActive 
    }
  } catch (e) {
    console.warn(`Extensão ATI: Erro ao buscar contratos para cliente ${client.id} em ${baseUrl}.`, e)
    const tEndErr = performance.now()
    console.log(`${getTs()} ⏱️ [ATI Perf] Enriquecimento com ERRO para cliente ID ${client.id} em ${label} demorou ${(tEndErr - tStart).toFixed(1)}ms.`)
    return { 
      id: client.id, 
      text: client.text || 'Erro ao buscar contratos ou sem contratos', 
      systemLabel: label, 
      baseUrl, 
      isActive: false 
    }
  }
}

async function searchAndEnrich(baseUrl: string, label: string, clientData: ClientData, uid?: string): Promise<any[]> {
  try {
    // 1. Garante que está autenticado de forma rápida e segura
    await ensureSgpSession(baseUrl)
    
    // 2. Realiza a busca de cliente no SGP correspondente
    const clients = await findClientInSgp(baseUrl, clientData, uid)
    if (!clients || clients.length === 0) return []
    
    // 3. Enriquece os clientes encontrados
    const enrichmentPromises = clients.map((c) => enrichSgpClient(baseUrl, c, label))
    return await Promise.all(enrichmentPromises)
  } catch (error) {
    console.error(`Extensão ATI: Erro na busca/enriquecimento em ${label} (${baseUrl}):`, error)
    return []
  }
}

export async function handleOpenInSgp(clientData: ClientData, cachedContract: string | null, forceClientId?: string, uid?: string, forceShowModal?: boolean): Promise<any> {
  const tTotalStart = performance.now()
  // 1. Checagem rápida não-forçada da sessão (usa cache)
  const { isLoggedIn, baseUrl } = await getSgpStatus(false)

  if (cachedContract) {
    console.log(`Extensão ATI: Usando contrato cacheado — ${cachedContract}`)
    const url = `${baseUrl}/admin/clientecontrato/${cachedContract}/change/`
    await focusOrOpenTab(url, cachedContract)
    return { success: true, clientId: cachedContract }
  }

  let targetBaseUrl = baseUrl
  let targetClientId = forceClientId

  if (targetClientId) {
    console.log(`Extensão ATI: ID do cliente forçado — ID ${targetClientId} em ${targetBaseUrl}`)
    await focusOrOpenTab(`${targetBaseUrl}/admin/cliente/${targetClientId}/contratos/`, targetClientId)
    return { success: true, clientId: targetClientId }
  }

  if (!forceShowModal && clientData.clientSgpId) {
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

  console.log('Extensão ATI: Iniciando busca rápida paralela nos SGPs...')
  const tBuscaStart = performance.now()

  // 1. Garante autenticação rápida em ambos (usa cache)
  await Promise.all([
    ensureSgpSession(SGP_IP_35).catch(() => null),
    ensureSgpSession(SGP_IP_53).catch(() => null)
  ])

  // 2. Realiza a busca autocomplete simples em paralelo nos dois sistemas (ultra-rápido!)
  const [clientsPrincipal, clientsReserva] = await Promise.all([
    findClientInSgp(SGP_IP_35, clientData, uid).catch(() => null),
    findClientInSgp(SGP_IP_53, clientData, uid).catch(() => null)
  ])

  const foundPrincipal = (clientsPrincipal || []).map(c => ({ ...c, baseUrl: SGP_IP_35, systemLabel: 'Principal' }))
  const foundReserva = (clientsReserva || []).map(c => ({ ...c, baseUrl: SGP_IP_53, systemLabel: 'Reserva (IP 53)' }))
  const allFound = [...foundPrincipal, ...foundReserva]

  if (allFound.length === 0) {
    console.warn('Extensão ATI: Cliente não encontrado em nenhum dos sistemas.')
    await focusOrOpenTab(`${baseUrl}/admin/`)
    return { success: true }
  }

  // Se houver exatamente 1 cliente em todo o ecossistema, abre direto imediatamente (FAST PATH: sem enriquecimento!)
  if (!forceShowModal && allFound.length === 1) {
    const client = allFound[0]
    const tTotalEnd = performance.now()
    console.log(`${getTs()} ⏱️ [ATI Perf] Total handleOpenInSgp (FAST PATH) demorou ${(tTotalEnd - tTotalStart).toFixed(1)}ms.`)
    await focusOrOpenTab(`${client.baseUrl}/admin/cliente/${client.id}/contratos/`, client.id)
    return { success: true, clientId: client.id }
  }

  // Caso contrário, faz o enriquecimento em paralelo apenas dos cadastros encontrados para desempate!
  console.log(`Extensão ATI: Múltiplos candidatos encontrados (${allFound.length}). Iniciando enriquecimento para desempate...`)
  const enrichmentPromises = allFound.map((c) => enrichSgpClient(c.baseUrl, c, c.systemLabel, true))
  const allClients = await Promise.all(enrichmentPromises)

  const tTotalEnd = performance.now()
  console.log(`${getTs()} ⏱️ [ATI Perf] Total handleOpenInSgp (DETAILED PATH) demorou ${(tTotalEnd - tTotalStart).toFixed(1)}ms.`)

  // Se houver múltiplos cadastros, mas apenas 1 ATIVO em todo o ecossistema, vai direto
  const activeClients = allClients.filter((c) => c.isActive)
  if (!forceShowModal && activeClients.length === 1) {
    const client = activeClients[0]
    await focusOrOpenTab(`${client.baseUrl}/admin/cliente/${client.id}/contratos/`, client.id)
    return { success: true, clientId: client.id }
  }

  // Se houver mais de 1 cadastro ativo ou nenhum ativo, exibe o modal de seleção
  console.log(`Extensão ATI: Exibindo modal para seleção entre ${allClients.length} opções...`)
  const formattedClients = allClients.map((c) => ({
    id: `${c.baseUrl}|${c.id}`,
    text: `[${c.systemLabel}] - ${c.text}`
  }))

  return { success: true, multipleClients: true, clients: formattedClients }
}

export async function getSgpFormParams(clientData: ClientData, chatId: string, idToken: string, uid?: string): Promise<SgpData> {
  const tTotalStart = performance.now()

  // 1. Verifica se o usuário forçou um SGP manualmente para este atendimento (evita loop infinito se ele quiser trocar de SGP no modal)
  const forceResult = await chrome.storage.local.get(`ati_manual_sgp_force_${chatId}`)
  const forcedSgp = forceResult[`ati_manual_sgp_force_${chatId}`]

  let targetBaseUrl = forcedSgp || (await getSgpStatus()).baseUrl

  const hasData = !forcedSgp && (clientData.clientSgpId || clientData.cpfCnpj || (clientData.fullName && clientData.fullName !== 'Cliente') || clientData.phoneNumber)

  if (hasData) {
    try {
      const tBuscaStart = performance.now()

      // Realiza a busca e o enriquecimento em paralelo nos dois sistemas
      const [clientsPrincipal, clientsReserva] = await Promise.all([
        searchAndEnrich(SGP_IP_35, 'Principal', clientData, uid),
        searchAndEnrich(SGP_IP_53, 'Reserva (IP 53)', clientData, uid)
      ])

      const allClients = [...clientsPrincipal, ...clientsReserva]

      const tBuscaEnd = performance.now()
      console.log(`${getTs()} ⏱️ [ATI Perf] FormParams: Busca e enriquecimento unificado demorou ${(tBuscaEnd - tBuscaStart).toFixed(1)}ms.`)

      let autoSelectedClient: any = null

      if (allClients.length === 1) {
        autoSelectedClient = allClients[0]
      } else {
        const activeClients = allClients.filter((c) => c.isActive)
        if (activeClients.length === 1) {
          autoSelectedClient = activeClients[0]
        }
      }

      if (autoSelectedClient) {
        targetBaseUrl = autoSelectedClient.baseUrl
        // Salva o preferido para futuras operações
        await chrome.storage.local.set({ ati_preferred_sgp: targetBaseUrl })
        // Também injeta o ID correto para busca no SGP selecionado
        clientData.clientSgpId = autoSelectedClient.id
        clientData.clientSgpOrigin = targetBaseUrl

        // Sincroniza o status cache para que a verificação de sessão use cache e seja instantânea!
        await updateSgpStatusCache({ isLoggedIn: true, baseUrl: targetBaseUrl })
      }
    } catch (e) {
      console.warn('Extensão ATI: Erro no auto-seletor do FormParams, usando preferido padrão.', e)
    }
  }

  if (forcedSgp) {
    // Se foi forçado manualmente, garante que salvamos e usamos ele como preferido
    await chrome.storage.local.set({ ati_preferred_sgp: targetBaseUrl })
    console.log(`Extensão ATI: Usando SGP forçado manualmente para este atendimento: ${targetBaseUrl}`)
    // Sincroniza o status cache para o SGP forçado
    await ensureSgpSession(targetBaseUrl).catch(() => null)
    await updateSgpStatusCache({ isLoggedIn: true, baseUrl: targetBaseUrl })
  }

  const tLoginCheckStart = performance.now()
  const { isLoggedIn, baseUrl } = await getSgpStatus(false) // Usa cache se possível (0ms se sincronizado acima!)
  const tLoginCheckEnd = performance.now()
  console.log(`${getTs()} ⏱️ [ATI Perf] FormParams: Login/status check demorou ${(tLoginCheckEnd - tLoginCheckStart).toFixed(1)}ms.`)
  if (!isLoggedIn) throw new Error('Não está logado no SGP.')

  const clientKey = clientData.clientSgpId || clientData.cpfCnpj || clientData.phoneNumber || clientData.fullName || chatId
  const cacheKey = `${baseUrl}_${clientKey}`

  const tCacheCheckStart = performance.now()
  const hasCache = await hasSgpFormCache(cacheKey)
  const tCacheCheckEnd = performance.now()
  console.log(`${getTs()} ⏱️ [ATI Perf] FormParams: Verificação de cache demorou ${(tCacheCheckEnd - tCacheCheckStart).toFixed(1)}ms.`)

  if (hasCache) {
    console.log(`Extensão ATI: Usando cache SGP (cacheKey: ${cacheKey}) para atendimento ${chatId}`)
    const cachedData = await getSgpFormCache(cacheKey)
    const tTotalEnd = performance.now()
    console.log(`${getTs()} ⏱️ [ATI Perf] Total getSgpFormParams (CACHE HIT) demorou ${(tTotalEnd - tTotalStart).toFixed(1)}ms.`)
    return cachedData as SgpData
  }

  const tSearchBaseStart = performance.now()
  const clients = await findClientInSgp(baseUrl, clientData, uid)
  const tSearchBaseEnd = performance.now()
  console.log(`${getTs()} ⏱️ [ATI Perf] FormParams: findClientInSgp local (${baseUrl}) demorou ${(tSearchBaseEnd - tSearchBaseStart).toFixed(1)}ms. Encontrados: ${clients?.length ?? 0}`)

  if (!clients || clients.length === 0) throw new Error('Cliente não encontrado no SGP.')

  console.log(`Extensão ATI: Buscando dados do formulário para ${clients.length} cliente(s)...`)

  let allContracts: SgpContract[] = []
  let responsibleUsers: SgpUser[] = []
  let occurrenceTypes: SgpOccurrenceType[] = []

  const tScrapingStart = performance.now()
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i]
    const clientCacheKey = `${baseUrl}_${client.id}`
    const cachedScrape = getScrapeCache(clientCacheKey)

    if (cachedScrape) {
      console.log(`Extensão ATI: Usando cache de scrape em memória para o cliente ID ${client.id}`)
      allContracts = allContracts.concat(cachedScrape.contracts)
      if (i === 0) {
        responsibleUsers = cachedScrape.responsibleUsers
        occurrenceTypes = cachedScrape.occurrenceTypes
      }
      console.log(`${getTs()} ⏱️ [ATI Perf] FormParams: Scrape HIT em memória para ID ${client.id} (0.0 ms)`)
      continue
    }

    const url = `${baseUrl}/admin/atendimento/cliente/${client.id}/ocorrencia/add/`
    const tLoopStart = performance.now()

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
      
      const tLoopEnd = performance.now()
      console.log(`${getTs()} ⏱️ [ATI Perf] FormParams: Scraping para ID ${client.id} em ${baseUrl} demorou ${(tLoopEnd - tLoopStart).toFixed(1)}ms.`)
    } catch (error) {
      console.error(`Extensão ATI: Falha ao buscar dados para cliente ${client.id}.`, error)
      throw error
    }
  }
  const tScrapingEnd = performance.now()
  console.log(`Extensão ATI: Buscando dados do formulário para ${clients.length} cliente(s) finalizado (levou ${(tScrapingEnd - tScrapingStart).toFixed(1)}ms).`)

  if (allContracts.length === 0) throw new Error('Nenhum contrato encontrado.')

  const result = {
    clientSgpId: clients[0].id,
    clientSgpOrigin: baseUrl,
    contracts: allContracts,
    responsibleUsers,
    occurrenceTypes,
  }

  await setSgpFormCache(cacheKey, result)
  
  const tTotalEnd = performance.now()
  console.log(`${getTs()} ⏱️ [ATI Perf] Total getSgpFormParams (CACHE MISS) demorou ${(tTotalEnd - tTotalStart).toFixed(1)}ms.`)

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
  const targetBaseUrl = data.sgpOrigin || (await getSgpStatus()).baseUrl
  const { isLoggedIn } = await getSgpStatus(false) // Checagem rápida no cache
  if (!isLoggedIn) throw new Error('Não está logado no SGP.')

  const requestId = Math.random().toString(36).substring(2, 9)
  const url = `${targetBaseUrl}/admin/atendimento/cliente/${data.clientSgpId}/ocorrencia/add/?ati_req_id=${requestId}`

  await chrome.storage.local.set({ [`pendingSgpData_${requestId}`]: data })
  await chrome.tabs.create({ url, active: true })
}
