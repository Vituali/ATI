import React, { useState, useRef } from 'react'
import './ChatInterno.css'
import { safeSendMessage, showToast } from '../chatmix/helpers'

interface FeasibilityResult {
  id: string
  name: string
  address: string
  status: string
  system: string
  cpfCnpj?: string
  cadastro?: string
}

function getStatusPriorityScore(statusStr: string): number {
  const lower = statusStr.toLowerCase().trim()
  if (lower.includes('inativo')) return 2
  if (lower.includes('cancelado')) return 1
  if (lower.includes('reduzida') || lower.includes('v. red') || lower.includes('vel. red')) return 4
  if (lower.includes('ativo')) return 5
  if (lower.includes('suspenso')) return 3
  return 0 // Sem status ou outros
}

function parseSgpFeasibilityHtml(htmlStr: string, systemName: string): FeasibilityResult[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlStr, 'text/html')

  // Encontra linhas na listagem do Django Admin
  const rows = doc.querySelectorAll('#result_list tbody tr, table.contrato tbody tr, table.tablelist tbody tr, tr[role="row"]')
  const results: FeasibilityResult[] = []

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'))
    if (cells.length < 3) return

    // Extrai ID da célula 0
    let clientId = ''
    const idLink = cells[0].querySelector('a')
    if (idLink) {
      clientId = idLink.textContent?.trim() || ''
    } else {
      clientId = cells[0].textContent?.trim() || ''
    }

    // Extrai Nome, CPF/CNPJ e endereço da célula 1
    const cell1 = cells[1]
    if (!cell1) return

    // Converte <br> em quebras de linha para garantir a separação correta dos dados em qualquer ambiente
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = cell1.innerHTML
    tempDiv.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
    const cell1Text = tempDiv.textContent || ''

    const lines = cell1Text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    const nameLink = cell1.querySelector('a')
    let clientName = nameLink ? nameLink.textContent?.trim() || '' : ''
    if (!clientName && lines.length > 0) {
      clientName = lines[0]
    }

    // Regex de CPF/CNPJ flexível sem \b boundaries (para contornar não quebras de espaço ou símbolos adjacentes)
    const cpfCnpjMatch = cell1Text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)
    const cpfCnpj = cpfCnpjMatch ? cpfCnpjMatch[0].trim() : ''

    // O endereço costuma ser a última linha após nome, cpf e telefones
    const address = lines.length > 1 ? lines[lines.length - 1] : lines.length > 0 ? lines[0] : ''

    // Extrai Status da célula 2 (Serviços) usando as classes ss_bold do SGP
    let status = 'Sem status'
    const cell2 = cells[2]
    if (cell2) {
      const statusSpans = Array.from(cell2.querySelectorAll('span[class*="ss_bold"], span[class^="ss_bold"], .ss_bold1, .ss_bold2, .ss_bold3, .ss_bold4, .ss_bold5'))
      if (statusSpans.length > 0) {
        let bestSpan = statusSpans[0]
        let maxScore = getStatusPriorityScore(bestSpan.textContent || '')
        for (let i = 1; i < statusSpans.length; i++) {
          const score = getStatusPriorityScore(statusSpans[i].textContent || '')
          if (score > maxScore) {
            maxScore = score
            bestSpan = statusSpans[i]
          }
        }
        status = bestSpan.textContent?.trim() || 'Sem status'
      } else {
        // Fallback sequencial de palavras-chave no texto bruto da célula 2
        const cell2Text = cell2.textContent || ''
        if (cell2Text.includes('Ativo V. Reduzida') || cell2Text.includes('Ativo V.Reduzida') || cell2Text.includes('V. Reduzida')) {
          status = 'Ativo V. Reduzida'
        } else if (cell2Text.includes('Inativo')) {
          status = 'Inativo'
        } else if (cell2Text.includes('Cancelado')) {
          status = 'Cancelado'
        } else if (cell2Text.includes('Ativo')) {
          status = 'Ativo'
        } else if (cell2Text.includes('Suspenso')) {
          status = 'Suspenso'
        }
      }
    }

    // Extrai data de Cadastro da célula 3 (se presente)
    const cadastro = cells.length >= 4 ? cells[3]?.textContent?.trim() || '' : ''

    // Ignora linhas de cabeçalho ou inválidas
    if (clientName && clientName !== clientId && clientName !== 'Nome') {
      results.push({
        id: clientId,
        name: clientName,
        address,
        status,
        system: systemName,
        cpfCnpj,
        cadastro,
      })
    }
  })

  return results
}

interface OfflineClient {
  id: string
  name: string
  address: string
  status: string
  system: string
  cpfCnpj?: string
  cadastro?: string
  offlineSince?: string
  pop?: string
  plano?: string
  nas?: string
  mac?: string
  ip?: string
  login?: string
  serviceId?: string
}

function parseSgpOfflineClientsHtml(htmlStr: string, systemName: string): OfflineClient[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlStr, 'text/html')

  const rows = doc.querySelectorAll('table.tablelist tbody tr, #result_list tbody tr, table.contrato tbody tr, tr[role="row"]')
  const results: OfflineClient[] = []

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'))
    if (cells.length < 3) return

    // Cell 0: ID
    const clientId = cells[0].textContent?.trim() || ''

    // Cell 1: Name, CPF/CNPJ, address, phones
    const cell1Text = cells[1].textContent || ''
    const nameLink = cells[1].querySelector('a')
    let clientName = nameLink ? nameLink.textContent?.trim() || '' : ''
    clientName = clientName.replace(/\s+/g, ' ').trim()

    if (!clientName) {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = cells[1].innerHTML
      tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
      const lines = tempDiv.textContent?.split('\n').map(l => l.trim()).filter(Boolean) || []
      if (lines.length > 0) {
        clientName = lines[0]
      }
    }

    const cpfCnpjMatch = cell1Text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)
    const cpfCnpj = cpfCnpjMatch ? cpfCnpjMatch[0].trim() : ''

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = cells[1].innerHTML
    tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
    const linesText = tempDiv.textContent || ''
    const addressLines = linesText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
    
    const address = addressLines.length > 0 ? addressLines[addressLines.length - 1] : ''

    // Cell 2: Connection details
    const cell2 = cells[2]
    if (!cell2) return
    
    const cell2Text = cell2.textContent || ''
    
    // Extract "Offline Desde: ..."
    const offlineSinceMatch = cell2Text.match(/Offline Desde:\s*([\d/: ]+)/i)
    const offlineSince = offlineSinceMatch ? offlineSinceMatch[1].trim() : ''

    // Extract Pop
    const popMatch = cell2Text.match(/Pop:\s*([^\n\r]+)/i)
    const pop = popMatch ? popMatch[1].split('Plano:')[0].trim() : ''

    // Extract Plano
    const planoMatch = cell2Text.match(/Plano:\s*([^\n\r]+)/i)
    const plano = planoMatch ? planoMatch[1].split('Nas:')[0].trim() : ''

    // Extract Nas, Mac, IP
    const nasMatch = cell2Text.match(/Nas:\s*([^\n\r|-]+)/i)
    const nas = nasMatch ? nasMatch[1].trim() : ''

    const macMatch = cell2Text.match(/Mac:\s*([^\n\r|IP:]+)/i)
    const mac = macMatch ? macMatch[1].replace(/\xa0/g, ' ').replace(/&nbsp;/g, ' ').trim() : ''

    const ipMatch = cell2Text.match(/IP:\s*([^\n\r|Ativo|Inativo|Suspenso|Id:]+)/i)
    const ip = ipMatch ? ipMatch[1].replace(/\xa0/g, ' ').replace(/&nbsp;/g, ' ').trim() : ''

    // Extract status
    const statusSpan = cell2.querySelector('span[class*="ss_bold"]')
    const status = statusSpan ? statusSpan.textContent?.trim() || 'Sem status' : 'Sem status'

    // Extract service login
    const loginLink = cell2.querySelector('a.tbold')
    const login = loginLink ? loginLink.textContent?.trim() || '' : ''

    // Extract service ID
    const idMatch = cell2Text.match(/Id:\s*(\d+)/i)
    const serviceId = idMatch ? idMatch[1].trim() : ''

    const cadastro = cells[3] ? cells[3].textContent?.trim() || '' : ''

    if (clientName && clientName !== clientId && clientName !== 'Nome') {
      results.push({
        id: clientId,
        name: clientName,
        address,
        status,
        system: systemName,
        cpfCnpj,
        cadastro,
        offlineSince,
        pop,
        plano,
        nas,
        mac,
        ip,
        login,
        serviceId
      })
    }
  })

  return results
}

const ChatInterno: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTool, setActiveTool] = useState('chat_interno')
  const versionRef = useRef(Date.now())

  // Consulta de Viabilidade
  const [streetQuery, setStreetQuery] = useState('')
  const [numberQuery, setNumberQuery] = useState('')
  const [sgpTarget, setSgpTarget] = useState('both')
  const [feasibilityLoading, setFeasibilityLoading] = useState(false)
  const [feasibilityResults, setFeasibilityResults] = useState<FeasibilityResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [feasibilityType, setFeasibilityType] = useState<'active' | 'inactive' | 'none'>('none')
  const [localFilter, setLocalFilter] = useState('')

  // Verificar Quedas / Clientes Offline
  const [outageLogradouroQuery, setOutageLogradouroQuery] = useState('')
  const [outageNumeroQuery, setOutageNumeroQuery] = useState('')
  const [outageBairroQuery, setOutageBairroQuery] = useState('')
  const [outageOltQuery, setOutageOltQuery] = useState('') // OLT
  const [outageOltslotQuery, setOutageOltslotQuery] = useState('') // Slot
  const [outageOltponQuery, setOutageOltponQuery] = useState('') // PON
  const [outageSgpTarget, setOutageSgpTarget] = useState('both')
  const [outageLoading, setOutageLoading] = useState(false)
  const [outageResults, setOutageResults] = useState<OfflineClient[]>([])
  const [outageHasSearched, setOutageHasSearched] = useState(false)
  const [outageLocalFilter, setOutageLocalFilter] = useState('')

  // Link do seu site com o modo embed ativado
  const embedUrl = 'https://vituali.github.io/ati/?mode=embed'

  const tools = [
    { id: 'chat_interno', label: 'Chat', icon: '💬' },
    { id: 'modelos_os', label: 'O.S.', icon: '📋' },
    { id: 'viabilidade', label: 'Viabilidade', icon: '🌐' },
    { id: 'quedas', label: 'Quedas', icon: '🔌' },
    { id: 'senhas', label: 'Senhas', icon: '🔑' },
    { id: 'anotacoes', label: 'Notas', icon: '📝' },
    { id: 'conversor', label: 'Conversor', icon: '🔄' },
    { id: 'respostas_rapidas', label: 'Respostas', icon: '🗨️' },
  ]

  const handleSearchFeasibility = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!streetQuery.trim()) {
      showToast('Por favor, digite o nome da rua.', 'error')
      return
    }

    setFeasibilityLoading(true)
    setFeasibilityResults([])
    setHasSearched(true)
    setLocalFilter('')

    try {
      const targets = []
      if (sgpTarget === '35' || sgpTarget === 'both') {
        targets.push({ url: 'http://201.158.20.35:8000', name: 'SGP Antigo' })
      }
      if (sgpTarget === '53' || sgpTarget === 'both') {
        targets.push({ url: 'http://201.158.20.53:8000', name: 'SGP Novo' })
      }

      const searchPromises = targets.map(async (t) => {
        try {
          const res = await safeSendMessage({
            action: 'searchSgpFeasibility',
            baseUrl: t.url,
            logradouro: streetQuery.trim(),
            numero: numberQuery.trim() || undefined,
          })
          if (res?.success && res.html) {
            return parseSgpFeasibilityHtml(res.html, t.name)
          }
          return []
        } catch (err) {
          console.error(`Erro ao buscar viabilidade no ${t.name}:`, err)
          return []
        }
      })

      const allResultsArray = await Promise.all(searchPromises)
      const combined = allResultsArray.flat()

      // --- REMOÇÃO DE DUPLICADOS ---
      const uniqMap = new Map<string, FeasibilityResult>()
      combined.forEach((item) => {
        // Normalização rigorosa do CPF/CNPJ (apenas dígitos)
        const cleanCpfCnpj = (item.cpfCnpj || '').replace(/\D/g, '')
        // Normalização rigorosa do nome (remover acentos, espaços extras, minúsculas)
        const cleanName = item.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .replace(/\s+/g, ' ')

        const key = cleanCpfCnpj || cleanName
        if (!key) return

        const existing = uniqMap.get(key)
        if (!existing) {
          uniqMap.set(key, item)
        } else {
          const existingScore = getStatusPriorityScore(existing.status)
          const itemScore = getStatusPriorityScore(item.status)

          if (itemScore > existingScore) {
            uniqMap.set(key, item)
          } else if (itemScore === existingScore) {
            // Se empatar a prioridade do status, prefere o SGP Novo (.53) ao SGP Antigo (.35)
            const isItemNovo = item.system.toLowerCase().includes('novo')
            const isExistingNovo = existing.system.toLowerCase().includes('novo')
            if (isItemNovo && !isExistingNovo) {
              uniqMap.set(key, item)
            }
          }
        }
      })

      const deduplicated = Array.from(uniqMap.values())

      // --- FILTRAGEM POR STATUS (ATIVOS vs OUTROS) ---
      // Ativos e Suspensos são considerados ativos operacionais
      const isClientActive = (statusStr: string) => {
        const lower = statusStr.toLowerCase().trim()
        if (lower.includes('inativo')) return false
        if (lower.includes('cancelado')) return false
        return lower.includes('ativo') || lower.includes('reduzida') || lower.includes('v. red') || lower.includes('vel. red') || lower.includes('suspenso')
      }

      const activeClients = deduplicated.filter((c) => isClientActive(c.status))
      const inactiveClients = deduplicated.filter((c) => !isClientActive(c.status))

      // --- ORDENAÇÃO E DEFINIÇÃO DOS RESULTADOS ---
      if (activeClients.length > 0) {
        const sortedActive = activeClients.sort((a, b) => {
          const scoreA = getStatusPriorityScore(a.status)
          const scoreB = getStatusPriorityScore(b.status)
          if (scoreB !== scoreA) return scoreB - scoreA
          return a.name.localeCompare(b.name)
        })
        setFeasibilityResults(sortedActive)
        setFeasibilityType('active')
      } else if (inactiveClients.length > 0) {
        const sortedInactive = inactiveClients.sort((a, b) => {
          const scoreA = getStatusPriorityScore(a.status)
          const scoreB = getStatusPriorityScore(b.status)
          if (scoreB !== scoreA) return scoreB - scoreA
          return a.name.localeCompare(b.name)
        })
        setFeasibilityResults(sortedInactive)
        setFeasibilityType('inactive')
      } else {
        setFeasibilityResults([])
        setFeasibilityType('none')
      }
    } catch (error: any) {
      console.error('Erro na consulta de viabilidade:', error)
      showToast(`Erro na consulta: ${error.message || error}`, 'error')
    } finally {
      setFeasibilityLoading(false)
    }
  }

  const handleSearchOffline = async (e: React.FormEvent) => {
    e.preventDefault()
    setOutageLoading(true)
    setOutageResults([])
    setOutageHasSearched(true)
    setOutageLocalFilter('')

    try {
      const targets = []
      if (outageSgpTarget === '35' || outageSgpTarget === 'both') {
        targets.push({ url: 'http://201.158.20.35:8000', name: 'SGP Antigo' })
      }
      if (outageSgpTarget === '53' || outageSgpTarget === 'both') {
        targets.push({ url: 'http://201.158.20.53:8000', name: 'SGP Novo' })
      }

      const searchPromises = targets.map(async (t) => {
        try {
          const res = await safeSendMessage({
            action: 'searchSgpOfflineClients',
            baseUrl: t.url,
            filters: {
              logradouro: outageLogradouroQuery.trim() || undefined,
              numero: outageNumeroQuery.trim() || undefined,
              bairro: outageBairroQuery.trim() || undefined,
              olt: outageOltQuery.trim() || undefined,
              oltslot: outageOltslotQuery.trim() || undefined,
              oltpon: outageOltponQuery.trim() || undefined,
            }
          })
          if (res?.success && res.html) {
            return parseSgpOfflineClientsHtml(res.html, t.name)
          }
          return []
        } catch (err) {
          console.error(`Erro ao buscar quedas no ${t.name}:`, err)
          return []
        }
      })

      const allResultsArray = await Promise.all(searchPromises)
      const combined = allResultsArray.flat()

      const uniqMap = new Map<string, OfflineClient>()
      combined.forEach((item) => {
        const key = `${item.system}_${item.id}_${item.serviceId || item.login}`
        uniqMap.set(key, item)
      })

      const deduplicated = Array.from(uniqMap.values())
      setOutageResults(deduplicated)
    } catch (error: any) {
      console.error('Erro na consulta de quedas:', error)
      showToast(`Erro na consulta: ${error.message || error}`, 'error')
    } finally {
      setOutageLoading(false)
    }
  }

  const filteredResults = feasibilityResults.filter((client) => {
    if (!localFilter.trim()) return true
    const filterLower = localFilter.toLowerCase().trim()
    return client.name.toLowerCase().includes(filterLower) || client.address.toLowerCase().includes(filterLower) || client.id.toLowerCase().includes(filterLower) || client.status.toLowerCase().includes(filterLower) || (client.cpfCnpj && client.cpfCnpj.toLowerCase().includes(filterLower))
  })

  const filteredOutages = outageResults.filter((client) => {
    if (!outageLocalFilter.trim()) return true
    const filterLower = outageLocalFilter.toLowerCase().trim()
    return (
      client.name.toLowerCase().includes(filterLower) ||
      client.address.toLowerCase().includes(filterLower) ||
      client.id.toLowerCase().includes(filterLower) ||
      client.status.toLowerCase().includes(filterLower) ||
      (client.cpfCnpj && client.cpfCnpj.toLowerCase().includes(filterLower)) ||
      (client.login && client.login.toLowerCase().includes(filterLower)) ||
      (client.nas && client.nas.toLowerCase().includes(filterLower)) ||
      (client.pop && client.pop.toLowerCase().includes(filterLower)) ||
      (client.plano && client.plano.toLowerCase().includes(filterLower)) ||
      (client.offlineSince && client.offlineSince.toLowerCase().includes(filterLower))
    )
  })

  return (
    <div className="ati-chat-container">
      {/* Botão Flutuante */}
      <button className={`ati-chat-toggle ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)} title="Painel Auxiliar ATI">
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        )}
      </button>

      {/* Janela do Chat (Iframe ou Viabilidade) */}
      <div className={`ati-chat-window ${isOpen ? 'show' : ''}`}>
        <div className="ati-chat-header">
          <span>Painel Auxiliar ATI</span>
          <button onClick={() => setIsOpen(false)}>×</button>
        </div>

        {/* Barra de Navegação Nativa no Painel da Extensão */}
        <div className="ati-chat-navbar">
          {tools.map((tool) => (
            <button key={tool.id} className={`ati-chat-nav-item ${activeTool === tool.id ? 'active' : ''}`} onClick={() => setActiveTool(tool.id)} title={tool.label}>
              <span className="ati-chat-nav-icon">{tool.icon}</span>
              <span className="ati-chat-nav-text">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="ati-chat-iframe-wrapper">
          {isOpen && activeTool === 'viabilidade' ? (
            <div className="ati-feasibility-container">
              <div className="ati-feasibility-title">Consultar Viabilidade</div>
              <div className="ati-feasibility-subtitle">Busque por clientes cadastrados em uma rua e número para verificar a cobertura.</div>

              <form onSubmit={handleSearchFeasibility} className="ati-feasibility-form">
                <div className="ati-feasibility-row">
                  <div className="ati-feasibility-input-wrapper flex-3">
                    <label className="ati-feasibility-label">Nome da Rua / Logradouro</label>
                    <input type="text" className="ati-feasibility-input" placeholder="Ex: Rua Guaicurus" value={streetQuery} onChange={(e) => setStreetQuery(e.target.value)} required />
                  </div>

                  <div className="ati-feasibility-input-wrapper flex-1">
                    <label className="ati-feasibility-label">Número</label>
                    <input type="text" className="ati-feasibility-input" placeholder="Ex: 525" value={numberQuery} onChange={(e) => setNumberQuery(e.target.value)} />
                  </div>
                </div>

                <div className="ati-feasibility-input-wrapper">
                  <label className="ati-feasibility-label">Buscar em qual SGP?</label>
                  <select className="ati-feasibility-select" value={sgpTarget} onChange={(e) => setSgpTarget(e.target.value)}>
                    <option value="both">Ambos (Recomendado)</option>
                    <option value="53">SGP Novo (.53)</option>
                    <option value="35">SGP Antigo (.35)</option>
                  </select>
                </div>

                <button type="submit" className="ati-feasibility-btn" disabled={feasibilityLoading}>
                  {feasibilityLoading ? (
                    <>
                      <span className="ati-feasibility-spinner"></span>
                      <span>Consultando...</span>
                    </>
                  ) : (
                    <span>Consultar Rua</span>
                  )}
                </button>
              </form>

              {hasSearched && !feasibilityLoading && (
                <div className="ati-feasibility-results-list">
                  {feasibilityResults.length > 0 ? (
                    <>
                      <div className="ati-feasibility-local-search">
                        <input type="text" className="ati-feasibility-input" placeholder="🔍 Filtrar resultados (nome, apto, nº...)" value={localFilter} onChange={(e) => setLocalFilter(e.target.value)} />
                      </div>

                      {feasibilityType === 'active' ? (
                        <div className="ati-feasibility-results-header ati-feasibility-results-header--active">
                          <span>✅ Viabilidade confirmada!</span>
                          <span>
                            ({filteredResults.length} de {feasibilityResults.length} cliente(s) ativo(s) encontrado(s))
                          </span>
                        </div>
                      ) : (
                        <div className="ati-feasibility-results-header ati-feasibility-results-header--inactive">
                          <span>⚠️ Atenção: Nenhum cliente ativo no local.</span>
                          <span>
                            Encontrado(s) {filteredResults.length} de {feasibilityResults.length} cadastro(s) com outro status:
                          </span>
                        </div>
                      )}
                      {filteredResults.map((client, idx) => (
                        <div key={idx} className={`ati-feasibility-card ${feasibilityType === 'inactive' ? 'ati-feasibility-card--inactive' : ''}`}>
                          <div className="ati-feasibility-card-header">
                            <span className="ati-feasibility-client-name">{client.name}</span>
                            <span className={`ati-feasibility-badge ${client.system.includes('Novo') ? 'ati-feasibility-badge--53' : 'ati-feasibility-badge--35'}`}>{client.system}</span>
                          </div>
                          <div className="ati-feasibility-card-meta">
                            <span className="ati-feasibility-client-id">ID: {client.id}</span>
                            {client.cadastro && <span className="ati-feasibility-client-cadastro">{client.cadastro}</span>}
                          </div>
                          <span className="ati-feasibility-client-address">{client.address}</span>
                          <span className="ati-feasibility-client-status">Status: {client.status}</span>
                        </div>
                      ))}
                      {filteredResults.length === 0 && <div className="ati-feasibility-empty-filter">Nenhum resultado corresponde ao filtro "{localFilter}".</div>}
                    </>
                  ) : (
                    <div className="ati-feasibility-empty">
                      <div className="ati-feasibility-empty-title">Nenhum cliente encontrado</div>
                      <div className="ati-feasibility-empty-desc">Nenhum cliente cadastrado foi encontrado nesta rua/número nos SGPs selecionados.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : isOpen && activeTool === 'quedas' ? (
            <div className="ati-feasibility-container">
              <div className="ati-feasibility-title">Verificar Quedas</div>
              <div className="ati-feasibility-subtitle">Busque por clientes offline no SGP com filtros específicos para identificar quedas massivas.</div>

              <form onSubmit={handleSearchOffline} className="ati-feasibility-form">
                <div className="ati-feasibility-row">
                  <div className="ati-feasibility-input-wrapper flex-3">
                    <label className="ati-feasibility-label">Rua / Logradouro</label>
                    <input type="text" className="ati-feasibility-input" placeholder="Ex: Rua Guaicurus" value={outageLogradouroQuery} onChange={(e) => setOutageLogradouroQuery(e.target.value)} />
                  </div>

                  <div className="ati-feasibility-input-wrapper flex-1">
                    <label className="ati-feasibility-label">Número</label>
                    <input type="text" className="ati-feasibility-input" placeholder="Ex: 525" value={outageNumeroQuery} onChange={(e) => setOutageNumeroQuery(e.target.value)} />
                  </div>
                </div>

                <div className="ati-feasibility-row">
                  <div className="ati-feasibility-input-wrapper flex-1">
                    <label className="ati-feasibility-label">Bairro</label>
                    <input type="text" className="ati-feasibility-input" placeholder="Ex: Caleme" value={outageBairroQuery} onChange={(e) => setOutageBairroQuery(e.target.value)} />
                  </div>

                  <div className="ati-feasibility-input-wrapper flex-1">
                    <label className="ati-feasibility-label">OLT</label>
                    <select className="ati-feasibility-select" value={outageOltQuery} onChange={(e) => setOutageOltQuery(e.target.value)}>
                      <option value="">Todas</option>
                      <option value="1">OLT NOKIA VARZEA - 192.168.140.7</option>
                      <option value="2">OLT NOKIA SAO PEDRO - 192.168.140.9</option>
                      <option value="3">OLT NOKIA ALTO - 192.168.140.10</option>
                      <option value="4">OLT NOKIA BARRA - 192.168.140.13</option>
                      <option value="5">OLT NOKIA PONTE IMBUI - 192.168.140.11</option>
                      <option value="6">OLT NOKIA CASCATA - 192.168.140.12</option>
                      <option value="7">OLT NOKIA FONTE SANTA - 192.168.140.8</option>
                    </select>
                  </div>
                </div>

                <div className="ati-feasibility-row">
                  <div className="ati-feasibility-input-wrapper flex-1">
                    <label className="ati-feasibility-label">Slot</label>
                    <input type="number" className="ati-feasibility-input" placeholder="Ex: 1" value={outageOltslotQuery} onChange={(e) => setOutageOltslotQuery(e.target.value)} />
                  </div>

                  <div className="ati-feasibility-input-wrapper flex-1">
                    <label className="ati-feasibility-label">PON</label>
                    <input type="number" className="ati-feasibility-input" placeholder="Ex: 8" value={outageOltponQuery} onChange={(e) => setOutageOltponQuery(e.target.value)} />
                  </div>
                </div>

                <div className="ati-feasibility-input-wrapper">
                  <label className="ati-feasibility-label">Buscar em qual SGP?</label>
                  <select className="ati-feasibility-select" value={outageSgpTarget} onChange={(e) => setOutageSgpTarget(e.target.value)}>
                    <option value="both">Ambos (Recomendado)</option>
                    <option value="53">SGP Novo (.53)</option>
                    <option value="35">SGP Antigo (.35)</option>
                  </select>
                </div>

                <button type="submit" className="ati-feasibility-btn" disabled={outageLoading}>
                  {outageLoading ? (
                    <>
                      <span className="ati-feasibility-spinner"></span>
                      <span>Consultando Quedas...</span>
                    </>
                  ) : (
                    <span>Consultar Clientes Offline</span>
                  )}
                </button>
              </form>

              {outageHasSearched && !outageLoading && (
                <div className="ati-feasibility-results-list">
                  {outageResults.length > 0 ? (
                    <>
                      <div className="ati-feasibility-local-search">
                        <input type="text" className="ati-feasibility-input" placeholder="🔍 Filtrar nesta lista (nome, login, plano...)" value={outageLocalFilter} onChange={(e) => setOutageLocalFilter(e.target.value)} />
                      </div>

                      <div className="ati-feasibility-results-header ati-feasibility-results-header--inactive">
                        <span>🔌 Outages / Quedas Detectadas</span>
                        <span>
                          Encontrado(s) {filteredOutages.length} de {outageResults.length} cliente(s) offline:
                        </span>
                      </div>

                      {filteredOutages.map((client, idx) => {
                        const baseUrl = client.system.includes('Novo') ? 'http://201.158.20.53:8000' : 'http://201.158.20.35:8000';
                        return (
                          <div key={idx} className="ati-feasibility-card ati-feasibility-card--inactive">
                            <div className="ati-feasibility-card-header">
                              <span className="ati-feasibility-client-name">
                                <a href={`${baseUrl}/admin/cliente/${client.id}/contratos/`} target="_blank" rel="noopener noreferrer" className="ati-outage-link-client">
                                  {client.name}
                                </a>
                              </span>
                              <span className={`ati-feasibility-badge ${client.system.includes('Novo') ? 'ati-feasibility-badge--53' : 'ati-feasibility-badge--35'}`}>{client.system}</span>
                            </div>
                            
                            <div className="ati-feasibility-card-meta" style={{ marginTop: '2px' }}>
                              <span className="ati-feasibility-client-id">
                                ID Cliente: <a href={`${baseUrl}/admin/cliente/${client.id}/edit/`} target="_blank" rel="noopener noreferrer" className="ati-outage-link-sub">{client.id}</a>
                              </span>
                              {client.cadastro && <span className="ati-feasibility-client-cadastro">Cad: {client.cadastro}</span>}
                            </div>

                            <div className="ati-feasibility-client-address" style={{ margin: '4px 0' }}>
                              <strong>Rua:</strong> {client.address}
                            </div>

                            <div className="ati-outage-details-grid">
                              {client.offlineSince && (
                                <div className="ati-outage-detail-item">
                                  <strong>Offline Desde:</strong> <span className="ati-outage-offline-time">{client.offlineSince}</span>
                                </div>
                              )}
                              {client.pop && client.pop.trim().toUpperCase() !== 'TERESOPOLIS-RJ' && (
                                <div className="ati-outage-detail-item">
                                  <strong>POP:</strong> {client.pop}
                                </div>
                              )}
                              {client.plano && (
                                <div className="ati-outage-detail-item">
                                  <strong>Plano:</strong> {client.plano}
                                </div>
                              )}
                              {((client.nas && !['proxy', 'cisco'].includes(client.nas.trim().toLowerCase())) || client.mac || client.ip) && (
                                <div className="ati-outage-detail-item">
                                  <strong>Conexão:</strong> {[
                                    client.nas && !['proxy', 'cisco'].includes(client.nas.trim().toLowerCase()) ? `NAS: ${client.nas}` : null,
                                    client.mac ? `MAC: ${client.mac}` : null,
                                    client.ip ? `IP: ${client.ip}` : null
                                  ].filter(Boolean).join(' | ')}
                                </div>
                              )}
                              {client.login && (
                                <div className="ati-outage-detail-item">
                                  <strong>Login:</strong>{' '}
                                  <a href={`${baseUrl}/admin/servicos/internet/${client.serviceId}/`} target="_blank" rel="noopener noreferrer" className="ati-outage-link-login">
                                    {client.login}
                                  </a>{' '}
                                  {client.serviceId && <span style={{ opacity: 0.6 }}>(ID Serv: {client.serviceId})</span>}
                                </div>
                              )}
                            </div>

                            <span className="ati-feasibility-client-status" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px', marginTop: '4px', display: 'block' }}>
                              Status Contrato: <span style={{ color: '#fbbf24', fontWeight: '500' }}>{client.status}</span>
                            </span>
                          </div>
                        )
                      })}

                      {filteredOutages.length === 0 && <div className="ati-feasibility-empty-filter">Nenhum cliente offline corresponde ao filtro "{outageLocalFilter}".</div>}
                    </>
                  ) : (
                    <div className="ati-feasibility-empty" style={{ background: 'rgba(74, 222, 128, 0.04)', borderColor: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' }}>
                      <div className="ati-feasibility-empty-title">Tudo online!</div>
                      <div className="ati-feasibility-empty-desc">Nenhum cliente offline encontrado nos SGPs selecionados para os filtros informados.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            isOpen && <iframe src={`${embedUrl}&section=${activeTool}&v=${versionRef.current}`} className="ati-chat-iframe" title="Painel Auxiliar ATI Embed" allow="clipboard-read; clipboard-write; camera; microphone" />
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatInterno
