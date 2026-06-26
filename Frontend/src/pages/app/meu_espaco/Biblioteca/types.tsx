import React from 'react'
import { CheckCircle, BookOpen, Book, BookMarked, Smartphone, Tv, Film, Gamepad2, Package, Sparkles, Monitor } from 'lucide-react'

export type LeituraStatus = 'completo' | 'acompanhando' | 'nao_iniciado'
export type TipoMidia = 'manhwa' | 'manga' | 'manhua' | 'webtoon' | 'serie' | 'filme' | 'livro' | 'jogo' | 'dorama' | 'anime'
export type ReleaseStatus = 'completo' | 'lancando' | 'descontinuado'

export interface SeasonInfo {
  number: number
  totalEpisodes: number
}

export interface LeituraEntry {
  id: string
  title: string
  type: TipoMidia
  status: LeituraStatus
  chapter?: string
  chapterNum?: number
  totalChapters?: number
  season?: number
  episode?: number
  totalEpisodes?: number
  currentPage?: number
  totalPages?: number
  releaseStatus?: ReleaseStatus
  seasons?: SeasonInfo[]
  releaseDay?: string
  rating?: number
  notes?: string
  imageUrl?: string
  lastReadAt?: number
  lastAutoUpdate?: number
  createdAt: number
  updatedAt: number
}

export interface CatalogEntry {
  id: string
  title: string
  type: TipoMidia
  description: string
  imageUrl: string
  createdBy: string
  ratings?: Record<string, number>
  seasons?: SeasonInfo[]
  totalChapters?: number
  totalPages?: number
  duration?: number
  latestSeason?: number
  latestEpisode?: number
  releaseStatus?: ReleaseStatus
  releaseDay?: string
  lastAutoUpdate?: number
  createdAt: number
}

export function computeAvgRating(ratings: Record<string, number> | undefined): { avg: number; count: number } {
  if (!ratings) return { avg: 0, count: 0 }
  const values = Object.values(ratings).filter((v): v is number => typeof v === 'number')
  if (values.length === 0) return { avg: 0, count: 0 }
  const sum = values.reduce((a, b) => a + b, 0)
  return {
    avg: Math.round((sum / values.length) * 10) / 10,
    count: values.length,
  }
}

export const STATUS_OPTIONS: { value: LeituraStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'completo', label: 'Completo', icon: <CheckCircle size={14} /> },
  { value: 'acompanhando', label: 'Acompanhando', icon: <BookOpen size={14} /> },
  { value: 'nao_iniciado', label: 'Não Iniciado', icon: <Package size={14} /> },
]

export const STATUS_LABEL: Record<LeituraStatus, string> = {
  completo: 'Completos',
  acompanhando: 'Acompanhando',
  nao_iniciado: 'Não Iniciado',
}

export const STATUS_ICON: Record<LeituraStatus, React.ReactNode> = {
  completo: <CheckCircle size={16} />,
  acompanhando: <BookOpen size={16} />,
  nao_iniciado: <Package size={16} />,
}

export const TIPO_OPTIONS: { value: TipoMidia; label: string; icon: React.ReactNode }[] = [
  { value: 'manhwa', label: 'Manhwa', icon: <BookOpen size={18} /> },
  { value: 'manga', label: 'Manga', icon: <Book size={18} /> },
  { value: 'manhua', label: 'Manhua', icon: <BookMarked size={18} /> },
  { value: 'webtoon', label: 'Webtoon', icon: <Smartphone size={18} /> },
  { value: 'anime', label: 'Anime', icon: <Sparkles size={18} /> },
  { value: 'serie', label: 'Série', icon: <Tv size={18} /> },
  { value: 'dorama', label: 'Dorama', icon: <Monitor size={18} /> },
  { value: 'filme', label: 'Filme', icon: <Film size={18} /> },
  { value: 'livro', label: 'Livro', icon: <Book size={18} /> },
  { value: 'jogo', label: 'Jogo', icon: <Gamepad2 size={18} /> },
]

export const RELEASE_DAYS = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']

export function formatDate(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function timeAgo(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d atrás`
  return formatDate(ts)
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`
  return `${m}m`
}

