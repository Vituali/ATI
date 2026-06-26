// pages/app/Relatorios.tsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { ref, onValue, set } from 'firebase/database'
import { BarChart3, Settings, CheckCircle, AlertCircle, XCircle, Zap, Trash2, ArrowUp, ArrowDown, Calendar, RefreshCw } from 'lucide-react'
import { db } from '../../../services/firebase'
import LoadingOverlay from '../../../components/ui/LoadingOverlay'
import './Relatorios.css'

interface RegistroPotencia {
  id: string
  olt: string
  pon: string
  vlan: string
  rx: string
  tx: string
  rxOlt: string
  login: string
  contrato: string
  nome: string
  bairro: string
  endereco: string
  status: string
  statusUpdatedAt?: number
  retornoData?: string
  servicoId?: string
  contratoId?: string
  serviceUrl?: string
  dataColeta: number
  coletadoPor: string
}

function formatarData(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function parsePon(ponStr: string) {
  const parts = (ponStr || '').split('/')
  if (parts.length >= 2) {
    return {
      slot: parts[0],
      pon: parts[1],
      onu: parts[2] || '',
    }
  }
  return {
    slot: '-',
    pon: ponStr || '-',
    onu: '',
  }
}

export default function Relatorios() {
  const [registros, setRegistros] = useState<RegistroPotencia[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroSinal, setFiltroSinal] = useState<'todos' | 'excelente' | 'atencao' | 'critico'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [ordenacao, setOrdenacao] = useState<{ coluna: string; direcao: 'asc' | 'desc' } | null>(null)
  const [itensExibidos, setItensExibidos] = useState(50)

  const [exibirVlan, setExibirVlan] = useState(false)
  const [exibirSinalTx, setExibirSinalTx] = useState(false)
  const [exibirRxOlt, setExibirRxOlt] = useState(false)
  const [exibirDataColeta, setExibirDataColeta] = useState(false)

  // Reseta paginação quando o filtro ou busca muda
  const filterKey = `${busca}|${filtroSinal}|${filtroStatus}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setItensExibidos(50)
  }

  // Configurações de Limites de Sinais (Thresholds)
  const [thresholds, setThresholds] = useState({
    maxExcelente: -15, // Sinal muito forte/quente (acima disso é saturação/atenção)
    minExcelente: -20, // Excelente (entre minExcelente e maxExcelente)
    minAtencao: -25, // Atenção (entre minAtencao e minExcelente)
  })
  const [exibirConfig, setExibirConfig] = useState(false)
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  // States locais para o formulário de edição de limites
  const [inputMaxExc, setInputMaxExc] = useState('-15')
  const [inputMinExc, setInputMinExc] = useState('-20')
  const [inputMinAt, setInputMinAt] = useState('-25')

  useEffect(() => {
    // 1. Ouvinte para as potências
    const potenciasRef = ref(db, 'historico_potencias')
    const unsubscribePotencias = onValue(
      potenciasRef,
      (snapshot) => {
        const lista: RegistroPotencia[] = []
        const agora = Date.now()
        const seteDias = 7 * 24 * 60 * 60 * 1000

        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const val = child.val() as Omit<RegistroPotencia, 'id'>
            const id = child.key!
            let status = val.status || 'Não Verificado'
            const refTime = val.statusUpdatedAt || val.dataColeta

            // Se status for "Feito" e passou 7 dias, zera para "Não Verificado"
            if (status === 'Feito' && refTime && agora - refTime > seteDias) {
              status = 'Não Verificado'
              set(ref(db, `historico_potencias/${id}/status`), 'Não Verificado')
              set(ref(db, `historico_potencias/${id}/statusUpdatedAt`), agora)
            }

            lista.push({
              ...val,
              id,
              status,
            })
          })
        }
        lista.sort((a, b) => b.dataColeta - a.dataColeta)
        setRegistros(lista)
        setLoading(false)
      },
      (error) => {
        console.error('Erro ao carregar potências do banco:', error)
        setLoading(false)
      },
    )

    // 2. Ouvinte para a configuração de limites
    const configRef = ref(db, 'config/potencia_thresholds')
    const unsubscribeConfig = onValue(
      configRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val()
          const loaded = {
            maxExcelente: Number(val.maxExcelente ?? -15),
            minExcelente: Number(val.minExcelente ?? -20),
            minAtencao: Number(val.minAtencao ?? -25),
          }
          setThresholds(loaded)
          setInputMaxExc(String(loaded.maxExcelente))
          setInputMinExc(String(loaded.minExcelente))
          setInputMinAt(String(loaded.minAtencao))
        }
      },
      (error) => {
        console.error('Erro ao carregar limites do banco:', error)
      },
    )

    return () => {
      unsubscribePotencias()
      unsubscribeConfig()
    }
  }, [])

  // Salvar limites no Firebase Realtime DB
  const salvarLimites = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoConfig(true)
    try {
      const newThresholds = {
        maxExcelente: Number(inputMaxExc),
        minExcelente: Number(inputMinExc),
        minAtencao: Number(inputMinAt),
      }
      await set(ref(db, 'config/potencia_thresholds'), newThresholds)
      setThresholds(newThresholds)
      setExibirConfig(false)
    } catch (err) {
      console.error('Erro ao salvar limites de potência:', err)
      alert('Falha ao salvar as configurações.')
    } finally {
      setSalvandoConfig(false)
    }
  }

  // Atualiza status do cliente e salva data de retorno se necessário
  const atualizarStatus = useCallback(async (id: string, novoStatus: string, dataRetorno?: string) => {
    const statusUpdatedAt = Date.now()
    const retornoData = novoStatus === 'Ausente (Retorno)' ? dataRetorno || '' : ''

    try {
      await set(ref(db, `historico_potencias/${id}/status`), novoStatus)
      await set(ref(db, `historico_potencias/${id}/statusUpdatedAt`), statusUpdatedAt)
      await set(ref(db, `historico_potencias/${id}/retornoData`), retornoData)
    } catch (e) {
      console.error('Erro ao atualizar status:', e)
      alert('Erro ao atualizar status.')
    }
  }, [])

  // Helper para classificar o sinal (RX) baseado nos thresholds
  const classificarSinal = useCallback(
    (rxStr: string) => {
      const rx = parseFloat((rxStr || '').replace(' dBm', '').trim())
      if (isNaN(rx)) return { label: 'N/A', classe: 'na' }

      const { maxExcelente, minExcelente, minAtencao } = thresholds

      if (rx > maxExcelente) {
        return { label: `Forte (> ${maxExcelente})`, classe: 'atencao' }
      }
      if (rx >= minExcelente) {
        return { label: 'Excelente', classe: 'excelente' }
      }
      if (rx >= minAtencao) {
        return { label: 'Atenção', classe: 'atencao' }
      }
      return { label: 'Crítico', classe: 'critico' }
    },
    [thresholds],
  )

  // Ordenar colunas ao clicar nos cabeçalhos
  const handleSort = (coluna: string) => {
    setOrdenacao((prev) => {
      if (prev?.coluna === coluna) {
        if (prev.direcao === 'asc') {
          return { coluna, direcao: 'desc' }
        }
        return null
      }
      return { coluna, direcao: 'asc' }
    })
  }

  // Filtragem e busca reativa usando useMemo
  const registrosFiltrados = useMemo(() => {
    const filtered = registros.filter((reg) => {
      const query = busca.toLowerCase()
      const bateBusca = (reg.login || '').toLowerCase().includes(query) || (reg.nome || '').toLowerCase().includes(query) || (reg.olt || '').toLowerCase().includes(query) || (reg.bairro || '').toLowerCase().includes(query) || (reg.endereco || '').toLowerCase().includes(query) || (reg.contrato || '').toLowerCase().includes(query) || (reg.pon || '').toLowerCase().includes(query) || (reg.status || '').toLowerCase().includes(query)

      if (!bateBusca) return false

      // Filtro de Status
      if (filtroStatus !== 'todos') {
        const statusVal = reg.status || 'Não Verificado'
        if (statusVal !== filtroStatus) return false
      }

      if (filtroSinal === 'todos') return true
      const classif = classificarSinal(reg.rx)
      return classif.classe === filtroSinal
    })

    if (ordenacao) {
      const { coluna, direcao } = ordenacao
      const factor = direcao === 'asc' ? 1 : -1

      filtered.sort((a, b) => {
        if (coluna === 'contrato') {
          const valA = (a.contrato || '').toLowerCase()
          const valB = (b.contrato || '').toLowerCase()
          return valA.localeCompare(valB) * factor
        }
        if (coluna === 'status') {
          const statusOrder: Record<string, number> = {
            'Não Verificado': 0,
            'Em Andamento': 1,
            'Ausente (Retorno)': 2,
            Feito: 3,
          }
          const valA = statusOrder[a.status || 'Não Verificado'] ?? 0
          const valB = statusOrder[b.status || 'Não Verificado'] ?? 0
          return (valA - valB) * factor
        }
        if (coluna === 'rx') {
          const valA = parseFloat(a.rx) || -99
          const valB = parseFloat(b.rx) || -99
          return (valA - valB) * factor
        }
        if (coluna === 'dataColeta') {
          return (a.dataColeta - b.dataColeta) * factor
        }
        return 0
      })
    }

    return filtered
  }, [registros, busca, filtroSinal, filtroStatus, ordenacao, classificarSinal])

  // Métricas calculadas usando useMemo
  const metricas = useMemo(() => {
    const total = registros.length
    let excelente = 0
    let atencao = 0
    let critico = 0
    let somaRx = 0
    let countRxValidos = 0

    registros.forEach((reg) => {
      const rx = parseFloat(reg.rx || '')
      if (!isNaN(rx)) {
        somaRx += rx
        countRxValidos++
      }

      const classif = classificarSinal(reg.rx || '')
      if (classif.classe === 'excelente') excelente++
      else if (classif.classe === 'atencao') atencao++
      else if (classif.classe === 'critico') critico++
    })

    return {
      total,
      excelente,
      atencao,
      critico,
      mediaRx: countRxValidos > 0 ? (somaRx / countRxValidos).toFixed(2) + ' dBm' : 'N/A',
    }
  }, [registros, classificarSinal])

  if (loading) {
    return <LoadingOverlay message="Carregando dados de potências..." />
  }

  return (
    <div className="relatorios-page">
      <div className="relatorios-header flex-header">
        <div>
          <h1 className="relatorios-titulo"><BarChart3 size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} /> Relatórios de Potência</h1>
          <p className="relatorios-subtitulo">Análise em tempo real dos sinais coletados do SGP</p>
        </div>
        <button className="rel-btn-config" onClick={() => setExibirConfig(!exibirConfig)}>
          <Settings size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Configurar Limites
        </button>
      </div>

      {/* Formulário de Configuração de Limites */}
      {exibirConfig && (
        <form className="rel-config-panel" onSubmit={salvarLimites}>
          <h3 className="rel-config-title"><Settings size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Configurações de Limites de Sinal (dBm)</h3>
          <p className="rel-config-desc">Defina as faixas de classificação dos sinais de fibra da rede.</p>
          <div className="rel-config-grid">
            <div className="rel-config-group">
              <label htmlFor="rel-max-exc">Limite Sinal Máximo Excelente (Saturação)</label>
              <input id="rel-max-exc" name="relMaxExc" type="number" step="0.1" value={inputMaxExc} onChange={(e) => setInputMaxExc(e.target.value)} required />
              <span>Sinais maiores que este limite são marcados como Atenção (Forte). Ex: {inputMaxExc} dBm</span>
            </div>
            <div className="rel-config-group">
              <label htmlFor="rel-min-exc">Limite Sinal Mínimo Excelente</label>
              <input id="rel-min-exc" name="relMinExc" type="number" step="0.1" value={inputMinExc} onChange={(e) => setInputMinExc(e.target.value)} required />
              <span>Sinais entre Excelente Mínimo e Máximo são marcados como Excelente.</span>
            </div>
            <div className="rel-config-group">
              <label htmlFor="rel-min-at">Limite Sinal Mínimo Atenção / Início do Crítico</label>
              <input id="rel-min-at" name="relMinAt" type="number" step="0.1" value={inputMinAt} onChange={(e) => setInputMinAt(e.target.value)} required />
              <span>Sinais abaixo deste valor são classificados como Críticos.</span>
            </div>
          </div>
          <div className="rel-config-actions">
            <button type="submit" className="rel-btn-save" disabled={salvandoConfig}>
              {salvandoConfig ? 'Salvando...' : 'Salvar Configuração'}
            </button>
            <button type="button" className="rel-btn-cancel" onClick={() => setExibirConfig(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Cards de Métricas */}
      <div className="rel-metricas-grid">
        <div
          className="rel-metrica-card clickable"
          onClick={() => {
            setFiltroSinal('todos')
            setFiltroStatus('todos')
          }}
        >
          <span className="rel-metrica-icon">ONU</span>
          <div className="rel-metrica-info">
            <span className="rel-metrica-valor">{metricas.total}</span>
            <span className="rel-metrica-label">Total Coletado</span>
          </div>
        </div>

        <div className="rel-metrica-card excelente clickable" onClick={() => setFiltroSinal('excelente')}>
          <span className="rel-metrica-icon"><CheckCircle size={14} className="rel-icon-green" /></span>
          <div className="rel-metrica-info">
            <span className="rel-metrica-valor">{metricas.excelente}</span>
            <span className="rel-metrica-label">
              Excelente ({thresholds.minExcelente} a {thresholds.maxExcelente})
            </span>
          </div>
        </div>

        <div className="rel-metrica-card atencao clickable" onClick={() => setFiltroSinal('atencao')}>
          <span className="rel-metrica-icon"><AlertCircle size={14} className="rel-icon-yellow" /></span>
          <div className="rel-metrica-info">
            <span className="rel-metrica-valor">{metricas.atencao}</span>
            <span className="rel-metrica-label">
              Atenção (&lt; {thresholds.minExcelente} ou &gt; {thresholds.maxExcelente})
            </span>
          </div>
        </div>

        <div className="rel-metrica-card critico clickable" onClick={() => setFiltroSinal('critico')}>
          <span className="rel-metrica-icon"><XCircle size={14} className="rel-icon-red" /></span>
          <div className="rel-metrica-info">
            <span className="rel-metrica-valor">{metricas.critico}</span>
            <span className="rel-metrica-label">Crítico (&lt; {thresholds.minAtencao})</span>
          </div>
        </div>

        <div className="rel-metrica-card media">
          <span className="rel-metrica-icon"><Zap size={16} /></span>
          <div className="rel-metrica-info">
            <span className="rel-metrica-valor">{metricas.mediaRx}</span>
            <span className="rel-metrica-label">Média do Sinal RX</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="rel-filtros-bar">
        <input id="rel-busca" name="busca" type="text" placeholder="Buscar por OLT, Login, Bairro, PON..." value={busca} onChange={(e) => setBusca(e.target.value)} className="rel-busca-input" />
        <select id="rel-filtro-sinal" name="filtroSinal" value={filtroSinal} onChange={(e: any) => setFiltroSinal(e.target.value)} className="rel-select-filtro">
          <option value="todos">Todos os Sinais</option>
          <option value="excelente">Excelente</option>
          <option value="atencao">Atenção</option>
          <option value="critico">Crítico</option>
        </select>

        <select id="rel-filtro-status" name="filtroStatus" value={filtroStatus} onChange={(e: any) => setFiltroStatus(e.target.value)} className="rel-select-filtro">
          <option value="todos">Todos os Status</option>
          <option value="Não Verificado">Não Verificado</option>
          <option value="Em Andamento">Em Andamento</option>
          <option value="Feito">Feito</option>
          <option value="Ausente (Retorno)">Ausente (Retorno)</option>
        </select>

        {/* Checkboxes para exibir colunas adicionais */}
        <div className="rel-colunas-toggles">
          <label className="rel-toggle-label">
            <input id="rel-exibir-vlan" name="exibirVlan" type="checkbox" checked={exibirVlan} onChange={(e) => setExibirVlan(e.target.checked)} />
            VLAN
          </label>
          <label className="rel-toggle-label">
            <input id="rel-exibir-sinal-tx" name="exibirSinalTx" type="checkbox" checked={exibirSinalTx} onChange={(e) => setExibirSinalTx(e.target.checked)} />
            Sinal TX
          </label>
          <label className="rel-toggle-label">
            <input id="rel-exibir-rx-olt" name="exibirRxOlt" type="checkbox" checked={exibirRxOlt} onChange={(e) => setExibirRxOlt(e.target.checked)} />
            RX OLT
          </label>
          <label className="rel-toggle-label">
            <input id="rel-exibir-data-coleta" name="exibirDataColeta" type="checkbox" checked={exibirDataColeta} onChange={(e) => setExibirDataColeta(e.target.checked)} />
            Data Coleta
          </label>
        </div>

        <button
          className="rel-btn-limpar"
          onClick={() => {
            setBusca('')
            setFiltroSinal('todos')
            setFiltroStatus('todos')
            setOrdenacao(null)
            setExibirVlan(false)
            setExibirSinalTx(false)
            setExibirRxOlt(false)
            setExibirDataColeta(false)
          }}
        >
          <Trash2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Limpar
        </button>
      </div>

      {/* Tabela de Resultados */}
      <div className="rel-tabela-container">
        {registrosFiltrados.length === 0 ? (
          <div className="rel-tabela-vazia">Nenhum registro encontrado.</div>
        ) : (
          <table className="rel-tabela">
            <thead>
              <tr>
                <th onClick={() => handleSort('contrato')} className="sortable">
                  Contrato {ordenacao?.coluna === 'contrato' ? (ordenacao.direcao === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : ''}
                </th>
                <th>Login (PPPoE)</th>
                <th>OLT</th>
                <th>Slot</th>
                <th>PON</th>
                {exibirVlan && <th>VLAN</th>}
                <th onClick={() => handleSort('rx')} className="sortable">
                  Sinal RX {ordenacao?.coluna === 'rx' ? (ordenacao.direcao === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : ''}
                </th>
                {exibirSinalTx && <th>Sinal TX</th>}
                {exibirRxOlt && <th>RX OLT</th>}
                <th>Endereço</th>
                <th>Bairro</th>
                {exibirDataColeta && (
                  <th onClick={() => handleSort('dataColeta')} className="sortable">
                    Data Coleta {ordenacao?.coluna === 'dataColeta' ? (ordenacao.direcao === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : ''}
                  </th>
                )}
                <th onClick={() => handleSort('status')} className="sortable">
                  Status {ordenacao?.coluna === 'status' ? (ordenacao.direcao === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.slice(0, itensExibidos).map((reg) => {
                const classif = classificarSinal(reg.rx)
                const { slot, pon } = parsePon(reg.pon)
                const cleanContrato = reg.contrato ? reg.contrato.split(' - ')[0] || reg.contrato : '-'
                return (
                  <tr key={reg.id}>
                    <td>
                      <div className="rel-cliente-info font-mono">
                        {reg.serviceUrl ? (
                          <a href={reg.serviceUrl} target="_blank" rel="noopener noreferrer" className="rel-cliente-link">
                            <span className="rel-cliente-nome font-mono">{cleanContrato}</span>
                          </a>
                        ) : (
                          <span className="rel-cliente-nome font-mono">{cleanContrato}</span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono">{reg.login ? (reg.login.includes(' - ') ? reg.login.split(' - ')[1] : reg.login) : '-'}</td>
                    <td>{reg.olt}</td>
                    <td className="font-mono">{slot}</td>
                    <td className="font-mono">{pon}</td>
                    {exibirVlan && <td className="font-mono">{reg.vlan || '-'}</td>}
                    <td>
                      <span className={`rel-badge-sinal ${classif.classe}`}>
                        {reg.rx} {classif.label.startsWith('Excelente') ? <CheckCircle size={14} className="rel-icon-green" /> : classif.classe === 'atencao' ? <AlertCircle size={14} className="rel-icon-yellow" /> : <XCircle size={14} className="rel-icon-red" />}
                      </span>
                    </td>
                    {exibirSinalTx && <td className="font-mono">{reg.tx || '-'}</td>}
                    {exibirRxOlt && <td className="font-mono">{reg.rxOlt || '-'}</td>}
                    <td>{reg.endereco || '-'}</td>
                    <td>{reg.bairro || '-'}</td>
                    {exibirDataColeta && <td className="font-date">{formatarData(reg.dataColeta)}</td>}
                    <td>
                      <div className="rel-status-container">
                        <select
                          value={reg.status || 'Não Verificado'}
                          onChange={(e) => {
                            const newStatus = e.target.value
                            if (newStatus === 'Ausente (Retorno)') {
                              const dateStr = prompt('Agendar retorno de contato (Ex: Amanhã às 14h, ou 10/06):')
                              if (dateStr !== null) {
                                atualizarStatus(reg.id, newStatus, dateStr)
                              }
                            } else {
                              atualizarStatus(reg.id, newStatus)
                            }
                          }}
                          className={`rel-select-status ${reg.status === 'Feito' ? 'feito' : reg.status === 'Em Andamento' ? 'em-andamento' : reg.status === 'Ausente (Retorno)' ? 'ausente' : 'nao-verificado'}`}
                        >
                          <option value="Não Verificado">Não Verificado</option>
                          <option value="Em Andamento">Em Andamento</option>
                          <option value="Feito">Feito</option>
                          <option value="Ausente (Retorno)">Ausente (Retorno)</option>
                        </select>
                        {reg.status === 'Ausente (Retorno)' && reg.retornoData && (
                          <div className="rel-status-retorno" title={reg.retornoData}>
                            <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> {reg.retornoData}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {registrosFiltrados.length > itensExibidos && (
        <div className="rel-paginacao">
          <button className="rel-btn-loadmore" onClick={() => setItensExibidos((prev) => prev + 50)}>
            <RefreshCw size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Carregar Mais (+50)
          </button>
          <span className="rel-paginacao-info">
            Exibindo <strong>{Math.min(itensExibidos, registrosFiltrados.length)}</strong> de <strong>{registrosFiltrados.length}</strong> registros
          </span>
        </div>
      )}
    </div>
  )
}
