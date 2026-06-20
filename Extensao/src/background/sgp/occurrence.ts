import { SGP_DEFAULT_HOSTS } from './constants'
import type { ClientData } from '../../contentScript/sgp/types'
import { getSgpHosts } from './config'
import { getSgpStatus, updateSgpStatusCache, ensureSgpSession, doubleCheckSgpLogins } from './auth'
import { findClientInSgp } from './search'
import { fetchContractOnlineStatus, buildContracts, extractOptions } from './contracts'
import { hasSgpFormCache, getSgpFormCache, setSgpFormCache } from './cache'
import { SgpData, SgpContract, SgpUser, SgpOccurrenceType } from '../../contentScript/sgp/types'

const getTs = () => `[${new Date().toLocaleTimeString('pt-BR')}]`

const SGP_SCRAPE_MAX_ENTRIES = 30
const SGP_SCRAPE_TTL_MS = 120000

const sgpScrapeMemoryCache = new Map<
  string,
  {
    contracts: SgpContract[]
    responsibleUsers: SgpUser[]
    occurrenceTypes: SgpOccurrenceType[]
    timestamp: number
  }
>()

function getScrapeCache(key: string) {
  const cached = sgpScrapeMemoryCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.timestamp > SGP_SCRAPE_TTL_MS) {
    sgpScrapeMemoryCache.delete(key)
    return null
  }
  return cached
}

function setScrapeCache(key: string, data: { contracts: SgpContract[]; responsibleUsers: SgpUser[]; occurrenceTypes: SgpOccurrenceType[] }) {
  if (sgpScrapeMemoryCache.size >= SGP_SCRAPE_MAX_ENTRIES) {
    const oldest = sgpScrapeMemoryCache.entries().next().value
    if (oldest) sgpScrapeMemoryCache.delete(oldest[0])
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

      const [onlineStatusMap, contractsWithAddress] = await Promise.all([needsOnlineStatus ? fetchContractOnlineStatus(baseUrl, client.id) : Promise.resolve(new Map<string, boolean>()), buildContracts(baseUrl, client, html, false)])

      contracts = contractsWithAddress.map((c) => ({
        ...c,
        online: onlineStatusMap.has(c.id) ? onlineStatusMap.get(c.id) : null,
      }))
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
      isActive,
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
      isActive: false,
    }
  }
}

async function searchAndEnrich(baseUrl: string, label: string, clientData: ClientData, uid?: string, fastEnrich = false): Promise<any[]> {
  try {
    // 1. Garante que está autenticado de forma rápida e segura
    await ensureSgpSession(baseUrl)

    // 2. Realiza a busca de cliente no SGP correspondente
    const clients = await findClientInSgp(baseUrl, clientData, uid)
    if (!clients || clients.length === 0) return []

    // 3. Enriquece os clientes encontrados
    const enrichmentPromises = clients.map((c) => enrichSgpClient(baseUrl, c, label, fastEnrich))
    return await Promise.all(enrichmentPromises)
  } catch (error) {
    console.error(`Extensão ATI: Erro na busca/enriquecimento em ${label} (${baseUrl}):`, error)
    return []
  }
}

export async function handleOpenInSgp(clientData: ClientData, cachedContract: string | null, forceClientId?: string, uid?: string, forceShowModal?: boolean): Promise<any> {
  const tTotalStart = performance.now()
  const { isLoggedIn, baseUrl } = await getSgpStatus(false)

  if (!isLoggedIn) {
    await doubleCheckSgpLogins(true)
    throw new Error('Por favor, faça login em ambos os SGPs (.35 e .53) para continuar. Abrindo as telas de login...')
  }

  if (cachedContract) {
    console.log(`Extensão ATI: Usando contrato cacheado — ${cachedContract}`)
    const url = `${baseUrl}/admin/cliente/${cachedContract}/contratos/`
    await focusOrOpenTab(url, cachedContract)
    return { success: true, clientId: cachedContract }
  }

  let targetBaseUrl = baseUrl
  let targetClientId = forceClientId

  if (targetClientId) {
    if (targetClientId.includes('|')) {
      const parts = targetClientId.split('|')
      targetBaseUrl = parts[0]
      targetClientId = parts[1]
    }
    console.log(`Extensão ATI: ID do cliente forçado — ID ${targetClientId} em ${targetBaseUrl}`)
    await focusOrOpenTab(`${targetBaseUrl}/admin/cliente/${targetClientId}/contratos/`, targetClientId)
    return { success: true, clientId: targetClientId, sgpOrigin: targetBaseUrl }
  }

  if (!forceShowModal && clientData.clientSgpId) {
    // Só utiliza o ID extraído do DOM se ele pertencer EXATAMENTE ao mesmo ambiente (baseUrl) atual
    if (clientData.clientSgpOrigin === baseUrl) {
      console.log(`Extensão ATI: ID do cliente extraído do DOM — ID ${clientData.clientSgpId}`)
      await focusOrOpenTab(`${baseUrl}/admin/cliente/${clientData.clientSgpId}/contratos/`, clientData.clientSgpId)
      return { success: true, clientId: clientData.clientSgpId, sgpOrigin: baseUrl }
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

  // 1. Garante autenticação rápida em ambos (usa cache)
  const hosts = await getSgpHosts()
  const sgp35 = hosts.find(h => h.key === 'sgp_35')?.url ?? SGP_DEFAULT_HOSTS[0].url
  const sgp53 = hosts.find(h => h.key === 'sgp_53')?.url ?? SGP_DEFAULT_HOSTS[1].url
  await Promise.all([ensureSgpSession(sgp35).catch(() => null), ensureSgpSession(sgp53).catch(() => null)])

  // 2. Realiza a busca autocomplete simples em paralelo nos dois sistemas (ultra-rápido!)
  const [clientsPrincipal, clientsReserva] = await Promise.all([findClientInSgp(sgp35, clientData, uid).catch(() => null), findClientInSgp(sgp53, clientData, uid).catch(() => null)])

  const foundPrincipal = (clientsPrincipal || []).map((c) => ({ ...c, baseUrl: sgp35, systemLabel: 'SGP Antigo' }))
  const foundReserva = (clientsReserva || []).map((c) => ({ ...c, baseUrl: sgp53, systemLabel: 'SGP Novo' }))
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
    return { success: true, clientId: client.id, sgpOrigin: client.baseUrl }
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
    return { success: true, clientId: client.id, sgpOrigin: client.baseUrl }
  }

  // Se houver mais de 1 cadastro ativo ou nenhum ativo, exibe o modal de seleção
  console.log(`Extensão ATI: Exibindo modal para seleção entre ${allClients.length} opções...`)
  const formattedClients = allClients.map((c) => ({
    id: `${c.baseUrl}|${c.id}`,
    text: `[${c.systemLabel}] - ${c.text}`,
  }))

  return { success: true, multipleClients: true, clients: formattedClients }
}

export async function getSgpFormParams(clientData: ClientData, chatId: string, _idToken: string, uid?: string): Promise<SgpData> {
  const tTotalStart = performance.now()

  // 1. Verifica se o usuário forçou um SGP manualmente para este atendimento (evita loop infinito se ele quiser trocar de SGP no modal)
  const forceResult = await chrome.storage.local.get(`ati_manual_sgp_force_${chatId}`)
  const forcedSgp = forceResult[`ati_manual_sgp_force_${chatId}`]

  // 2. Busca rápida no cache local (evita qualquer requisição aos dois SGPs se já foi carregado para este cliente nesta sessão)
  const hosts = await getSgpHosts()
  const sgp35 = hosts.find(h => h.key === 'sgp_35')?.url ?? SGP_DEFAULT_HOSTS[0].url
  const sgp53 = hosts.find(h => h.key === 'sgp_53')?.url ?? SGP_DEFAULT_HOSTS[1].url
  const clientKey = clientData.clientSgpId || clientData.cpfCnpj || clientData.phoneNumber || clientData.fullName || chatId
  const check35 = !forcedSgp || forcedSgp === sgp35
  const check53 = !forcedSgp || forcedSgp === sgp53
  const cacheKey35 = `${sgp35}_${clientKey}`
  const cacheKey53 = `${sgp53}_${clientKey}`

  const [has35, has53] = await Promise.all([check35 ? hasSgpFormCache(cacheKey35) : Promise.resolve(false), check53 ? hasSgpFormCache(cacheKey53) : Promise.resolve(false)])

  if (has35 || has53) {
    const activeCacheKey = has53 ? cacheKey53 : cacheKey35
    const activeBaseUrl = has53 ? sgp53 : sgp35

    console.log(`Extensão ATI: Cache SGP encontrado imediatamente no início (cacheKey: ${activeCacheKey})`)

    await chrome.storage.local.set({ ati_preferred_sgp: activeBaseUrl })
    await updateSgpStatusCache({ isLoggedIn: true, baseUrl: activeBaseUrl })

    const cachedData = await getSgpFormCache(activeCacheKey)
    const tTotalEnd = performance.now()
    console.log(`${getTs()} ⏱️ [ATI Perf] Total getSgpFormParams (FAST CACHE HIT) demorou ${(tTotalEnd - tTotalStart).toFixed(1)}ms.`)
    return cachedData as SgpData
  }

  let targetBaseUrl = forcedSgp || (await getSgpStatus()).baseUrl

  const hasData = !forcedSgp && (clientData.clientSgpId || clientData.cpfCnpj || (clientData.fullName && clientData.fullName !== 'Cliente') || clientData.phoneNumber)

  if (hasData) {
    try {
      const tBuscaStart = performance.now()

      // Realiza a busca e o enriquecimento rápido em paralelo nos dois sistemas
      const [clientsPrincipal, clientsReserva] = await Promise.all([searchAndEnrich(sgp35, 'SGP Antigo', clientData, uid, true), searchAndEnrich(sgp53, 'SGP Novo', clientData, uid, true)])

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
  const { isLoggedIn } = await getSgpStatus(false) // Usa cache se possível (0ms se sincronizado acima!)
  const tLoginCheckEnd = performance.now()
  console.log(`${getTs()} ⏱️ [ATI Perf] FormParams: Login/status check demorou ${(tLoginCheckEnd - tLoginCheckStart).toFixed(1)}ms.`)
  if (!isLoggedIn) {
    await doubleCheckSgpLogins(true)
    throw new Error('Por favor, faça login em ambos os SGPs (.35 e .53) para continuar. Abrindo as telas de login...')
  }

  const finalClientKey = clientData.clientSgpId || clientData.cpfCnpj || clientData.phoneNumber || clientData.fullName || chatId
  const cacheKey = `${targetBaseUrl}_${finalClientKey}`

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
  const clients = await findClientInSgp(targetBaseUrl, clientData, uid)
  const tSearchBaseEnd = performance.now()
  console.log(`${getTs()} ⏱️ [ATI Perf] FormParams: findClientInSgp local (${targetBaseUrl}) demorou ${(tSearchBaseEnd - tSearchBaseStart).toFixed(1)}ms. Encontrados: ${clients?.length ?? 0}`)

  if (!clients || clients.length === 0) throw new Error('Cliente não encontrado no SGP.')

  console.log(`Extensão ATI: Buscando dados do formulário para ${clients.length} cliente(s)...`)

  let allContracts: SgpContract[] = []
  let responsibleUsers: SgpUser[] = []
  let occurrenceTypes: SgpOccurrenceType[] = []

  const tScrapingStart = performance.now()
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i]
    const clientCacheKey = `${targetBaseUrl}_${client.id}`
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

    const url = `${targetBaseUrl}/admin/atendimento/cliente/${client.id}/ocorrencia/add/`
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

      // Busca status online/offline dos contratos deste cliente e endereços em paralelo!
      const [onlineStatusMap, contractsWithAddress] = await Promise.all([needsOnlineStatus ? fetchContractOnlineStatus(targetBaseUrl, client.id) : Promise.resolve(new Map<string, boolean>()), buildContracts(targetBaseUrl, client, html, clients.length > 1)])

      const contracts = contractsWithAddress.map((c) => ({
        ...c,
        online: onlineStatusMap.has(c.id) ? onlineStatusMap.get(c.id) : null,
      }))

      allContracts = allContracts.concat(contracts)

      if (i === 0) {
        responsibleUsers = extractOptions(html, /<select[^>]+id=['"]id_responsavel['"][^>]*>([\s\S]*?)<\/select>/).map((u) => ({ id: u.id, username: u.text.toLowerCase() }))
        occurrenceTypes = extractOptions(html, /<select[^>]+id=['"]id_tipo['"][^>]*>([\s\S]*?)<\/select>/)
      }

      const tLoopEnd = performance.now()
      console.log(`${getTs()} ⏱️ [ATI Perf] FormParams: Scraping para ID ${client.id} em ${targetBaseUrl} demorou ${(tLoopEnd - tLoopStart).toFixed(1)}ms.`)
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
    clientSgpOrigin: targetBaseUrl,
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
      const textLower = (c?.text || '').toLowerCase()
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
  if (!isLoggedIn) {
    await doubleCheckSgpLogins(true)
    throw new Error('Por favor, faça login em ambos os SGPs (.35 e .53) para continuar. Abrindo as telas de login...')
  }

  const requestId = Math.random().toString(36).substring(2, 9)
  const url = `${targetBaseUrl}/admin/atendimento/cliente/${data.clientSgpId}/ocorrencia/add/?ati_req_id=${requestId}`

  await chrome.storage.local.set({ [`pendingSgpData_${requestId}`]: data })
  await chrome.tabs.create({ url, active: true })
}

export async function fetchSgpClientContacts(clientUrl?: string, baseUrl?: string, clientId?: string, clientData?: ClientData, uid?: string): Promise<string> {
  let targetBaseUrl = baseUrl
  let targetClientId = clientId
  let targetClientUrl = clientUrl

  // Se tivermos uma URL completa de cliente, extraímos a base e o ID dela
  if (targetClientUrl) {
    try {
      const urlObj = new URL(targetClientUrl)
      targetBaseUrl = urlObj.origin
      const match = urlObj.pathname.match(/\/admin\/cliente\/(\d+)/)
      if (match) {
        targetClientId = match[1]
      }
    } catch (e) {
      console.warn('Erro ao parsear clientUrl:', e)
    }
  }

  // Se não tivermos o ID nem a URL, mas temos os dados, buscamos em paralelo nos dois SGPs!
  if (!targetClientId && clientData) {
    console.log('Extensão ATI: Buscando cliente em ambos os SGPs em paralelo...')

    // Garante autenticação em ambos em paralelo
    const hosts = await getSgpHosts()
    const sgp35 = hosts.find(h => h.key === 'sgp_35')?.url ?? SGP_DEFAULT_HOSTS[0].url
    const sgp53 = hosts.find(h => h.key === 'sgp_53')?.url ?? SGP_DEFAULT_HOSTS[1].url
    await Promise.all([ensureSgpSession(sgp35).catch(() => null), ensureSgpSession(sgp53).catch(() => null)])

    const [resPrincipal, resReserva] = await Promise.all([findClientInSgp(sgp35, clientData, uid).catch(() => null), findClientInSgp(sgp53, clientData, uid).catch(() => null)])

    if (resPrincipal && resPrincipal.length > 0) {
      targetBaseUrl = sgp35
      targetClientId = resPrincipal[0].id
      console.log(`Extensão ATI: Cliente encontrado no SGP Antigo (ID: ${targetClientId})`)
    } else if (resReserva && resReserva.length > 0) {
      targetBaseUrl = sgp53
      targetClientId = resReserva[0].id
      console.log(`Extensão ATI: Cliente encontrado no SGP Novo (ID: ${targetClientId})`)
    }
  }

  if (!targetBaseUrl) {
    targetBaseUrl = (await getSgpStatus()).baseUrl
  }

  // Garante autenticação no SGP de destino
  await ensureSgpSession(targetBaseUrl)

  const urlsToTry: string[] = []
  if (targetClientId) {
    urlsToTry.push(`${targetBaseUrl}/admin/contato/list/cliente/${targetClientId}/`)
    urlsToTry.push(`${targetBaseUrl}/admin/cliente/${targetClientId}/edit/`)
    urlsToTry.push(`${targetBaseUrl}/admin/cliente/${targetClientId}/change/`)
    urlsToTry.push(`${targetBaseUrl}/admin/cliente/${targetClientId}/`)
  }

  if (targetClientUrl && !urlsToTry.includes(targetClientUrl)) {
    urlsToTry.push(targetClientUrl)
  }

  if (urlsToTry.length === 0) {
    throw new Error('Cliente não identificado no SGP e não encontrado em nenhum dos sistemas.')
  }

  let lastError: Error = new Error('Sem URLs válidas para buscar contatos.')
  for (const url of urlsToTry) {
    try {
      console.log(`Extensão ATI: Tentando buscar contatos na URL: ${url}`)
      const response = await fetch(url, {
        credentials: 'include',
        signal: AbortSignal.timeout(8000),
      })
      if (response.ok) {
        const html = await response.text()

        // Detecção robusta de tela de login do Django Admin ou SGP
        const isLoginPage = html.includes('id_username') || html.includes('id_password') || html.includes('name="username"') || html.includes('name="password"') || html.includes('/accounts/login') || html.includes('login-container')

        if (isLoginPage) {
          throw new Error('Sessão expirada no SGP. Faça o login novamente no SGP.')
        }
        return html
      }
      throw new Error(`Status HTTP: ${response.status}`)
    } catch (e: any) {
      console.warn(`Extensão ATI: Falha ao buscar contatos de ${url}:`, e)
      lastError = new Error(e.message || `Falha ao acessar ${url}`)
    }
  }
  throw lastError
}

export async function searchSgpFeasibilityHtml(baseUrl: string, logradouro: string, numero?: string): Promise<string> {
  const isSessionOk = await ensureSgpSession(baseUrl)
  if (!isSessionOk) {
    await doubleCheckSgpLogins(true)
    throw new Error('Por favor, faça login em ambos os SGPs (.35 e .53) para continuar. Abrindo as telas de login...')
  }
  const numQuery = numero ? `&numero=${encodeURIComponent(numero)}` : ''
  const url = `${baseUrl}/admin/cliente/list/?tipo_endereco=cliente&logradouro=${encodeURIComponent(logradouro)}${numQuery}&botao_consulta=Consultar`
  console.log(`Extensão ATI: Consultando viabilidade no SGP (${baseUrl}) para rua: ${logradouro} ${numero ? 'número: ' + numero : ''}`)

  const response = await fetch(url, {
    credentials: 'include',
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao acessar SGP`)
  }

  const html = await response.text()

  const isLoginPage = html.includes('id_username') || html.includes('id_password') || html.includes('name="username"') || html.includes('name="password"') || html.includes('/accounts/login') || html.includes('login-container')

  if (isLoginPage) {
    await doubleCheckSgpLogins(true)
    throw new Error('Sessão expirada no SGP. Por favor, faça login em ambos os SGPs (.35 e .53) para continuar. Abrindo as telas de login...')
  }

  return html
}

interface SgpFiltersCache {
  olts: { value: string; text: string }[]
  oltpons: { value: string; text: string }[]
  timestamp: number
}

async function getSgpFiltersCache(baseUrl: string): Promise<SgpFiltersCache | null> {
  const key = `sgp_filters_cache_${baseUrl}`
  const result = await chrome.storage.local.get(key)
  const cached = result[key]
  if (!cached) return null
  // 1 hora TTL
  if (Date.now() - cached.timestamp > 3600000) {
    return null
  }
  return cached
}

async function setSgpFiltersCache(baseUrl: string, cacheData: { olts: { value: string; text: string }[]; oltpons: { value: string; text: string }[] }) {
  const key = `sgp_filters_cache_${baseUrl}`
  await chrome.storage.local.set({ [key]: { ...cacheData, timestamp: Date.now() } })
}

function parseSgpFilters(html: string): { olts: { value: string; text: string }[]; oltpons: { value: string; text: string }[] } {
  const olts: { value: string; text: string }[] = []
  const oltpons: { value: string; text: string }[] = []

  // Parse OLT select
  const oltSelectRegex = /<select[^>]+name=['"]olt['"][^>]*>([\s\S]*?)<\/select>/i
  const oltSelectMatch = html.match(oltSelectRegex)
  if (oltSelectMatch) {
    const optionRegex = /<option\s+value=['"]?([^'"]*)['"]?[^>]*>([\s\S]*?)<\/option>/gi
    let optMatch
    while ((optMatch = optionRegex.exec(oltSelectMatch[1])) !== null) {
      if (optMatch[1]) {
        olts.push({ value: optMatch[1], text: optMatch[2].trim() })
      }
    }
  }

  // Parse OLTPON select
  const oltponSelectRegex = /<select[^>]+name=['"]oltpon['"][^>]*>([\s\S]*?)<\/select>/i
  const oltponSelectMatch = html.match(oltponSelectRegex)
  if (oltponSelectMatch) {
    const optionRegex = /<option\s+value=['"]?([^'"]*)['"]?[^>]*>([\s\S]*?)<\/option>/gi
    let optMatch
    while ((optMatch = optionRegex.exec(oltponSelectMatch[1])) !== null) {
      if (optMatch[1]) {
        oltpons.push({ value: optMatch[1], text: optMatch[2].trim() })
      }
    }
  }

  return { olts, oltpons }
}

function resolveSgpFilters(cache: { olts: { value: string; text: string }[]; oltpons: { value: string; text: string }[] }, filters: { olt?: string; oltslot?: string; oltpon?: string }): { olt?: string; oltpon?: string } {
  const result: { olt?: string; oltpon?: string } = {}

  const oltVal = filters.olt
  const slotVal = filters.oltslot
  const ponVal = filters.oltpon

  // 1. Resolve OLT ID
  if (oltVal) {
    let keyword = ''
    if (oltVal === '1') keyword = 'VARZEA'
    else if (oltVal === '2') keyword = 'SAO PEDRO'
    else if (oltVal === '3') keyword = 'ALTO'
    else if (oltVal === '4') keyword = 'BARRA'
    else if (oltVal === '5') keyword = 'PONTE'
    else if (oltVal === '6') keyword = 'CASCATA'
    else if (oltVal === '7') keyword = 'FONTE'

    if (keyword) {
      let bestOlt: { value: string; text: string } | null = null
      let bestScore = -1

      for (const olt of cache.olts) {
        const textUpper = olt.text.toUpperCase()
        if (textUpper.includes(keyword)) {
          let score = 1
          if (textUpper.includes('NOKIA')) score = 2
          if (oltVal === '4' && textUpper.includes('192.168.140.13')) score = 3
          if (score > bestScore) {
            bestScore = score
            bestOlt = olt
          }
        }
      }

      if (bestOlt) {
        result.olt = bestOlt.value
      }
    }
  }

  // 2. Resolve OLTPON ID
  if (oltVal && slotVal && ponVal) {
    let keyword = ''
    if (oltVal === '1') keyword = 'VARZEA'
    else if (oltVal === '2') keyword = 'SAO PEDRO'
    else if (oltVal === '3') keyword = 'ALTO'
    else if (oltVal === '4') keyword = 'BARRA'
    else if (oltVal === '5') keyword = 'PONTE'
    else if (oltVal === '6') keyword = 'CASCATA'
    else if (oltVal === '7') keyword = 'FONTE'

    if (keyword) {
      let bestOltPon: { value: string; text: string } | null = null
      let bestScore = -1

      for (const opt of cache.oltpons) {
        const textUpper = opt.text.toUpperCase()

        // Match Slot
        const slotRegex = new RegExp(`Slot:\\s*0*${slotVal}\\b`, 'i')
        if (!slotRegex.test(textUpper)) continue

        // Match PON
        const ponRegex = new RegExp(`PON:\\s*0*${ponVal}\\b`, 'i')
        if (!ponRegex.test(textUpper)) continue

        if (textUpper.includes(keyword)) {
          let score = 1
          if (textUpper.includes('NOKIA')) score = 2
          if (oltVal === '4' && textUpper.includes('192.168.140.13')) score = 3

          if (score > bestScore) {
            bestScore = score
            bestOltPon = opt
          }
        }
      }

      if (bestOltPon) {
        result.oltpon = bestOltPon.value
      }
    }
  }

  return result
}

export async function searchSgpOfflineClientsHtml(
  baseUrl: string,
  filters?: {
    logradouro?: string
    numero?: string
    bairro?: string
    olt?: string
    oltslot?: string
    oltpon?: string
  },
): Promise<string> {
  const isSessionOk = await ensureSgpSession(baseUrl)
  if (!isSessionOk) {
    await doubleCheckSgpLogins(true)
    throw new Error('Por favor, faça login em ambos os SGPs (.35 e .53) para continuar. Abrindo as telas de login...')
  }

  let finalOlt = filters?.olt
  let finalOltpon = filters?.oltpon
  let needsResolution = !!(filters?.olt || filters?.oltpon)

  if (needsResolution && filters) {
    // Tenta carregar do cache
    const cache = await getSgpFiltersCache(baseUrl)

    if (cache) {
      const resolved = resolveSgpFilters(cache, filters)
      if (resolved.olt) finalOlt = resolved.olt
      if (resolved.oltpon) finalOltpon = resolved.oltpon
      needsResolution = false // Resolvido com sucesso via cache
    }
  }

  const buildQuery = (oltVal?: string, oltponVal?: string) => {
    let query = 'tipoq=cliente&tipo_endereco=cliente&statusconn=offline&conexaoexibir=on&status=1&status=7&botao_consulta=Consultar'
    if (filters) {
      if (filters.logradouro) query += `&logradouro=${encodeURIComponent(filters.logradouro)}`
      if (filters.numero) query += `&numero=${encodeURIComponent(filters.numero)}`
      if (filters.bairro) query += `&bairro=${encodeURIComponent(filters.bairro)}`
      if (oltVal) query += `&olt=${encodeURIComponent(oltVal)}`
      if (filters.oltslot) query += `&oltslot=${encodeURIComponent(filters.oltslot)}`
      if (oltponVal) query += `&oltpon=${encodeURIComponent(oltponVal)}`
    }
    return query
  }

  // Se precisar de resolução por falta de cache
  if (needsResolution && filters) {
    const tempQuery = buildQuery(undefined, undefined)
    const tempUrl = `${baseUrl}/admin/cliente/list/?${tempQuery}`
    console.log(`Extensão ATI: Cache miss para filtros OLT/PON. Buscando página inicial para mapeamento: ${tempUrl}`)

    const response = await fetch(tempUrl, {
      credentials: 'include',
      signal: AbortSignal.timeout(25000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao acessar SGP`)
    }

    const html = await response.text()

    const isLoginPage = html.includes('id_username') || html.includes('id_password') || html.includes('name="username"') || html.includes('name="password"') || html.includes('/accounts/login') || html.includes('login-container')
    if (isLoginPage) {
      await doubleCheckSgpLogins(true)
      throw new Error('Sessão expirada no SGP. Por favor, faça login em ambos os SGPs (.35 e .53) para continuar. Abrindo as telas de login...')
    }

    // Extrai e armazena os filtros no cache
    const cacheData = parseSgpFilters(html)
    if (cacheData.olts.length > 0 || cacheData.oltpons.length > 0) {
      console.log(`Extensão ATI: Filtros OLT/PON mapeados com sucesso (${cacheData.olts.length} OLTs, ${cacheData.oltpons.length} PONs). Gravando cache.`)
      await setSgpFiltersCache(baseUrl, cacheData)

      const resolved = resolveSgpFilters(cacheData, filters)
      if (resolved.olt) finalOlt = resolved.olt
      if (resolved.oltpon) finalOltpon = resolved.oltpon
    }

    // Faz a consulta definitiva com os filtros resolvidos
    const finalQuery = buildQuery(finalOlt, finalOltpon)
    const finalUrl = `${baseUrl}/admin/cliente/list/?${finalQuery}`
    console.log(`Extensão ATI: Consultando quedas com filtros mapeados: ${finalQuery}`)

    const secondResponse = await fetch(finalUrl, {
      credentials: 'include',
      signal: AbortSignal.timeout(25000),
    })

    if (!secondResponse.ok) {
      throw new Error(`HTTP ${secondResponse.status} ao acessar SGP`)
    }

    const finalHtml = await secondResponse.text()
    return finalHtml
  }

  // Com cache hit ou sem necessidade de resolução
  const finalQuery = buildQuery(finalOlt, finalOltpon)
  const url = `${baseUrl}/admin/cliente/list/?${finalQuery}`
  console.log(`Extensão ATI: Consultando quedas no SGP (${baseUrl}) com query: ${finalQuery}`)

  const response = await fetch(url, {
    credentials: 'include',
    signal: AbortSignal.timeout(25000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao acessar SGP`)
  }

  const html = await response.text()

  const isLoginPage = html.includes('id_username') || html.includes('id_password') || html.includes('name="username"') || html.includes('name="password"') || html.includes('/accounts/login') || html.includes('login-container')

  if (isLoginPage) {
    await doubleCheckSgpLogins(true)
    throw new Error('Sessão expirada no SGP. Por favor, faça login em ambos os SGPs (.35 e .53) para continuar. Abrindo as telas de login...')
  }

  return html
}
