// =================================================================
// SGP — SUPORTE (BUSCA DE POTÊNCIA E DADOS OLT)
// =================================================================

import { ensureSgpSession } from './auth'
import { getAlternateSgpUrl } from './config'

export interface SgpSupportData {
  status: 'online' | 'offline' | 'unknown'
  uptime: string
  oltName: string
  oltModel: string
  slot: string
  pon: string
  onuId: string
  vlan: string
  modo: string
  addr: string
  rxPowerOnu: string
  rxPowerOlt: string
  distance: string
  tempOnu: string
  alarms: {
    lossOfSignal: string
    lossOfAck: string
    lossOfGem: string
    ontDisabled: string
    inactive: string
    dyingGasp: string
  }
  downReason: string
  rawOltOutput: string
  friendlyExplanation: string
  ip?: string
  mac?: string
  protocolo?: string
  nas?: string
  dataConexao?: string
  sgpUrl?: string
  sgpOnuId?: string
  dataQueda?: string
  motivoQueda?: string
}

interface RadiusSession {
  username: string
  mac: string
  startTime: string
  endTime: string
  ip: string
  ipv6Prefix: string
  ipv6Delegated: string
  nasPort: string
  nasIp: string
  protocol: string
  terminateCause: string
}

function parseRadiusSessionsHtml(html: string): RadiusSession[] {
  const sessions: RadiusSession[] = []
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi

  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1]
    const tds: string[] = []
    let tdMatch: RegExpExecArray | null

    tdRegex.lastIndex = 0
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      const val = tdMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
      tds.push(val)
    }

    if (tds.length >= 10 && tds[0] && tds[2]) {
      const isDate = tds[2].includes('/') && tds[2].includes(':')
      if (isDate) {
        sessions.push({
          username: tds[0],
          mac: tds[1],
          startTime: tds[2],
          endTime: tds[3] || '',
          ip: tds[4] || '',
          ipv6Prefix: tds[5] || '',
          ipv6Delegated: tds[6] || '',
          nasPort: tds[8] || '',
          nasIp: tds[9] || '',
          protocol: tds[13] || '',
          terminateCause: tds[14] ? tds[14].split('\n')[0].trim() : '',
        })
      }
    }
  }

  return sessions
}

/**
 * Auxiliar para parsear o bloco de texto "#detalhes" de forma robusta e livre de falhas de regex
 */
function parseOnuDetailsHtml(html: string): Record<string, string> {
  const match = html.match(/<div[^>]+id=["']detalhes["'][^>]*>([\s\S]*?)<\/div>/i)
  const detailsBlock = match?.[1] || html

  // Remove tags HTML, substitui por quebras de linha e limpa entidades comuns
  const cleanBlock = detailsBlock
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')

  const lines = cleanBlock
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const result: Record<string, string> = {}

  for (const line of lines) {
    const parts = line.split(':')
    if (parts.length >= 2) {
      const key = parts[0].trim().toLowerCase()
      const val = parts.slice(1).join(':').trim()
      result[key] = val
    }
  }

  return result
}

/**
 * Realiza as requisições ao SGP e faz o scraping de uptime e potência de sinal.
 */
async function findInternetServiceIdFromContractsTab(baseUrl: string, clientId: string, contractId: string): Promise<string | null> {
  try {
    const url = `${baseUrl}/admin/cliente/${clientId}/contratos/`
    console.log(`Extensão ATI: Buscando ID do serviço de internet no tab de contratos: ${url}`)
    const res = await fetch(url, {
      credentials: 'include',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.warn(`Extensão ATI: Erro ao buscar tab de contratos (${res.status})`)
      return null
    }
    const html = await res.text()

    // Divide o HTML por tr para analisar cada linha
    const rows = html.split(/<tr[^>]*>/i)
    const numPattern = new RegExp(`(?:^|[^\\d])${contractId}(?:$|[^\\d])`)
    const exactPattern = new RegExp(`^\\s*(${contractId})\\s*$`)

    for (const row of rows) {
      if (numPattern.test(row) || exactPattern.test(row)) {
        const serviceMatch = row.match(/\/admin\/servicos\/internet\/(\d+)/i)
        if (serviceMatch?.[1]) {
          console.log(`Extensão ATI: Encontrado ServicoInternet ID ${serviceMatch[1]} para contrato ${contractId} no tab de contratos`)
          return serviceMatch[1]
        }
      }
    }
    console.warn(`Extensão ATI: Contrato ${contractId} não encontrado no tab de contratos ou sem serviço de internet associado na linha`)
  } catch (err) {
    console.warn(`Extensão ATI: Falha ao buscar ServicoInternet ID no tab de contratos`, err)
  }
  return null
}

async function scrapeSupportDataInternal(baseUrl: string, contractId: string, clientId?: string): Promise<SgpSupportData> {
  // 1. Garante sessão activa no SGP
  await ensureSgpSession(baseUrl)

  let servicoId: string | null = null

  if (clientId) {
    servicoId = await findInternetServiceIdFromContractsTab(baseUrl, clientId, contractId)
  }

  if (!servicoId) {
    // 2. Busca lista de serviços do contrato para obter o ID do serviço de internet
    const servRes = await fetch(`${baseUrl}/admin/clientecontrato/servico/list/ajax/?contrato_id=${contractId}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(8000),
    })
    if (!servRes.ok) {
      throw new Error(`Erro ao buscar serviços do contrato (${servRes.status}).`)
    }
    const services = await servRes.json()
    console.log(`Extensão ATI: Serviços retornados para contrato ${contractId}:`, JSON.stringify(services))

    if (!Array.isArray(services) || services.length === 0 || !services[0]?.id) {
      throw new Error('Nenhum serviço de internet ativo encontrado para este contrato.')
    }

    // Filtra para encontrar e priorizar o serviço de internet, de forma robusta e evitando TV/VoIP/etc.
    const candidates = services.filter((s: any) => {
      const txt = String(s.text || s.label || '')
        .toLowerCase()
        .trim()
      if (txt.startsWith('outros') || txt.startsWith('generico') || txt.startsWith('tv') || txt.startsWith('voip') || txt.startsWith('telefonia') || txt.includes('e-mail') || txt.includes('email') || txt.includes('audiobook') || txt.includes('ebook') || txt.includes('livraria') || txt.includes('news_ati')) {
        return false
      }
      return true
    })

    let selectedService = candidates[0] || services[0]
    const internetService = candidates.find((s: any) => {
      const txt = String(s.text || s.label || '').toLowerCase()
      return txt.includes('internet') || txt.includes('fibra') || txt.includes('gpon') || txt.includes('login')
    })
    if (internetService) {
      selectedService = internetService
    }
    console.log(`Extensão ATI: Serviço selecionado: ID ${selectedService.id} (${selectedService.text || selectedService.label})`)

    servicoId = selectedService.id
  }

  // 3. Busca uptime/status da conexão, página de detalhes da ONU e sessões radius em paralelo
  const uptimeUrl = `${baseUrl}/admin/servicos/internet/${servicoId}/infodetail/?statusonly=1`
  const detailsUrl = `${baseUrl}/admin/servicos/internet/${servicoId}/?tab=3`
  const radiusUrl = `${baseUrl}/admin/servicos/internet/${servicoId}/?tab=2`

  console.log(`Extensão ATI: Buscando Uptime de ${uptimeUrl}, Detalhes de ${detailsUrl} e Radius de ${radiusUrl}`)

  const fetchRadiusHtml = async () => {
    try {
      const res = await fetch(radiusUrl, { credentials: 'include', signal: AbortSignal.timeout(10000) })
      if (res.ok) return await res.text()
    } catch (e) {
      console.warn('Extensão ATI: Erro ao buscar tab de radius', e)
    }
    return ''
  }

  const [uptimeRes, detailsRes, radiusHtml] = await Promise.all([fetch(uptimeUrl, { credentials: 'include', signal: AbortSignal.timeout(8000) }), fetch(detailsUrl, { credentials: 'include', signal: AbortSignal.timeout(10000) }), fetchRadiusHtml()])

  if (!uptimeRes.ok) {
    throw new Error(`Erro ao buscar status de conexão do SGP (HTTP ${uptimeRes.status}).`)
  }
  const uptimeHtml = await uptimeRes.text()
  console.log(`Extensão ATI: Uptime URL final: ${uptimeRes.url}, status: ${uptimeRes.status}`)

  if (uptimeHtml.includes('id_username') || uptimeHtml.includes('id_password') || uptimeHtml.includes('/accounts/login')) {
    throw new Error('Sessão do SGP expirada. Por favor, refaça o login no SGP.')
  }

  if (!detailsRes.ok) {
    throw new Error(`Erro ao buscar detalhes do serviço no SGP (HTTP ${detailsRes.status}).`)
  }
  const detailsHtml = await detailsRes.text()
  console.log(`Extensão ATI: Details URL final: ${detailsRes.url}, status: ${detailsRes.status}, tamanho HTML: ${detailsHtml.length}`)
  console.log(`Extensão ATI: Início do HTML de detalhes (primeiros 300c):`, detailsHtml.substring(0, 300))

  if (detailsHtml.includes('id_username') || detailsHtml.includes('id_password') || detailsHtml.includes('/accounts/login')) {
    throw new Error('Sessão do SGP expirada. Por favor, refaça o login no SGP.')
  }

  // 4. Parse do Uptime & Connection status e detalhes técnicos adicionais
  let status: 'online' | 'offline' | 'unknown' = 'unknown'
  let uptime = 'Não informado'
  let ip = 'Não informado'
  let mac = 'Não informado'
  let protocolo = 'Não informado'
  let nas = 'Não informado'
  let dataConexao = 'Não informado'

  let dataQueda: string | undefined
  let motivoQueda: string | undefined

  let lastSession: RadiusSession | null = null
  if (radiusHtml) {
    const sessions = parseRadiusSessionsHtml(radiusHtml)
    if (sessions.length > 0) {
      lastSession = sessions[0]
      dataQueda = lastSession.endTime || undefined
      motivoQueda = lastSession.terminateCause || undefined
    }
  }

  const isOnline = /Online/i.test(uptimeHtml)
  const isOffline = /Offline/i.test(uptimeHtml)
  if (isOnline) status = 'online'
  else if (isOffline) status = 'offline'

  const uptimeMatch = uptimeHtml.match(/Tempo:\s*([^\n<]+)/i)
  if (uptimeMatch?.[1]) {
    uptime = uptimeMatch[1].trim()
  }

  const ipMatch = uptimeHtml.match(/IP:\s*<a[^>]*>\s*([^\s<]+)\s*<\/a>/i) || uptimeHtml.match(/IP:\s*([^\n<]+)/i)
  if (ipMatch?.[1]) {
    ip = ipMatch[1].trim()
  }

  const macMatch = uptimeHtml.match(/MAC:\s*([^\n<]+)/i)
  if (macMatch?.[1]) {
    mac = macMatch[1].trim()
  }

  const protMatch = uptimeHtml.match(/Protocolo:\s*([^\n<]+)/i)
  if (protMatch?.[1]) {
    protocolo = protMatch[1].trim()
  }

  const nasMatch = uptimeHtml.match(/NAS:\s*([^\n<]+)/i)
  if (nasMatch?.[1]) {
    nas = nasMatch[1].trim()
  }

  const dateMatch = uptimeHtml.match(/Data Conexão:\s*([^\n<]+)/i)
  if (dateMatch?.[1]) {
    dataConexao = dateMatch[1].trim()
  }

  // Fallback para cliente offline a partir da última sessão do Radius
  if (status === 'offline' && lastSession) {
    if (ip === 'Não informado' || !ip) {
      ip = lastSession.ip
    }
    if (mac === 'Não informado' || !mac) {
      mac = lastSession.mac
    }
    if (protocolo === 'Não informado' || !protocolo) {
      protocolo = lastSession.protocol
    }
    if (nas === 'Não informado' || !nas) {
      nas = lastSession.nasPort ? `${lastSession.nasPort} (${lastSession.nasIp})` : lastSession.nasIp
    }
    if (dataConexao === 'Não informado' || !dataConexao) {
      dataConexao = lastSession.startTime
    }
  }

  // 5. Tenta extrair a ONU ID interna do SGP para carregar dados da OLT
  let sgpOnuId = ''
  const patterns = [/\/admin\/network\/onu\/(\d+)/i, /\/network\/onu\/(\d+)/i, /onu\/(\d+)\/(detail|change|edit)/i, /onu_id\s*[:=]\s*["']?(\d+)/i, /onuId\s*[:=]\s*["']?(\d+)/i, /id_onu\s*[:=]\s*["']?(\d+)/i, /["']onu_id["']\s*[:]\s*(\d+)/i]
  for (const pattern of patterns) {
    const match = detailsHtml.match(pattern)
    if (match?.[1]) {
      sgpOnuId = match[1]
      console.log(`Extensão ATI: ONU ID encontrado pelo padrão ${pattern}: ${sgpOnuId}`)
      break
    }
  }

  if (!sgpOnuId) {
    throw new Error('Nenhuma ONU vinculada a este serviço no SGP.')
  }

  // 6. Busca a página de detalhes da ONU para extrair os detalhes técnicos
  let oltName = 'Não identificada'
  let oltModel = 'Não identificado'
  let slot = 'Não informado'
  let pon = 'Não informado'
  let onuId = 'Não informado'
  let vlan = 'Não informado'
  let modo = 'Não informado'
  let addr = 'Não informado'

  const onuDetailUrl = `${baseUrl}/admin/network/onu/${sgpOnuId}/detail/`
  const onuDetailRes = await fetch(onuDetailUrl, {
    credentials: 'include',
    signal: AbortSignal.timeout(10000),
  })
  if (!onuDetailRes.ok) {
    throw new Error(`Erro ao buscar página de detalhes da ONU no SGP (HTTP ${onuDetailRes.status}).`)
  }
  const onuDetailHtml = await onuDetailRes.text()

  const details = parseOnuDetailsHtml(onuDetailHtml)
  if (details['olt']) oltName = details['olt']
  if (details['modelo olt'] || details['modelo']) oltModel = details['modelo olt'] || details['modelo']
  if (details['slot']) slot = details['slot']
  if (details['pon']) pon = details['pon']
  if (details['onu/ont id'] || details['onu id'] || details['onu/ont'] || details['onu/ont id:']) {
    onuId = details['onu/ont id'] || details['onu id'] || details['onu/ont'] || details['onu/ont id:']
  }
  if (details['vlan']) vlan = details['vlan']
  if (details['modo']) modo = details['modo']
  if (details['addr'] || details['mac'] || details['serial']) addr = details['addr'] || details['mac'] || details['serial']

  let rxPowerOnu = '--'
  let rxPowerOlt = '--'
  let distance = '--'
  let tempOnu = '--'
  let downReason = 'Nenhum'
  let rawOltOutput = 'Dados da OLT indisponíveis.'
  const alarms = {
    lossOfSignal: 'no',
    lossOfAck: 'no',
    lossOfGem: 'no',
    ontDisabled: 'no',
    inactive: 'no',
    dyingGasp: 'no',
  }

  // Se conseguimos identificar o ID da ONU, carregamos as informações de potência óptica
  if (sgpOnuId) {
    const oltInfoUrl = `${baseUrl}/admin/network/onu/${sgpOnuId}/olt/info/?cpu=true&optical=true&uptime=true&wifi=true`
    try {
      // Usamos um timeout maior (25s) pois a potência/OLT pode demorar para responder
      const oltRes = await fetch(oltInfoUrl, {
        credentials: 'include',
        signal: AbortSignal.timeout(25000),
      })
      if (oltRes.ok) {
        const text = await oltRes.text()
        rawOltOutput = text

        // Realiza o parse das tabelas
        const lines = text.split('\n')

        let opDataLineIndex = -1
        let opticsLineIndex = -1

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('operational-data table')) {
            opDataLineIndex = i
          } else if (lines[i].includes('optics table')) {
            opticsLineIndex = i
          }
        }

        // Parse de operational-data (procura a linha correspondente aos dados)
        if (opDataLineIndex !== -1) {
          for (let j = opDataLineIndex + 1; j < lines.length; j++) {
            const line = lines[j].trim()
            if (line.startsWith('-----') || line.includes('operational-data count') || line.includes('optics table')) {
              continue
            }
            if (/^\d+[\/\d]+/.test(line)) {
              const cols = line.split(/\s+/)
              if (cols.length >= 11) {
                alarms.lossOfSignal = cols[1] || 'no'
                alarms.lossOfAck = cols[2] || 'no'
                alarms.lossOfGem = cols[3] || 'no'
                alarms.ontDisabled = cols[4] || 'no'
                alarms.inactive = cols[5] || 'no'
                alarms.dyingGasp = cols[6] || 'no'
                distance = cols[7] || '--'
                downReason = cols[10] || 'Nenhum'
              }
              break
            }
          }
        }

        // Parse de optics table
        if (opticsLineIndex !== -1) {
          for (let j = opticsLineIndex + 1; j < lines.length; j++) {
            const line = lines[j].trim()
            if (line.startsWith('-----') || line.includes('optics count') || line.includes('OLT_') || line.includes('>#')) {
              continue
            }
            if (/^\d+[\/\d]+/.test(line)) {
              const cols = line.split(/\s+/)
              if (cols.length >= 7) {
                rxPowerOnu = cols[1] || '--'
                tempOnu = cols[3] || '--'
                rxPowerOlt = cols[6] || '--'
              }
              break
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('Extensão ATI: Erro ao buscar dados ópticos na OLT.', e)
      rawOltOutput = `Erro ao carregar dados ópticos: ${e.message || e}`
    }
  }

  // 7. Gera explicação amigável baseado nos alarmes e down reason
  const friendlyExplanation = buildFriendlyExplanation(alarms, downReason, status, motivoQueda, dataQueda, rxPowerOnu, rxPowerOlt)

  return {
    status,
    uptime,
    oltName,
    oltModel,
    slot,
    pon,
    onuId,
    vlan,
    modo,
    addr,
    rxPowerOnu,
    rxPowerOlt,
    distance,
    tempOnu,
    alarms,
    downReason,
    rawOltOutput,
    friendlyExplanation,
    ip,
    mac,
    protocolo,
    nas,
    dataConexao,
    sgpOnuId,
    dataQueda,
    motivoQueda,
  }
}

function getPowerStatus(valStr: string): 'normal' | 'alert_low' | 'alert_high' | 'critical_low' | 'critical_high' | 'unknown' {
  if (!valStr || valStr === '--' || valStr.toLowerCase().includes('unknown') || valStr.toLowerCase().includes('invalid')) {
    return 'unknown'
  }
  const val = parseFloat(valStr)
  if (isNaN(val)) return 'unknown'

  if (val >= -8.0) return 'critical_high'
  if (val < -27.0) return 'critical_low'
  if (val > -15.0) return 'alert_high'
  if (val < -26.0) return 'alert_low'
  return 'normal'
}

function buildFriendlyExplanation(alarms: Record<string, string>, downReason: string, status: 'online' | 'offline' | 'unknown', terminateCause?: string, endTime?: string, rxPowerOnu?: string, rxPowerOlt?: string): string {
  const reasons: string[] = []

  // Check alarm states
  if (alarms.lossOfSignal === 'yes') {
    reasons.push('🔴 <strong>Perda de Sinal Óptico (Loss of Signal):</strong> A fibra que chega ao cliente está sem sinal. A ONU pode estar ligada ou desligada (a OLT não consegue ler). Indica um possível rompimento de cabo externo, fibra rompida ou conector desconectado.')
  } else {
    if (alarms.inactive === 'yes') {
      if (alarms.dyingGasp === 'yes') {
        reasons.push('🔌💤 <strong>ONU Inativa (Dying Gasp):</strong> O equipamento está inativo devido a queda de energia ou desligamento da tomada (indicação forte).')
      } else {
        reasons.push('💤 <strong>ONU Inativa (Ploam Inactive):</strong> A OLT perdeu a conexão com o equipamento. Pode indicar falha de link (link loss), ONU travada (firmware travado ou crashado) ou problema na fonte de alimentação. Solicite ao cliente para reiniciar o equipamento (desligar e ligar da tomada) ou tente um recadastramento/reautorização.')
      }
    } else if (alarms.dyingGasp === 'yes') {
      reasons.push('🔌 <strong>Alerta de Queda de Energia (Dying Gasp):</strong> O equipamento do cliente registrou uma perda de alimentação elétrica.')
    }
  }

  // Check optical power levels
  if (rxPowerOnu) {
    const onuStatus = getPowerStatus(rxPowerOnu)
    if (onuStatus === 'critical_low') {
      reasons.push(`⚠️🔴 <strong>Sinal RX ONU Crítico (Muito Baixo):</strong> A potência recebida pela ONU está em <strong>${rxPowerOnu} dBm</strong> (faixa ideal: -15 a -26 dBm). Isso causa instabilidade extrema ou queda total da conexão. Verifique se há dobras na fibra ou conectores sujos/danificados.`)
    } else if (onuStatus === 'critical_high') {
      reasons.push(`⚠️🔴 <strong>Sinal RX ONU Crítico (Saturação):</strong> A potência recebida pela ONU está muito forte em <strong>${rxPowerOnu} dBm</strong> (acima de -8 dBm). Pode causar danos ao receptor óptico. É necessário adicionar atenuador óptico na fibra.`)
    } else if (onuStatus === 'alert_low') {
      reasons.push(`⚠️🟡 <strong>Sinal RX ONU em Alerta (Baixo):</strong> A potência recebida pela ONU está em <strong>${rxPowerOnu} dBm</strong>, levemente abaixo do ideal (-15 a -26 dBm). Indica atenuação que pode evoluir para queda.`)
    } else if (onuStatus === 'alert_high') {
      reasons.push(`⚠️🟡 <strong>Sinal RX ONU em Alerta (Alto):</strong> A potência recebida pela ONU está em <strong>${rxPowerOnu} dBm</strong>, acima do ideal (-15 a -26 dBm). A potência está um pouco forte.`)
    }
  }

  if (rxPowerOlt) {
    const oltStatus = getPowerStatus(rxPowerOlt)
    if (oltStatus === 'critical_low') {
      reasons.push(`⚠️🔴 <strong>Sinal RX OLT Crítico (Retorno Muito Baixo):</strong> A potência de retorno recebida na OLT está em <strong>${rxPowerOlt} dBm</strong> (abaixo de -27 dBm). Indica atenuação severa na fibra no sentido de upload.`)
    } else if (oltStatus === 'critical_high') {
      reasons.push(`⚠️🔴 <strong>Sinal RX OLT Crítico (Retorno Saturação):</strong> A potência de retorno recebida na OLT está excessivamente forte em <strong>${rxPowerOlt} dBm</strong>.`)
    } else if (oltStatus === 'alert_low') {
      reasons.push(`⚠️🟡 <strong>Sinal RX OLT em Alerta (Retorno Baixo):</strong> A potência de retorno recebida na OLT está em <strong>${rxPowerOlt} dBm</strong>, indicando sinal de subida levemente atenuado.`)
    } else if (oltStatus === 'alert_high') {
      reasons.push(`⚠️🟡 <strong>Sinal RX OLT em Alerta (Retorno Alto):</strong> A potência de retorno recebida na OLT está em <strong>${rxPowerOlt} dBm</strong>, acima da faixa ideal.`)
    }
  }

  if (alarms.lossOfAck === 'yes') {
    reasons.push('⚠️ <strong>Falha de Confirmação (Loss of Ack):</strong> A OLT perdeu contato intermitente com a ONU. Indica atenuação severa na fibra ou conector mal encaixado.')
  }
  if (alarms.ontDisabled === 'yes') {
    reasons.push('🚫 <strong>ONU Desativada (ONT Disabled):</strong> Este equipamento está desabilitado na porta da OLT, possivelmente devido a alguma ação administrativa.')
  }
  if (alarms.lossOfGem === 'yes') {
    reasons.push('⚡ <strong>Falha na Porta GEM (Loss of GEM):</strong> Erro de encapsulamento ou sincronismo de rede entre a ONU e a OLT.')
  }

  // Check down reason
  const dr = downReason.toLowerCase().trim()
  if (dr.includes('signal-degrade')) {
    reasons.push('📉 <strong>Sinal Degradado (Signal Degrade):</strong> A OLT detectou que a potência do sinal está muito fraca ou instável. Sugere fibra atenuada/dobrada, sujeira no conector óptico ou fusão com problema.')
  } else if (dr.includes('power-off') || dr.includes('poweroff')) {
    reasons.push('🔌 <strong>Equipamento Desligado (Power Off):</strong> A ONU foi desconectada da tomada.')
  } else if (dr.includes('deactivation')) {
    reasons.push('❌ <strong>Desautorizado/Desativado:</strong> A ONU foi desativada pela OLT.')
  } else if (dr.includes('dying-gasp') || dr.includes('dyinggasp')) {
    reasons.push('🔌 <strong>Queda de Energia (Dying Gasp):</strong> A OLT registrou que a última queda foi por falta de energia ou desligamento manual do equipamento do cliente.')
  } else if (dr.includes('loss-of-signal') || dr.includes('los')) {
    reasons.push('🔴 <strong>Perda de Sinal (Loss of Signal):</strong> A OLT registrou que a última queda foi por perda física de sinal óptico (fibra rompida, desconectada ou atenuada).')
  }

  if (status === 'offline' && terminateCause) {
    reasons.push(`ℹ️ <strong>Causa de Desconexão Radius:</strong> O servidor Radius registrou a desconexão como <strong>${terminateCause}</strong> em <strong>${endTime || 'Desconhecido'}</strong>.`)
  }

  if (reasons.length > 0) {
    return reasons.join('<br>')
  }

  if (status === 'offline') {
    return '🔌 O cliente está Offline. Nenhuma causa de queda específica foi registrada na OLT ainda. Verifique se o roteador do cliente está ligado na energia elétrica.'
  }

  return '✅ Conexão operando normalmente. Sem alarmes ou degradações de sinal identificadas na OLT.'
}

export async function scrapeSupportData(baseUrl: string, contractId: string, clientId?: string): Promise<SgpSupportData> {
  try {
    const data = await scrapeSupportDataInternal(baseUrl, contractId, clientId)
    return { ...data, sgpUrl: baseUrl }
  } catch (err: any) {
    console.warn(`Extensão ATI: Falha ao buscar dados de suporte no SGP principal (${baseUrl}):`, err)

    let alternateUrl = getAlternateSgpUrl(baseUrl)

    if (alternateUrl) {
      console.log(`Extensão ATI: Tentando fallback para o SGP alternativo: ${alternateUrl}`)
      try {
        // Do not pass clientId on fallback retry since IDs vary between alternate SGPs
        const data = await scrapeSupportDataInternal(alternateUrl, contractId)
        // Fallback deu certo! Atualiza o SGP preferencial no storage
        await chrome.storage.local.set({ ati_preferred_sgp: alternateUrl })
        return { ...data, sgpUrl: alternateUrl }
      } catch (altErr: any) {
        console.error(`Extensão ATI: Falha tanto no SGP principal (${baseUrl}) quanto no alternativo (${alternateUrl}):`, altErr)
        throw err // Lança o erro original para preservar a mensagem inicial de falha
      }
    }

    throw err
  }
}

export async function executeOnuCommand(baseUrl: string, sgpOnuId: string, command: 'reset' | 'tl1-add' | 'tl1-delete'): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureSgpSession(baseUrl)

    let url = ''
    if (command === 'reset') {
      url = `${baseUrl}/admin/network/onu/${sgpOnuId}/reset/`
    } else if (command === 'tl1-add') {
      url = `${baseUrl}/admin/network/onu/${sgpOnuId}/tl1/cmd/?action=add`
    } else if (command === 'tl1-delete') {
      url = `${baseUrl}/admin/network/onu/${sgpOnuId}/tl1/cmd/?action=delete`
    } else {
      throw new Error(`Comando desconhecido: ${command}`)
    }

    console.log(`Extensão ATI: Executando comando ${command} na URL: ${url}`)

    const res = await fetch(url, {
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
    })

    if (res.ok) {
      return { success: true }
    } else {
      return { success: false, error: `HTTP ${res.status}` }
    }
  } catch (err: any) {
    console.error(`Extensão ATI: Erro ao executar comando ${command}:`, err)
    return { success: false, error: err.message || String(err) }
  }
}
