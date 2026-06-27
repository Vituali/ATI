// components/AvisosHome.tsx
// ---------------------------------------------------------------
// Exibe avisos ativos publicados por admins no topo da Home.
// Admins veem botão X para desativar/remover o aviso.
// ---------------------------------------------------------------

import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { UserProfile } from '../../hooks/useUser'
import { AlertTriangle, TriangleAlert, X, Info } from 'lucide-react'
import './AvisosHome.css'

interface Aviso {
  id: string
  titulo: string
  corpo: string
  tipo: 'info' | 'warning' | 'danger'
  criadoPor: string
  timestamp: number
  ativo: boolean
}

interface AvisosHomeProps {
  user: UserProfile
}

function formatarData(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TIPO_ICON: Record<Aviso['tipo'], React.ReactNode> = {
  info: <Info size={20} strokeWidth={2} />,
  warning: <AlertTriangle size={20} strokeWidth={2} />,
  danger: <TriangleAlert size={20} strokeWidth={2} />,
}

export default function AvisosHome({ user }: AvisosHomeProps) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const isAdmin = user.role === 'admin'

  useEffect(() => {
    let cancelled = false

    const carregar = async () => {
      try {
        const data: any[] = await api.get('/api/avisos')
        if (cancelled) return
        const lista: Aviso[] = data
          .filter((a: any) => a.ativo)
          .map((a: any) => ({
            id: a.id,
            titulo: a.titulo,
            corpo: a.texto,
            tipo: a.tipo as Aviso['tipo'],
            criadoPor: a.autor?.nomeCompleto || '',
            timestamp: new Date(a.createdAt).getTime(),
            ativo: a.ativo,
          }))
        lista.sort((a, b) => b.timestamp - a.timestamp)
        setAvisos(lista)
      } catch (e) {
        console.error('Erro ao carregar avisos:', e)
      }
    }

    carregar()
    const interval = setInterval(carregar, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  async function desativar(id: string) {
    try {
      await api.patch(`/api/avisos/${id}`, { ativo: false })
    } catch (e) {
      console.error('Erro ao desativar aviso:', e)
    }
  }

  if (avisos.length === 0) return null

  return (
    <div className="avisos-container">
      {avisos.map((aviso) => (
        <div key={aviso.id} className={`aviso-card aviso-${aviso.tipo}`}>
          <div className="aviso-icone">{TIPO_ICON[aviso.tipo]}</div>
          <div className="aviso-conteudo">
            <div className="aviso-header">
              <strong className="aviso-titulo">{aviso.titulo}</strong>
              <span className="aviso-meta">
                por @{aviso.criadoPor} · {formatarData(aviso.timestamp)}
              </span>
            </div>
            <p className="aviso-corpo">{aviso.corpo}</p>
          </div>
          {isAdmin && (
            <button className="aviso-btn-fechar" onClick={() => desativar(aviso.id)} title="Desativar aviso" aria-label="Fechar aviso">
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
