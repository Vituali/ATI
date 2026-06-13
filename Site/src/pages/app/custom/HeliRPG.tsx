import { useState, useEffect } from 'react'
import './HeliRPG.css'

interface RollEntry {
  id: string
  time: string
  title: string
  formula: string
  details: string
  result: number
}

const RITUAIS = [
  {
    name: 'Decadência do Link',
    element: 'morte',
    desc: 'Acelera a queda de conexão. Rola 2d8+2 de estresse ao tentar explicar que a ONU está fora da tomada.',
    roll: () => rollDice(2, 8, 2, 'Decadência do Link (Estresse)'),
  },
  {
    name: 'Cura Pós-Cliente Boss',
    element: 'morte',
    desc: 'Regeneração mental e de paciência após aturar cliente histérico corporativo. Cura 2d8+2 de PV.',
    roll: () => rollDice(2, 8, 2, 'Cura Pós-Cliente Boss (PV)'),
  },
  {
    name: 'Chamas no CPD',
    element: 'energia',
    desc: 'O switch principal começa a derreter devido ao calor e falta de ar. Rola 2d6 de pânico.',
    roll: () => rollDice(2, 6, 0, 'Chamas no CPD (Pânico)'),
  },
  {
    name: 'Ódio ao SGP',
    element: 'sangue',
    desc: 'Ferve o sangue ao ver o SGP lento no meio do pico. Rola +1d20 de fúria no atendimento.',
    roll: () => rollDice(1, 20, 0, 'Ódio ao SGP (Fúria)'),
  },
  {
    name: 'Terceiro Olho de Fibra',
    element: 'conhecimento',
    desc: 'Enxerga pacotes perdidos na fibra e problemas invisíveis de rede. Rola +2d20 de Investigação Técnica.',
    roll: () => rollDice(2, 20, 0, 'Terceiro Olho (Percepção)'),
  },
]

// Funções auxiliares de rolagem global para os rituais
let addHistoryGlobal: (entry: RollEntry) => void = () => {}

function rollDice(qtd: number, faces: number, mod: number, name: string): number {
  const rolls: number[] = []
  for (let i = 0; i < qtd; i++) {
    rolls.push(Math.floor(Math.random() * faces) + 1)
  }
  const soma = rolls.reduce((a, b) => a + b, 0)
  const total = soma + mod

  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

  const entry: RollEntry = {
    id: Math.random().toString(36).substring(2, 9),
    time: timeStr,
    title: name,
    formula: `${qtd}d${faces}${mod > 0 ? `+${mod}` : mod < 0 ? mod : ''}`,
    details: `Rolagens: [${rolls.join(', ')}]${mod !== 0 ? ` | Modificador: ${mod > 0 ? `+${mod}` : mod}` : ''}`,
    result: total,
  }

  addHistoryGlobal(entry)
  return total
}

export default function HeliRPG() {
  // Atributos
  const [forca, setForca] = useState(() => Number(localStorage.getItem('rpg-for') || 1))
  const [agilidade, setAgilidade] = useState(() => Number(localStorage.getItem('rpg-agi') || 2))
  const [intelecto, setIntelecto] = useState(() => Number(localStorage.getItem('rpg-int') || 2))
  const [vigor, setVigor] = useState(() => Number(localStorage.getItem('rpg-vig') || 1))
  const [presenca, setPresenca] = useState(() => Number(localStorage.getItem('rpg-pre') || 2))

  // Status (PV, SAN, PE)
  const [pvMax, setPvMax] = useState(() => Number(localStorage.getItem('rpg-pv-max') || 20))
  const [pvAtual, setPvAtual] = useState(() => Number(localStorage.getItem('rpg-pv-atual') || 20))
  const [sanMax, setSanMax] = useState(() => Number(localStorage.getItem('rpg-san-max') || 30))
  const [sanAtual, setSanAtual] = useState(() => Number(localStorage.getItem('rpg-san-atual') || 30))
  const [peMax, setPeMax] = useState(() => Number(localStorage.getItem('rpg-pe-max') || 10))
  const [peAtual, setPeAtual] = useState(() => Number(localStorage.getItem('rpg-pe-atual') || 10))

  // NEX e Patente
  const [nex, setNex] = useState(() => Number(localStorage.getItem('rpg-nex') || 5))

  // Histórico
  const [historico, setHistorico] = useState<RollEntry[]>(() => {
    try {
      const saved = localStorage.getItem('rpg-rolls-history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Quantidade de dados genéricos
  const [genericQty, setGenericQty] = useState(1)

  // Sincronizações com localStorage
  useEffect(() => {
    localStorage.setItem('rpg-for', forca.toString())
    localStorage.setItem('rpg-agi', agilidade.toString())
    localStorage.setItem('rpg-int', intelecto.toString())
    localStorage.setItem('rpg-vig', vigor.toString())
    localStorage.setItem('rpg-pre', presenca.toString())
  }, [forca, agilidade, intelecto, vigor, presenca])

  useEffect(() => {
    localStorage.setItem('rpg-pv-max', pvMax.toString())
    localStorage.setItem('rpg-pv-atual', pvAtual.toString())
    localStorage.setItem('rpg-san-max', sanMax.toString())
    localStorage.setItem('rpg-san-atual', sanAtual.toString())
    localStorage.setItem('rpg-pe-max', peMax.toString())
    localStorage.setItem('rpg-pe-atual', peAtual.toString())
  }, [pvMax, pvAtual, sanMax, sanAtual, peMax, peAtual])

  useEffect(() => {
    localStorage.setItem('rpg-nex', nex.toString())
  }, [nex])

  useEffect(() => {
    localStorage.setItem('rpg-rolls-history', JSON.stringify(historico))
  }, [historico])

  const addHistory = (entry: RollEntry) => {
    setHistorico((prev) => [entry, ...prev].slice(0, 50)) // Mantém as 50 últimas
  }

  // Vincula a função global ao estado local
  useEffect(() => {
    addHistoryGlobal = addHistory
  }, [])

  // Patente com base no NEX
  const getPatent = (val: number) => {
    if (val < 20) return 'Recruta'
    if (val < 40) return 'Operador'
    if (val < 65) return 'Agente Especial'
    if (val < 85) return 'Oficial'
    return 'Agente de Elite'
  }

  // Mecânica de Rolagem de Atributo (Ordem Paranormal)
  const rollAttribute = (nome: string, valor: number) => {
    const rolls: number[] = []
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`

    let resultadoFinal = 0
    let details = ''
    let formula = ''

    if (valor <= 0) {
      // Atributo 0: rola 2d20 e pega o PIOR resultado
      const d1 = Math.floor(Math.random() * 20) + 1
      const d2 = Math.floor(Math.random() * 20) + 1
      resultadoFinal = Math.min(d1, d2)
      formula = '2d20 (Desvantagem - Atributo 0)'
      details = `Rolagens: [${d1}, ${d2}] | Pegou o MENOR`
    } else {
      // Atributo > 0: rola Nd20 e pega o MELHOR resultado
      for (let i = 0; i < valor; i++) {
        rolls.push(Math.floor(Math.random() * 20) + 1)
      }
      resultadoFinal = Math.max(...rolls)
      formula = `${valor}d20 (Atributo)`
      details = `Rolagens: [${rolls.join(', ')}] | Pegou o MAIOR`
    }

    const entry: RollEntry = {
      id: Math.random().toString(36).substring(2, 9),
      time: timeStr,
      title: `Teste de ${nome}`,
      formula,
      details,
      result: resultadoFinal,
    }

    addHistory(entry)
  }

  // Rolagem de Dado Genérico
  const rollGeneric = (faces: number) => {
    const qty = Math.max(1, Math.min(20, genericQty))
    rollDice(qty, faces, 0, `Dado d${faces}`)
  }

  return (
    <div className="heli-rpg-page">
      <div className="heli-header">
        <h1 className="heli-title">🔮 Iniciação Paranormal do Heli</h1>
        <p className="heli-subtitle">Ordo Realitas — Setor de Contenção de Cancelamentos</p>
      </div>

      <div className="heli-grid">
        {/* Painel Esquerdo: Ficha e Dados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card de Atributos */}
          <div className="heli-card">
            <h2 className="heli-card-title">☠️ Atributos do Agente</h2>
            <div className="attributes-grid">
              <div className="attribute-box" onClick={() => rollAttribute('Força', forca)}>
                <span className="attr-name">FOR</span>
                <div className="attr-val">{forca}</div>
                <div className="attr-controls" onClick={(e) => e.stopPropagation()}>
                  <button className="attr-btn" onClick={() => setForca((prev) => Math.max(0, prev - 1))}>
                    -
                  </button>
                  <button className="attr-btn" onClick={() => setForca((prev) => Math.min(5, prev + 1))}>
                    +
                  </button>
                </div>
              </div>

              <div className="attribute-box" onClick={() => rollAttribute('Agilidade', agilidade)}>
                <span className="attr-name">AGI</span>
                <div className="attr-val">{agilidade}</div>
                <div className="attr-controls" onClick={(e) => e.stopPropagation()}>
                  <button className="attr-btn" onClick={() => setAgilidade((prev) => Math.max(0, prev - 1))}>
                    -
                  </button>
                  <button className="attr-btn" onClick={() => setAgilidade((prev) => Math.min(5, prev + 1))}>
                    +
                  </button>
                </div>
              </div>

              <div className="attribute-box" onClick={() => rollAttribute('Intelecto', intelecto)}>
                <span className="attr-name">INT</span>
                <div className="attr-val">{intelecto}</div>
                <div className="attr-controls" onClick={(e) => e.stopPropagation()}>
                  <button className="attr-btn" onClick={() => setIntelecto((prev) => Math.max(0, prev - 1))}>
                    -
                  </button>
                  <button className="attr-btn" onClick={() => setIntelecto((prev) => Math.min(5, prev + 1))}>
                    +
                  </button>
                </div>
              </div>

              <div className="attribute-box" onClick={() => rollAttribute('Vigor', vigor)}>
                <span className="attr-name">VIG</span>
                <div className="attr-val">{vigor}</div>
                <div className="attr-controls" onClick={(e) => e.stopPropagation()}>
                  <button className="attr-btn" onClick={() => setVigor((prev) => Math.max(0, prev - 1))}>
                    -
                  </button>
                  <button className="attr-btn" onClick={() => setVigor((prev) => Math.min(5, prev + 1))}>
                    +
                  </button>
                </div>
              </div>

              <div className="attribute-box" onClick={() => rollAttribute('Presença', presenca)}>
                <span className="attr-name">PRE</span>
                <div className="attr-val">{presenca}</div>
                <div className="attr-controls" onClick={(e) => e.stopPropagation()}>
                  <button className="attr-btn" onClick={() => setPresenca((prev) => Math.max(0, prev - 1))}>
                    -
                  </button>
                  <button className="attr-btn" onClick={() => setPresenca((prev) => Math.min(5, prev + 1))}>
                    +
                  </button>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#888', margin: 0, textAlign: 'center' }}>💡 Clique no atributo para rolar os dados (Nd20) e pegar o maior!</p>
          </div>

          {/* Rolador Genérico */}
          <div className="heli-card">
            <h2 className="heli-card-title">🎲 Rolador de Dados Avulsos</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#aaa' }}>Quantidade:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={genericQty}
                onChange={(e) => setGenericQty(parseInt(e.target.value) || 1)}
                style={{
                  background: '#222',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: '#fff',
                  width: '60px',
                  padding: '4px 8px',
                  textAlign: 'center',
                }}
              />
            </div>
            <div className="dice-buttons">
              <button className="dice-btn" onClick={() => rollGeneric(4)}>
                d4
              </button>
              <button className="dice-btn" onClick={() => rollGeneric(6)}>
                d6
              </button>
              <button className="dice-btn" onClick={() => rollGeneric(8)}>
                d8
              </button>
              <button className="dice-btn" onClick={() => rollGeneric(10)}>
                d10
              </button>
              <button className="dice-btn" onClick={() => rollGeneric(12)}>
                d12
              </button>
              <button className="dice-btn" onClick={() => rollGeneric(20)}>
                d20
              </button>
              <button className="dice-btn" onClick={() => rollGeneric(100)}>
                d100
              </button>
            </div>
          </div>

          {/* Card de Rituais */}
          <div className="heli-card">
            <h2 className="heli-card-title">🩸 Rituais do Outro Lado</h2>
            <div className="rituals-list">
              {RITUAIS.map((ritual) => (
                <div key={ritual.name} className={`ritual-item ${ritual.element}`} onClick={ritual.roll}>
                  <div className="ritual-header-row">
                    <span className="ritual-name">{ritual.name}</span>
                    <span className={`ritual-element-badge ${ritual.element}`}>{ritual.element}</span>
                  </div>
                  <span className="ritual-desc">{ritual.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Painel Direito: Status e Histórico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card de Ficha e Status */}
          <div className="heli-card">
            <h2 className="heli-card-title">🛡️ Status do Investigador</h2>

            <div className="agent-status-section">
              {/* PV */}
              <div className="status-bar-group">
                <div className="status-bar-header">
                  <span style={{ color: '#ff2a2a' }}>Pontos de Vida (PV)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>
                      {pvAtual}/{pvMax}
                    </span>
                    <button className="attr-btn" style={{ width: '16px', height: '16px', fontSize: '0.6rem' }} onClick={() => setPvMax((prev) => Math.max(1, prev - 1))}>
                      -
                    </button>
                    <button className="attr-btn" style={{ width: '16px', height: '16px', fontSize: '0.6rem' }} onClick={() => setPvMax((prev) => prev + 1)}>
                      +
                    </button>
                  </div>
                </div>
                <div className="status-bar-bg">
                  <div className="status-bar-fill pv" style={{ width: `${(pvAtual / pvMax) * 100}%` }} />
                </div>
                <div className="status-adjust-row">
                  <button className="adjust-btn" onClick={() => setPvAtual((p) => Math.max(0, p - 1))}>
                    -1 PV
                  </button>
                  <button className="adjust-btn" onClick={() => setPvAtual((p) => Math.max(0, p - 5))}>
                    -5 PV
                  </button>
                  <button className="adjust-btn" onClick={() => setPvAtual((p) => Math.min(pvMax, p + 1))}>
                    +1 PV
                  </button>
                  <button className="adjust-btn" onClick={() => setPvAtual((p) => Math.min(pvMax, p + 5))}>
                    +5 PV
                  </button>
                </div>
              </div>

              {/* Sanidade */}
              <div className="status-bar-group">
                <div className="status-bar-header">
                  <span style={{ color: '#3b82f6' }}>Sanidade (SAN)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>
                      {sanAtual}/{sanMax}
                    </span>
                    <button className="attr-btn" style={{ width: '16px', height: '16px', fontSize: '0.6rem' }} onClick={() => setSanMax((prev) => Math.max(1, prev - 1))}>
                      -
                    </button>
                    <button className="attr-btn" style={{ width: '16px', height: '16px', fontSize: '0.6rem' }} onClick={() => setSanMax((prev) => prev + 1)}>
                      +
                    </button>
                  </div>
                </div>
                <div className="status-bar-bg">
                  <div className="status-bar-fill san" style={{ width: `${(sanAtual / sanMax) * 100}%` }} />
                </div>
                <div className="status-adjust-row">
                  <button className="adjust-btn" onClick={() => setSanAtual((s) => Math.max(0, s - 1))}>
                    -1 SAN
                  </button>
                  <button className="adjust-btn" onClick={() => setSanAtual((s) => Math.max(0, s - 5))}>
                    -5 SAN
                  </button>
                  <button className="adjust-btn" onClick={() => setSanAtual((s) => Math.min(sanMax, s + 1))}>
                    +1 SAN
                  </button>
                  <button className="adjust-btn" onClick={() => setSanAtual((s) => Math.min(sanMax, s + 5))}>
                    +5 SAN
                  </button>
                </div>
              </div>

              {/* PE */}
              <div className="status-bar-group">
                <div className="status-bar-header">
                  <span style={{ color: '#eab308' }}>Pontos de Esforço (PE)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>
                      {peAtual}/{peMax}
                    </span>
                    <button className="attr-btn" style={{ width: '16px', height: '16px', fontSize: '0.6rem' }} onClick={() => setPeMax((prev) => Math.max(1, prev - 1))}>
                      -
                    </button>
                    <button className="attr-btn" style={{ width: '16px', height: '16px', fontSize: '0.6rem' }} onClick={() => setPeMax((prev) => prev + 1)}>
                      +
                    </button>
                  </div>
                </div>
                <div className="status-bar-bg">
                  <div className="status-bar-fill pe" style={{ width: `${(peAtual / peMax) * 100}%` }} />
                </div>
                <div className="status-adjust-row">
                  <button className="adjust-btn" onClick={() => setPeAtual((e) => Math.max(0, e - 1))}>
                    -1 PE
                  </button>
                  <button className="adjust-btn" onClick={() => setPeAtual((e) => Math.min(peMax, e + 1))}>
                    +1 PE
                  </button>
                </div>
              </div>
            </div>

            {/* NEX Control */}
            <div className="nex-control-row">
              <div className="nex-label-group">
                <span className="nex-title">Patente da Ordem</span>
                <span className="patent-val">{getPatent(nex)}</span>
              </div>
              <div className="nex-input-wrap">
                <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>NEX</span>
                <button className="nex-btn" onClick={() => setNex((prev) => Math.max(0, prev - 5))}>
                  -
                </button>
                <span className="nex-val">{nex}%</span>
                <button className="nex-btn" onClick={() => setNex((prev) => Math.min(99, prev + 5))}>
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Histórico de Rolagens */}
          <div className="heli-card roll-history-card">
            <h2 className="heli-card-title">📜 Registro do Outro Lado</h2>
            <div className="roll-history-container">
              {historico.length === 0 ? (
                <div className="roll-history-empty">Nenhuma manifestação paranormal registrada... Rola os dados!</div>
              ) : (
                historico.map((entry) => (
                  <div key={entry.id} className="roll-entry">
                    <span className="roll-entry-time">{entry.time}</span>
                    <span className="roll-entry-title">{entry.title}</span>
                    <span className="roll-entry-formula">{entry.formula}</span>
                    <span className="roll-entry-details">{entry.details}</span>
                    <div className="roll-entry-result">{entry.result}</div>
                  </div>
                ))
              )}
            </div>
            {historico.length > 0 && (
              <div className="roll-history-actions">
                <button className="clear-history-btn" onClick={() => setHistorico([])}>
                  Limpar Histórico
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
