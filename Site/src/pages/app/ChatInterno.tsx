// pages/ChatInterno.tsx
// ---------------------------------------------------------------
// Chat interno com salas por setor.
// Usa Firebase Realtime Database: /chat/salas/{room}/mensagens
// ---------------------------------------------------------------

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ref, push, onValue, query, orderByChild, limitToLast, set } from 'firebase/database'
import { db } from '../../services/firebase'
import { useUser } from '../../hooks/useUser'
import { getSetorLabel, type Setor } from '../../services/permissions'
import { useNotification } from '../../hooks/useNotification'
import { Globe, Wrench, DollarSign, Headphones, Handshake, MessageSquare, Trash2, ArrowRight } from 'lucide-react'
import './ChatInterno.css'

interface Mensagem {
  id: string
  autor: string
  nomeCompleto: string
  setor: string // Setor do autor (badge)
  room?: string // Sala de destino (novo)
  texto: string
  timestamp: number
  avatarUrl?: string
}

const ROOM_ICONS: Record<string, React.ReactNode> = {
  geral: <Globe size={18} strokeWidth={2} />,
  ti: <Wrench size={18} strokeWidth={2} />,
  financeiro: <DollarSign size={18} strokeWidth={2} />,
  suporte: <Headphones size={18} strokeWidth={2} />,
  comercial: <Handshake size={18} strokeWidth={2} />,
}

function formatarHorario(ts: number): string {
  const d = new Date(ts)
  const horas = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  const hoje = new Date()
  if (d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()) {
    return `${horas}:${min}`
  }
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${horas}:${min}`
}

interface ChatProps {
  unreadRooms?: Setor[]
}

export default function ChatInterno({ unreadRooms = [] }: ChatProps) {
  const { user } = useUser()
  const { notify, confirm } = useNotification()
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [lastSent, setLastSent] = useState(0)
  const [activeRoom, setActiveRoom] = useState<Setor>(() => {
    return (localStorage.getItem('lastChatRoom') as Setor) || 'geral'
  })
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Persiste a sala ativa
  useEffect(() => {
    localStorage.setItem('lastChatRoom', activeRoom)
  }, [activeRoom])

  // Gerencia a conexão com o Firebase (Sempre escutando a sala correta)
  useEffect(() => {
    const path = `chat/salas/${activeRoom}/mensagens`

    const q = query(ref(db, path), orderByChild('timestamp'), limitToLast(100))

    const unsubscribe = onValue(q, (snap) => {
      const lista: Mensagem[] = []
      snap.forEach((child) => {
        lista.push({
          id: child.key!,
          ...(child.val() as Omit<Mensagem, 'id'>),
        })
      })
      setMensagens(lista)
    })

    return () => unsubscribe()
  }, [activeRoom])

  // Auto-scroll robusto
  const isFirstLoad = useRef(true)
  useEffect(() => {
    if (mensagens.length > 0) {
      const scroll = () => {
        endRef.current?.scrollIntoView({
          behavior: isFirstLoad.current ? 'auto' : 'smooth',
          block: 'end',
        })
        if (isFirstLoad.current) isFirstLoad.current = false
      }
      const timer = setTimeout(scroll, 100)
      return () => clearTimeout(timer)
    }
  }, [mensagens, profiles, activeRoom])

  // Sincroniza perfis
  useEffect(() => {
    const aRef = ref(db, 'atendentes')
    const unsubscribe = onValue(aRef, (snap) => {
      if (snap.exists()) setProfiles(snap.val())
    })
    return () => unsubscribe()
  }, [])

  const enviar = useCallback(async () => {
    if (!user || !texto.trim() || enviando) return

    const charLimit = 500
    const cooldown = 2000 // 2 segundos

    if (texto.length > charLimit) {
      notify(`A mensagem excede o limite de ${charLimit} caracteres.`, 'warning')
      return
    }

    const agora = Date.now()
    if (agora - lastSent < cooldown) {
      notify('Aguarde um momento antes de enviar outra mensagem.', 'warning')
      return
    }

    setEnviando(true)

    try {
      const now = Date.now()
      await push(ref(db, `chat/salas/${activeRoom}/mensagens`), {
        autor: user.username,
        nomeCompleto: user.nomeCompleto,
        setor: user.setor,
        room: activeRoom,
        texto: texto.trim(),
        timestamp: now,
        avatarUrl: user.avatarUrl ?? null,
      })

      // Correção 6: Gravar meta da última mensagem
      await set(ref(db, `chat/meta/${activeRoom}/ultimaMensagem`), {
        autor: user.username,
        timestamp: now,
      })

      setTexto('')
      setLastSent(agora)
      inputRef.current?.focus()
    } catch (e) {
      notify('Erro ao enviar mensagem. Verifique sua conexão.', 'error')
      console.error('Erro ao enviar mensagem:', e)
    } finally {
      setEnviando(false)
    }
  }, [user, texto, enviando, lastSent, activeRoom, notify])

  const limparSala = useCallback(async () => {
    if (!user) return

    const confirmacao = await confirm(`Deseja realmente apagar TODO o histórico da sala ${getSetorLabel(activeRoom)}?`)

    if (!confirmacao) return

    try {
      await set(ref(db, `chat/salas/${activeRoom}/mensagens`), null)
      notify(`Histórico da sala ${activeRoom} limpo com sucesso!`, 'info')
    } catch (e) {
      console.error('Erro ao limpar sala:', e)
      notify('Erro ao limpar mensagens.', 'error')
    }
  }, [user, activeRoom, confirm, notify])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        enviar()
      }
    },
    [enviar],
  )

  const isPrivileged = user ? ['supervisor', 'moderador', 'admin'].includes(user.role) : false

  // Salas visíveis: Geral sempre, e a sala do setor do usuário se não for 'geral'.
  // Cargos privilegiados veem todas as salas.
  const salasVisiveis = useMemo(() => {
    return (Object.keys(ROOM_ICONS) as Setor[]).filter((s) => {
      if (isPrivileged) return true
      if (s === 'geral') return true
      return s === user?.setor
    })
  }, [isPrivileged, user?.setor])

  // Agrupar mensagens para balões compactos
  const grupos = useMemo(() => {
    return mensagens.map((msg, i) => {
      const prev = mensagens[i - 1]
      const isOwn = msg.autor === user?.username
      const showHeader = !prev || prev.autor !== msg.autor || msg.timestamp - prev.timestamp > 60_000
      return { msg, isOwn, showHeader }
    })
  }, [mensagens, user?.username])

  if (!user) return null

  return (
    <div className="ci-page">
      {/* Cabeçalho */}
      <div className="ci-header">
        <div className="ci-header-info">
          <span className="ci-header-icon">{ROOM_ICONS[activeRoom] || <MessageSquare size={18} strokeWidth={2} />}</span>
          <div>
            <h1 className="ci-titulo">Chat Interno</h1>
            <p className="ci-subtitulo">Sala: {getSetorLabel(activeRoom)}</p>
          </div>
        </div>
        <div className="ci-header-acoes">
          {isPrivileged && mensagens.length > 0 && (
            <button className="ci-btn-limpar" onClick={limparSala} title="Limpar mensagens dessa sala">
              <Trash2 size={16} strokeWidth={2} /> Limpar
            </button>
          )}
          <div className="ci-badge-online">
            <span className="ci-dot" />
            Online
          </div>
        </div>
      </div>

      {/* Seletor de Salas */}
      {salasVisiveis.length > 1 && (
        <div className="ci-filtros">
          {salasVisiveis.map((s) => (
            <button key={s} className={`ci-filtro-btn ${activeRoom === s ? 'active' : ''}`} onClick={() => setActiveRoom(s)}>
              <span className="ci-filtro-icon">{ROOM_ICONS[s]}</span>
              <span className="ci-filtro-label">{getSetorLabel(s)}</span>
              {unreadRooms.includes(s) && <span className="ci-unread-dot" />}
            </button>
          ))}
        </div>
      )}

      {/* Lista de mensagens */}
      <div className="ci-mensagens">
        {mensagens.length === 0 && (
          <div className="ci-vazio">
            <span>{ROOM_ICONS[activeRoom]}</span>
            <p>A sala {getSetorLabel(activeRoom)} está vazia. Comece a conversa!</p>
          </div>
        )}

        {grupos.map(({ msg, isOwn, showHeader }) => {
          const avatarUrl = profiles[msg.autor]?.avatarUrl

          return (
            <div key={msg.id} className={`ci-balao-wrap ${isOwn ? 'right' : 'left'}`}>
              {showHeader && !isOwn && (
                <div className="ci-autor-info">
                  <span className="ci-autor-nome">{msg.nomeCompleto}</span>
                  <span className="ci-autor-setor">{getSetorLabel(msg.setor)}</span>
                </div>
              )}

              <div className="ci-balao-conteudo">
                {showHeader && <div className="ci-avatar">{avatarUrl ? <img src={avatarUrl} alt="" className="ci-avatar-img" /> : msg.nomeCompleto.charAt(0).toUpperCase()}</div>}
                {!showHeader && <div className="ci-avatar-spacer" />}

                <div className={`ci-balao ${isOwn ? 'own' : 'other'}`}>
                  <span className="ci-texto">{msg.texto}</span>
                  <span className="ci-hora">{formatarHorario(msg.timestamp)}</span>
                </div>
              </div>
            </div>
          )
        })}

        <div ref={endRef} />
      </div>

      {/* Input de envio */}
      <div className="ci-input-area">
        <div className="ci-input-wrapper">
          <textarea ref={inputRef} className="ci-input" placeholder={`Falar em ${getSetorLabel(activeRoom)}…`} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={handleKeyDown} rows={1} maxLength={500} />
          <div className={`ci-char-counter ${texto.length >= 500 ? 'limit' : ''}`}>{texto.length}/500</div>
        </div>
        <button className="ci-btn-enviar" onClick={enviar} disabled={!texto.trim() || enviando} aria-label="Enviar mensagem">
          {enviando ? '...' : <ArrowRight size={20} strokeWidth={2} />}
        </button>
      </div>
    </div>
  )
}
