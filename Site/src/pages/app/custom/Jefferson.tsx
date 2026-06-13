import { useState, useEffect } from 'react'
import './Jefferson.css'

const FRASES_GOTICAS = [
  'No breu da noite, o Monster branco clareia a minha alma.',
  'Mais um chamado resolvido, mais um gole de trevas geladas.',
  'Góticas suaves não choram, elas tomam Monster sem açúcar.',
  'Dizem que o amor é cego, mas o meu Monster branco é perfeitamente visível.',
  'Nem toda alma sombria habita castelos; algumas estão no suporte atendendo clientes.',
  'Sob a luz do luar, a lata gelada brilha como prata na escuridão.',
  'Góticas e Monster: a única combinação estável neste universo caótico.',
  'A noite é longa, mas o Monster branco é infinito.',
  'Bebendo Monster branco e esperando a chuva ácida começar.',
  'Enquanto o mundo desmorona, meu ping continua baixo e meu Monster gelado.',
  'Minhas roupas são pretas, mas a lata do meu Monster é branca como o meu fantasma de estimação.',
  'Suporte de TI das trevas: reiniciamos sua ONU e invocamos demônios em portas lógicas.',
  'Alguns seguem a luz, eu sigo o roteador que está piscando em vermelho.',
  'Gótica rabugenta: especialista em fibra óptica e rituais de reativação de sinal.',
  'O delineador gatinho é afiado para cortar o estresse de atender 50 clientes por hora.',
  'Com coturno de plataforma eu fico mais alta que a pilha de switches queimados.',
  'Vestindo preto para lamentar os pacotes perdidos na rota de trânsito.',
  'Renda preta, unhas pintadas de preto e um ping estável na ponta da fibra.',
  'Gótica tradicional no TI: configura servidores ao som de Sisters of Mercy.',
  'A verdadeira força vem do metal industrial e da cafeína de um Monster gelado.',
]

const ARCHETYPES = [
  {
    title: '🦇 Gótica Tradicional (Bauhaus Goth)',
    desc: 'Escuta rock gótico dos anos 80, trabalha de sobretudo preto mesmo no calor de 35°C e resolve problemas de roteador recitando poemas de Edgar Allan Poe.',
  },
  {
    title: '⚡ Cyber Goth (Futurista do TI)',
    desc: 'Cabelos neon, roupas de vinil e máscaras de gás. Configura redes e subredes IP no ritmo de música eletrônica industrial e só responde chamados via CLI.',
  },
  {
    title: '🐈 Gótica Suave (Lana Del Goth)',
    desc: 'Usa delineado discreto de gatinho e roupas pretas leves. Ouve indie melancólico enquanto tranquiliza clientes furiosos com a internet lenta com uma calma paranormal.',
  },
]

interface CycleProfile {
  id: string
  name: string
  lastPeriod: string // YYYY-MM-DD
  cycleDays: number
}

export default function Jefferson() {
  const [contador, setContador] = useState(() => {
    return Number(localStorage.getItem('jefferson-monster-count') || 0)
  })
  const [frase, setFrase] = useState(FRASES_GOTICAS[0])
  const [bats, setBats] = useState<{ id: number; left: number; top: number; delay: number; duration: number }[]>([])

  // Calculadora Gótica
  const [calcItems, setCalcItems] = useState({
    vestePreto: false,
    coturno: false,
    monsterBranco: false,
    eyeliner: false,
    choker: false,
    arrastao: false,
    metalPlaylist: false,
    preTreinoSangue: false,
  })

  // Agendador de Ciclo Multi-Perfil
  const [profiles, setProfiles] = useState<CycleProfile[]>(() => {
    const saved = localStorage.getItem('jefferson-cycle-profiles')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
    // Default goth profiles with current relative dates to showcase functionality instantly
    const today = new Date()
    const p1Date = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000) // 13 days ago (Fertile window)
    const p2Date = new Date(today.getTime() - 22 * 24 * 60 * 60 * 1000) // 22 days ago (TPM window)

    return [
      {
        id: '1',
        name: 'Gótica do Suporte 🦇',
        lastPeriod: p1Date.toISOString().split('T')[0],
        cycleDays: 28,
      },
      {
        id: '2',
        name: 'Ruiva do Monster 🥤',
        lastPeriod: p2Date.toISOString().split('T')[0],
        cycleDays: 30,
      },
    ]
  })

  // Form states for adding profile
  const [newName, setNewName] = useState('')
  const [newLastPeriod, setNewLastPeriod] = useState('')
  const [newCycleDays, setNewCycleDays] = useState(28)

  useEffect(() => {
    localStorage.setItem('jefferson-monster-count', contador.toString())
  }, [contador])

  useEffect(() => {
    localStorage.setItem('jefferson-cycle-profiles', JSON.stringify(profiles))
  }, [profiles])

  // Inicializa morcegos com posições aleatórias
  useEffect(() => {
    const newBats = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: Math.random() * 90 + 5, // 5% a 95%
      top: Math.random() * 80 + 10,
      delay: Math.random() * 5,
      duration: 6 + Math.random() * 6, // 6s a 12s
    }))
    setBats(newBats)
  }, [])

  const gerarNovaFrase = () => {
    const disponiveis = FRASES_GOTICAS.filter((f) => f !== frase)
    const aleatoria = disponiveis[Math.floor(Math.random() * disponiveis.length)]
    setFrase(aleatoria)
  }

  const toggleCalcItem = (key: keyof typeof calcItems) => {
    setCalcItems((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Cálculo da pontuação gótica
  const activeCount = Object.values(calcItems).filter(Boolean).length
  const scorePercent = Math.round((activeCount * 100) / 8)

  const getScoreMessage = (score: number) => {
    if (score === 0) return '🕯️ Sem essência das trevas. Coloque uma música triste!'
    if (score < 40) return '🔮 Iniciante das sombras. Delineador básico em progresso.'
    if (score < 80) return '🖤 Gótica Suave confirmada. O Monster branco já faz efeito.'
    return '🦇 GÓTICA SUPREMA DAS TREVAS! Jefferson aprova 100%.'
  }

  // Lógica Avançada do Ciclo Menstrual
  const getAdjustedLastPeriod = (lastPeriod: string, cycleDays: number) => {
    if (!lastPeriod) return null
    const originalStart = new Date(lastPeriod + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffTime = today.getTime() - originalStart.getTime()
    if (diffTime < 0) {
      return originalStart
    }
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const completedCycles = Math.floor(diffDays / cycleDays)

    const currentStart = new Date(originalStart.getTime())
    currentStart.setDate(currentStart.getDate() + completedCycles * cycleDays)
    return currentStart
  }

  const formatDateShort = (d: Date) => {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const getNextPeriodDate = (lastPeriod: string, cycleDays: number) => {
    const adjustedStart = getAdjustedLastPeriod(lastPeriod, cycleDays)
    if (!adjustedStart) return null
    const nextDate = new Date(adjustedStart.getTime())
    nextDate.setDate(nextDate.getDate() + cycleDays)
    return nextDate
  }

  const getDaysRemaining = (lastPeriod: string, cycleDays: number) => {
    const nextDate = getNextPeriodDate(lastPeriod, cycleDays)
    if (!nextDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffTime = nextDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getFertileRange = (lastPeriod: string, cycleDays: number) => {
    const adjustedStart = getAdjustedLastPeriod(lastPeriod, cycleDays)
    if (!adjustedStart) return null
    const start = new Date(adjustedStart.getTime())
    start.setDate(start.getDate() + cycleDays - 17)
    const end = new Date(adjustedStart.getTime())
    end.setDate(end.getDate() + cycleDays - 12)
    return { start, end }
  }

  const getTpmRange = (lastPeriod: string, cycleDays: number) => {
    const adjustedStart = getAdjustedLastPeriod(lastPeriod, cycleDays)
    if (!adjustedStart) return null
    const start = new Date(adjustedStart.getTime())
    start.setDate(start.getDate() + cycleDays - 7)
    const end = new Date(adjustedStart.getTime())
    end.setDate(end.getDate() + cycleDays - 1)
    return { start, end }
  }

  const getProfileStatus = (lastPeriod: string, cycleDays: number) => {
    const adjustedStart = getAdjustedLastPeriod(lastPeriod, cycleDays)
    if (!adjustedStart) return { name: 'Normal', class: 'normal', badge: '🌱 Normal' }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTime = today.getTime()

    const start = new Date(adjustedStart.getTime())
    const endMenstrual = new Date(adjustedStart.getTime())
    endMenstrual.setDate(endMenstrual.getDate() + 4)

    const fertile = getFertileRange(lastPeriod, cycleDays)
    const tpm = getTpmRange(lastPeriod, cycleDays)

    if (todayTime >= start.getTime() && todayTime <= endMenstrual.getTime()) {
      return { name: 'Menstruação', class: 'menstrual', badge: '🩸 Menstruação' }
    }

    if (fertile && todayTime >= fertile.start.getTime() && todayTime <= fertile.end.getTime()) {
      return { name: 'Período Fértil', class: 'fertile', badge: '⚠️ Período Fértil' }
    }

    if (tpm && todayTime >= tpm.start.getTime() && todayTime <= tpm.end.getTime()) {
      return { name: 'TPM', class: 'tpm', badge: '🍷 Período TPM' }
    }

    return { name: 'Normal', class: 'normal', badge: '🌱 Normal' }
  }

  const addProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newLastPeriod) return

    const newProfile: CycleProfile = {
      id: Math.random().toString(36).substring(2, 9),
      name: newName.trim(),
      lastPeriod: newLastPeriod,
      cycleDays: Number(newCycleDays) || 28,
    }

    setProfiles((prev) => [...prev, newProfile])
    setNewName('')
    setNewLastPeriod('')
    setNewCycleDays(28)
  }

  const deleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="jefferson-page">
      {/* Morcegos de fundo */}
      {bats.map((bat) => (
        <div
          key={bat.id}
          className="jeff-bat"
          style={{
            left: `${bat.left}%`,
            top: `${bat.top}%`,
            animationDelay: `${bat.delay}s`,
            animationDuration: `${bat.duration}s`,
          }}
        >
          🦇
        </div>
      ))}
      <div className="jeff-header">
        <h1 className="jeff-title">🦇 Área Secreta do Jefferson</h1>
        <p className="jeff-subtitle">Goticas & Monster Branco: O Templo Supremo</p>
      </div>

      <div className="jeff-grid">
        {/* Card de Imagem (Gotica Ruiva!) */}
        <div className="jeff-card img-card">
          <div className="jeff-img-wrapper">
            <img src="/ati/gotica_ruiva_monster.png" alt="Gótica Ruiva com Monster" className="jeff-main-img" />
          </div>
          <span className="jeff-img-caption">Arte Oficial Jefferson Mode v2.0</span>
        </div>

        {/* Card Interativo */}
        <div className="jeff-card ctrl-card">
          <div className="jeff-section">
            <h2 className="jeff-card-title">🥤 Contador de Monster (Sem Açúcar)</h2>
            <p className="jeff-desc">Acompanhe a sua cota diária de energia das trevas:</p>
            <div className="jeff-counter-wrap">
              <button className="counter-btn minus" onClick={() => setContador((prev) => Math.max(0, prev - 1))}>
                -
              </button>
              <span className="counter-val">{contador}</span>
              <button className="counter-btn plus" onClick={() => setContador((prev) => prev + 1)}>
                +
              </button>
            </div>
            <span className="counter-msg">{contador === 0 ? '⚠️ Nível de energia crítico. Compre um Monster!' : contador <= 2 ? '🟢 Energia sob controle.' : contador <= 4 ? '🟡 Cuidado com a taquicardia!' : '🔴 Modo Deus das Trevas ativado.'}</span>
          </div>

          <div className="jeff-divider" />

          <div className="jeff-section">
            <h2 className="jeff-card-title">🕯️ Sabedoria Obscura</h2>
            <div className="jeff-quote-box">
              <p className="jeff-quote">"{frase}"</p>
            </div>
            <button className="jeff-btn-gerar" onClick={gerarNovaFrase}>
              ⚡ Invocar Nova Frase
            </button>
          </div>
        </div>

        {/* Card Calculadora Gótica */}
        <div className="jeff-card">
          <h2 className="jeff-card-title">🐈 Calculadora de Afinidade Gótica</h2>
          <p className="jeff-desc" style={{ marginBottom: '1rem' }}>
            Selecione os itens presentes na sua rotina:
          </p>

          <div className="goth-calc-section">
            <div className="goth-calc-checkboxes">
              <label className="goth-checkbox-label">
                <input type="checkbox" checked={calcItems.vestePreto} onChange={() => toggleCalcItem('vestePreto')} />
                <span>Veste roupas pretas</span>
              </label>
              <label className="goth-checkbox-label">
                <input type="checkbox" checked={calcItems.coturno} onChange={() => toggleCalcItem('coturno')} />
                <span>Usa coturno pesado</span>
              </label>
              <label className="goth-checkbox-label">
                <input type="checkbox" checked={calcItems.monsterBranco} onChange={() => toggleCalcItem('monsterBranco')} />
                <span>Bebe Monster Branco</span>
              </label>
              <label className="goth-checkbox-label">
                <input type="checkbox" checked={calcItems.eyeliner} onChange={() => toggleCalcItem('eyeliner')} />
                <span>Delineador gatinho</span>
              </label>
              <label className="goth-checkbox-label">
                <input type="checkbox" checked={calcItems.choker} onChange={() => toggleCalcItem('choker')} />
                <span>Usa gargantilha/choker</span>
              </label>
              <label className="goth-checkbox-label">
                <input type="checkbox" checked={calcItems.arrastao} onChange={() => toggleCalcItem('arrastao')} />
                <span>Usa meia-calça arrastão</span>
              </label>
              <label className="goth-checkbox-label" style={{ gridColumn: 'span 2' }}>
                <input type="checkbox" checked={calcItems.metalPlaylist} onChange={() => toggleCalcItem('metalPlaylist')} />
                <span>Playlist de Metal/Goth Rock ativa</span>
              </label>
              <label className="goth-checkbox-label" style={{ gridColumn: 'span 2' }}>
                <input type="checkbox" checked={calcItems.preTreinoSangue} onChange={() => toggleCalcItem('preTreinoSangue')} />
                <span>Toma pré-treino sabor Sangue de Gótica (3x mais potente, 6 meses grátis!)</span>
              </label>
            </div>

            <div className="goth-result-box">
              <div className="goth-score">{scorePercent}% Gótica</div>
              <div className="goth-desc">{getScoreMessage(scorePercent)}</div>
            </div>
          </div>
        </div>

        {/* Card Agendador de Ciclo Menstrual (Novo!) */}
        <div className="jeff-card">
          <h2 className="jeff-card-title">🩸 Monitorador de Ciclos das Trevas</h2>
          <p className="jeff-desc" style={{ marginBottom: '1rem' }}>
            Saiba quando o humor gótico vai atingir o limite crítico e quando tomar cuidado:
          </p>

          {/* Form para adicionar gotica */}
          <form onSubmit={addProfile} className="jeff-cycle-form">
            <div className="jeff-form-row">
              <div className="jeff-form-group">
                <label className="jeff-form-label">Nome:</label>
                <input type="text" placeholder="Nome da Gótica..." value={newName} onChange={(e) => setNewName(e.target.value)} className="jeff-form-input" required />
              </div>
              <div className="jeff-form-group">
                <label className="jeff-form-label">Última Menstruação:</label>
                <input type="date" value={newLastPeriod} onChange={(e) => setNewLastPeriod(e.target.value)} className="jeff-form-input" required />
              </div>
              <div className="jeff-form-group small">
                <label className="jeff-form-label">Ciclo (Dias):</label>
                <input type="number" min={20} max={45} value={newCycleDays} onChange={(e) => setNewCycleDays(Number(e.target.value) || 28)} className="jeff-form-input" required />
              </div>
              <button type="submit" className="jeff-btn-add">
                ➕ Adicionar
              </button>
            </div>
          </form>

          {/* Lista de perfis */}
          <div className="jeff-profiles-list">
            {profiles.length > 0 ? (
              profiles.map((profile) => {
                const nextDate = getNextPeriodDate(profile.lastPeriod, profile.cycleDays)
                const remaining = getDaysRemaining(profile.lastPeriod, profile.cycleDays)
                const status = getProfileStatus(profile.lastPeriod, profile.cycleDays)
                const fertile = getFertileRange(profile.lastPeriod, profile.cycleDays)
                const tpm = getTpmRange(profile.lastPeriod, profile.cycleDays)

                // Classes de contagem
                let countdownClass = 'safe'
                if (remaining !== null) {
                  if (remaining <= 3 || status.class === 'menstrual') {
                    countdownClass = 'critical'
                  } else if (status.class === 'tpm' || status.class === 'fertile') {
                    countdownClass = 'warning'
                  }
                }

                return (
                  <div key={profile.id} className="jeff-profile-item">
                    <div className="jeff-profile-left">
                      <div className="jeff-profile-header">
                        <span className="jeff-profile-name">{profile.name}</span>
                        <span className={`jeff-profile-badge ${status.class}`}>{status.badge}</span>
                      </div>
                      <div className="jeff-profile-dates">
                        <span className="jeff-date-label">
                          Próxima: <strong>{nextDate?.toLocaleDateString('pt-BR')}</strong>
                        </span>
                        {fertile && (
                          <span className="jeff-date-label">
                            Fértil:{' '}
                            <strong>
                              {formatDateShort(fertile.start)} a {formatDateShort(fertile.end)}
                            </strong>
                          </span>
                        )}
                        {tpm && (
                          <span className="jeff-date-label">
                            TPM:{' '}
                            <strong>
                              {formatDateShort(tpm.start)} a {formatDateShort(tpm.end)}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="jeff-profile-right">
                      <div className={`jeff-countdown ${countdownClass}`}>{remaining !== null && (remaining > 0 ? `Faltam ${remaining} d` : remaining === 0 ? 'É HOJE! 🩸' : `Atrasada ${Math.abs(remaining)} d`)}</div>
                      <button className="jeff-btn-delete" onClick={() => deleteProfile(profile.id)} title="Remover Gótica" type="button">
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="jeff-empty-state">Nenhuma gótica sendo monitorada. Adicione uma no formulário acima.</div>
            )}
          </div>
        </div>

        {/* Card Pré-Treino (Sempre Visível) */}
        <div className="jeff-card img-card">
          <h2 className="jeff-card-title">🧪 Suplementação das Trevas</h2>
          <div className="jeff-img-wrapper" style={{ maxHeight: '250px' }}>
            <img src="/ati/sangue_gotica.png" alt="Pré-treino Sangue de Gótica" className="jeff-main-img" style={{ objectFit: 'contain', height: '100%', width: 'auto' }} />
          </div>
          <span className="jeff-img-caption" style={{ fontWeight: 'bold', color: '#c084fc' }}>
            Pré-Treino Sangue de Gótica (3x Mais Potente)
          </span>
          <p className="jeff-desc" style={{ fontSize: '0.78rem', textAlign: 'center', marginTop: '4px' }}>
            6 Meses de pré-treino grátis! Comprovadamente eficaz para aguentar o plantão de suporte sem corromper sua alma.
          </p>
        </div>

        {/* Card Guia das Góticas do Suporte (Novo!) */}
        <div className="jeff-card goth-archetypes-card">
          <h2 className="jeff-card-title">🖤 Arquétipos de Góticas no Suporte de TI</h2>
          <p className="jeff-desc">Tipos comuns de entidades góticas encontradas na escala 6x1:</p>

          <div className="goth-types-grid">
            {ARCHETYPES.map((arch) => (
              <div key={arch.title} className="goth-type-item">
                <div className="goth-type-title">{arch.title}</div>
                <div className="goth-type-desc">{arch.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
