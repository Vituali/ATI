import { useState, useEffect, useRef } from 'react'
import { ref, onValue, push, update, remove, get, set, serverTimestamp } from 'firebase/database'
import { db } from '../../../services/firebase'
import { useUser } from '../../../hooks'
import { CheckCircle, BookOpen, Package, Edit3, Trash2, FileText, Clock, MessageCircle, Plus, Star, Layers, Info, Users } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import './Biblioteca.css'

type LeituraStatus = 'completo' | 'acompanhando' | 'nao_iniciado'
type TipoMidia = 'manhwa' | 'manga' | 'manhua' | 'webtoon' | 'serie' | 'filme'

interface LeituraEntry {
  id: string
  title: string
  type: TipoMidia
  status: LeituraStatus
  chapter?: string
  chapterNum?: number
  totalChapters?: number
  rating?: number
  notes?: string
  imageUrl?: string
  lastReadAt?: number
  createdAt: number
  updatedAt: number
}

interface CatalogEntry {
  id: string
  title: string
  type: TipoMidia
  description: string
  imageUrl: string
  createdBy: string
  ratings?: Record<string, number>
  createdAt: number
}

function computeAvgRating(ratings: Record<string, number> | undefined): { avg: number; count: number } {
  if (!ratings) return { avg: 0, count: 0 }
  const values = Object.values(ratings).filter((v): v is number => typeof v === 'number')
  if (values.length === 0) return { avg: 0, count: 0 }
  const sum = values.reduce((a, b) => a + b, 0)
  return {
    avg: Math.round((sum / values.length) * 10) / 10,
    count: values.length,
  }
}

const STATUS_OPTIONS: { value: LeituraStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'completo', label: 'Completo', icon: <CheckCircle size={14} /> },
  { value: 'acompanhando', label: 'Acompanhando', icon: <BookOpen size={14} /> },
  { value: 'nao_iniciado', label: 'Não Iniciado', icon: <Package size={14} /> },
]

const STATUS_LABEL: Record<LeituraStatus, string> = {
  completo: 'Completos',
  acompanhando: 'Acompanhando',
  nao_iniciado: 'Não Iniciado',
}

const STATUS_ICON: Record<LeituraStatus, React.ReactNode> = {
  completo: <CheckCircle size={16} />,
  acompanhando: <BookOpen size={16} />,
  nao_iniciado: <Package size={16} />,
}

const TIPO_OPTIONS: { value: TipoMidia; label: string }[] = [
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'manga', label: 'Manga' },
  { value: 'manhua', label: 'Manhua' },
  { value: 'webtoon', label: 'Webtoon' },
  { value: 'serie', label: 'Série' },
  { value: 'filme', label: 'Filme' },
]

function formatDate(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function timeAgo(ts: number): string {
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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="animes-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`animes-star ${star <= value ? 'filled' : ''}`}
          onClick={() => onChange(star === value ? 0 : star)}
        >
          <Star size={18} fill={star <= value ? '#fbbf24' : 'none'} />
        </button>
      ))}
    </div>
  )
}

export default function Biblioteca() {
  const { user } = useUser()
  const columnsRef = useRef<HTMLDivElement>(null)

  const [entries, setEntries] = useState<LeituraEntry[]>([])
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState<TipoMidia>('manhwa')
  const [formStatus, setFormStatus] = useState<LeituraStatus>('acompanhando')
  const [formChapterNum, setFormChapterNum] = useState<number | undefined>()
  const [formTotalChapters, setFormTotalChapters] = useState<number | undefined>()
  const [formRating, setFormRating] = useState(0)
  const [formNotes, setFormNotes] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [addToCatalog, setAddToCatalog] = useState(true)

  const [selectedCatalogEntry, setSelectedCatalogEntry] = useState<CatalogEntry | null>(null)

  const [activeTab, setActiveTab] = useState<LeituraStatus | 'todos'>('todos')
  const [activeMainTab, setActiveMainTab] = useState<'meus' | 'catalogo'>('meus')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TipoMidia | 'todos'>('todos')
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'rating' | 'chapter'>('updated')

  const username = user?.username
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const el = columnsRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const cards = el.querySelectorAll('.animes-card')
      for (const card of cards) {
        const rect = (card as HTMLElement).getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        ;(card as HTMLElement).style.setProperty('--mouse-x', `${x}%`)
        ;(card as HTMLElement).style.setProperty('--mouse-y', `${y}%`)
      }
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    if (!username) return
    const entriesRef = ref(db, `leitura/${username}`)
    Promise.resolve().then(() => {
      setLoading(true)
    })
    const unsub = onValue(entriesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        const list: LeituraEntry[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          title: val.title || '',
          type: val.type || 'manhwa',
          status: val.status || 'nao_iniciado',
          chapter: val.chapter || '',
          chapterNum: val.chapterNum ?? undefined,
          totalChapters: val.totalChapters ?? undefined,
          rating: val.rating ?? undefined,
          notes: val.notes || '',
          imageUrl: val.imageUrl || '',
          lastReadAt: val.lastReadAt || 0,
          createdAt: val.createdAt || 0,
          updatedAt: val.updatedAt || 0,
        }))
        setEntries(list)
      } else {
        setEntries([])
      }
      setLoading(false)
    })
    return () => unsub()
  }, [username])

  useEffect(() => {
    const catalogRef = ref(db, 'leitura-catalogo')
    const unsub = onValue(catalogRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val()
        const list: CatalogEntry[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          title: val.title || '',
          type: val.type || 'manhwa',
          description: val.description || '',
          imageUrl: val.imageUrl || '',
          createdBy: val.createdBy || '',
          ratings: val.ratings || {},
          createdAt: val.createdAt || 0,
        }))
        setCatalogEntries(list)
      } else {
        setCatalogEntries([])
      }
    })
    return () => unsub()
  }, [])

  const getCatalogEntry = (entryId: string) => catalogEntries.find(ce => ce.id === entryId)

  const userHasInPersonal = (catalogId: string) => entries.some(e => e.id === catalogId)

  const updateCatalogRating = async (catalogId: string, username: string, newRating: number) => {
    if (newRating === 0) {
      await remove(ref(db, `leitura-catalogo/${catalogId}/ratings/${username}`))
    } else {
      await set(ref(db, `leitura-catalogo/${catalogId}/ratings/${username}`), newRating)
    }
  }

  const getNextChapterNum = (entry: LeituraEntry): number => {
    return (entry.chapterNum ?? 0) + 1
  }

  const quickAddChapter = async (entry: LeituraEntry) => {
    if (!username) return
    const nextNum = getNextChapterNum(entry)
    const nextStr = `Cap ${nextNum}`
    const payload: Record<string, any> = {
      chapter: nextStr,
      chapterNum: nextNum,
      status: 'acompanhando',
      lastReadAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    if (entry.totalChapters && nextNum >= entry.totalChapters) {
      payload.status = 'completo'
    }
    if (entry.notes) payload.notes = entry.notes
    if (entry.rating) payload.rating = entry.rating
    if (entry.totalChapters) payload.totalChapters = entry.totalChapters
    if (entry.type) payload.type = entry.type
    if (entry.title) payload.title = entry.title
    if (entry.imageUrl) payload.imageUrl = entry.imageUrl
    const existingSnap = await get(ref(db, `leitura/${username}/${entry.id}`))
    if (existingSnap.exists()) {
      const existing = existingSnap.val()
      Object.keys(existing).forEach((k) => {
        if (!(k in payload) && k !== 'id') payload[k] = existing[k]
      })
    }
    await update(ref(db, `leitura/${username}/${entry.id}`), payload)
  }

  const resetForm = () => {
    setFormTitle('')
    setFormType('manhwa')
    setFormStatus('acompanhando')
    setFormChapterNum(undefined)
    setFormTotalChapters(undefined)
    setFormRating(0)
    setFormNotes('')
    setFormImageUrl('')
    setFormDescription('')
    setAddToCatalog(true)
    setEditId(null)
    setShowForm(false)
  }

  const handleEdit = (entry: LeituraEntry) => {
    setFormTitle(entry.title)
    setFormType(entry.type)
    setFormStatus(entry.status)
    setFormChapterNum(entry.chapterNum)
    setFormTotalChapters(entry.totalChapters)
    setFormRating(entry.rating || 0)
    setFormNotes(entry.notes || '')
    setFormImageUrl(entry.imageUrl || '')
    setFormDescription(getCatalogEntry(entry.id)?.description || '')
    setEditId(entry.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !formTitle.trim()) return

    const now = serverTimestamp()
    const payload: Record<string, any> = {
      title: formTitle.trim(),
      type: formType,
      status: formStatus,
      chapter: formChapterNum ? `Cap ${formChapterNum}` : '',
      chapterNum: formChapterNum || null,
      totalChapters: formTotalChapters || null,
      rating: formRating || null,
      notes: formNotes.trim(),
      imageUrl: formImageUrl.trim() || null,
      updatedAt: now,
    }

    if (editId) {
      const existingSnap = await get(ref(db, `leitura/${username}/${editId}`))
      if (existingSnap.exists()) {
        const existing = existingSnap.val()
        if (existing.createdAt) payload.createdAt = existing.createdAt
        if (!payload.chapterNum && existing.chapterNum) payload.chapterNum = existing.chapterNum
        if (!payload.totalChapters && existing.totalChapters) payload.totalChapters = existing.totalChapters
      }
      await update(ref(db, `leitura/${username}/${editId}`), payload)

      if (isAdmin) {
        const isInCatalog = !!getCatalogEntry(editId)
        if (isInCatalog) {
          await update(ref(db, `leitura-catalogo/${editId}`), {
            title: formTitle.trim(),
            type: formType,
            description: formDescription.trim(),
            imageUrl: formImageUrl.trim() || null,
            updatedAt: now,
          })
          if (formRating) {
            await set(ref(db, `leitura-catalogo/${editId}/ratings/${username}`), formRating)
          } else {
            await remove(ref(db, `leitura-catalogo/${editId}/ratings/${username}`))
          }
        } else if (formDescription.trim()) {
          const catPayload: Record<string, any> = {
            title: formTitle.trim(),
            type: formType,
            description: formDescription.trim(),
            imageUrl: formImageUrl.trim() || null,
            createdBy: username,
            createdAt: now,
            updatedAt: now,
          }
          if (formRating) {
            catPayload[`ratings/${username}`] = formRating
          }
          await update(ref(db, `leitura-catalogo/${editId}`), catPayload)
        }
      }
    } else {
      const newRef = push(ref(db, `leitura/${username}`))
      const newId = newRef.key!
      payload.createdAt = now
      await update(ref(db, `leitura/${username}/${newId}`), payload)

      if (isAdmin && addToCatalog) {
        const catPayload: Record<string, any> = {
          title: formTitle.trim(),
          type: formType,
          description: formDescription.trim(),
          imageUrl: formImageUrl.trim() || null,
          createdBy: username,
          createdAt: now,
          updatedAt: now,
        }
        if (formRating) {
          catPayload[`ratings/${username}`] = formRating
        }
        await set(ref(db, `leitura-catalogo/${newId}`), catPayload)
      }
    }
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (!username) return
    await remove(ref(db, `leitura/${username}/${id}`))
  }

  const handleDeleteCatalog = async (id: string) => {
    if (!isAdmin || !username) return
    await remove(ref(db, `leitura-catalogo/${id}`))
  }

  const handleStatusChange = async (id: string, newStatus: LeituraStatus) => {
    if (!username) return
    const payload: Record<string, any> = { status: newStatus, updatedAt: serverTimestamp() }
    if (newStatus === 'completo') {
      payload.lastReadAt = serverTimestamp()
    }
    await update(ref(db, `leitura/${username}/${id}`), payload)
  }

  const handleRatingChange = async (id: string, rating: number) => {
    if (!username) return
    await update(ref(db, `leitura/${username}/${id}`), { rating, updatedAt: serverTimestamp() })
    if (getCatalogEntry(id)) {
      await updateCatalogRating(id, username, rating)
    }
  }

  const markCompleted = async (entry: LeituraEntry) => {
    if (!username) return
    const payload: Record<string, any> = {
      status: 'completo',
      updatedAt: serverTimestamp(),
      lastReadAt: serverTimestamp(),
    }
    if (entry.totalChapters && entry.chapterNum) {
      payload.chapter = `Cap ${entry.totalChapters}`
      payload.chapterNum = entry.totalChapters
    }
    await update(ref(db, `leitura/${username}/${entry.id}`), payload)
  }

  const addToMyList = async (catalogEntry: CatalogEntry) => {
    if (!username) return
    const now = serverTimestamp()
    const payload: Record<string, any> = {
      title: catalogEntry.title,
      type: catalogEntry.type,
      status: 'nao_iniciado',
      imageUrl: catalogEntry.imageUrl || null,
      chapter: '',
      chapterNum: null,
      totalChapters: null,
      rating: null,
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
    await update(ref(db, `leitura/${username}/${catalogEntry.id}`), payload)
  }

  const sortedEntries = [...entries].sort((a, b) => {
    switch (sortBy) {
      case 'title': return a.title.localeCompare(b.title)
      case 'rating': return (b.rating || 0) - (a.rating || 0)
      case 'chapter': return (b.chapterNum || 0) - (a.chapterNum || 0)
      default: return b.updatedAt - a.updatedAt
    }
  })

  const filteredEntries = sortedEntries.filter((e) => {
    const matchesTab = activeTab === 'todos' || e.status === activeTab
    const matchesType = typeFilter === 'todos' || e.type === typeFilter
    const matchesSearch =
      !searchQuery ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.chapter?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesType && matchesSearch
  })

  const groupedEntries: Record<string, LeituraEntry[]> = {
    completo: filteredEntries.filter((e) => e.status === 'completo'),
    acompanhando: filteredEntries.filter((e) => e.status === 'acompanhando'),
    nao_iniciado: filteredEntries.filter((e) => e.status === 'nao_iniciado'),
  }

  const stats = {
    total: entries.length,
    completo: entries.filter((e) => e.status === 'completo').length,
    acompanhando: entries.filter((e) => e.status === 'acompanhando').length,
    nao_iniciado: entries.filter((e) => e.status === 'nao_iniciado').length,
  }

  const filteredCatalog = catalogEntries.filter((ce) => {
    const matchesType = typeFilter === 'todos' || ce.type === typeFilter
    const matchesSearch =
      !searchQuery ||
      ce.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ce.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  }).sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="animes-page">
      <div className="animes-header">
        <div className="animes-title-row">
          <h1 className="animes-title"><BookOpen size={24} /> Minha Biblioteca</h1>
          <button className="animes-btn animes-btn-primary" onClick={() => { resetForm(); setShowForm(true) }}>
            <Plus size={16} /> Novo
          </button>
        </div>

        <div className="animes-main-tabs">
          <button
            className={`animes-main-tab ${activeMainTab === 'meus' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('meus')}
          >
            <BookOpen size={16} /> Meus Itens
          </button>
          <button
            className={`animes-main-tab ${activeMainTab === 'catalogo' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('catalogo')}
          >
            <Layers size={16} /> Catálogo {catalogEntries.length > 0 && <span className="animes-main-tab-badge">{catalogEntries.length}</span>}
          </button>
        </div>

        {activeMainTab === 'meus' && (
          <div className="animes-stats-bar">
            <span className="animes-stat-item"><strong>{stats.total}</strong> total</span>
            <span className="animes-stat-item completo"><CheckCircle size={12} /> <strong>{stats.completo}</strong> completos</span>
            <span className="animes-stat-item acompanhando"><BookOpen size={12} /> <strong>{stats.acompanhando}</strong> acompanhando</span>
            <span className="animes-stat-item nao_iniciado"><Package size={12} /> <strong>{stats.nao_iniciado}</strong> não iniciados</span>
          </div>
        )}

        <div className="animes-toolbar">
          {activeMainTab === 'meus' && (
            <div className="animes-tabs">
              {[{ value: 'todos' as const, label: 'Todos', icon: <BookOpen size={14} /> }, ...STATUS_OPTIONS].map((tab) => (
                <button
                  key={tab.value}
                  className={`animes-tab ${activeTab === tab.value ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.value as LeituraStatus | 'todos')}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          )}
          <div className="animes-toolbar-right">
            <select
              className="animes-filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TipoMidia | 'todos')}
            >
              <option value="todos">Todos os tipos</option>
              {TIPO_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {activeMainTab === 'meus' && (
              <select
                className="animes-filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="updated">Última atualização</option>
                <option value="title">Ordem alfabética</option>
                <option value="rating">Melhor avaliação</option>
                <option value="chapter">Mais capítulos</option>
              </select>
            )}
            <div className="animes-search">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="animes-search-input"
              />
            </div>
          </div>
        </div>
      </div>

      <Modal aberto={showForm} onFechar={resetForm} titulo={editId ? "Editar Item" : "Novo Item"} largura="560px">
        <form onSubmit={handleSubmit} style={{ margin: 0, padding: 0 }}>
          <div className="animes-form-grid">
            <div className="animes-form-group">
              <label>Título *</label>
              <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Clones Farm" required />
            </div>
            <div className="animes-form-group">
              <label>Tipo</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value as TipoMidia)}>
                {TIPO_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="animes-form-group">
              <label>Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as LeituraStatus)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="animes-form-group">
              <label>Capítulo</label>
              <input type="number" min={0} value={formChapterNum ?? ''} onChange={(e) => setFormChapterNum(e.target.value ? Number(e.target.value) : undefined)} placeholder="129" />
            </div>
            <div className="animes-form-group">
              <label>Total de capítulos</label>
              <input type="number" min={0} value={formTotalChapters ?? ''} onChange={(e) => setFormTotalChapters(e.target.value ? Number(e.target.value) : undefined)} placeholder="Ex: 200" />
            </div>
            <div className="animes-form-group">
              <label>Avaliação</label>
              <StarRating value={formRating} onChange={setFormRating} />
            </div>
            <div className="animes-form-group full-width">
              <label>URL da Imagem (Poster)</label>
              <input type="url" value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)} placeholder="https://exemplo.com/poster.jpg" />
            </div>
            <div className="animes-form-group full-width">
              <label>Notas</label>
              <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notas pessoais..." rows={2} />
            </div>
            {isAdmin && (
              <div className="animes-form-group full-width">
                <label><Info size={12} /> Descrição / Sinopse</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Sinopse da obra..." rows={3} />
                {!editId && (
                  <label className="animes-form-checkbox">
                    <input type="checkbox" checked={addToCatalog} onChange={(e) => setAddToCatalog(e.target.checked)} />
                    Compartilhar no catálogo
                  </label>
                )}
              </div>
            )}
          </div>
          <div className="animes-form-actions">
            <button type="submit" className="animes-btn animes-btn-primary">{editId ? 'Salvar' : 'Adicionar'}</button>
            <button type="button" className="animes-btn animes-btn-secondary" onClick={resetForm}>Cancelar</button>
          </div>
        </form>
      </Modal>

      {activeMainTab === 'catalogo' ? (
        filteredCatalog.length === 0 ? (
          <div className="animes-empty">
            <div className="animes-empty-icon"><Layers size={48} /></div>
            <p>Catálogo vazio</p>
            <span className="animes-empty-sub">Nenhum item compartilhado no catálogo ainda</span>
          </div>
        ) : (
          <div className="animes-catalog-grid">
            {filteredCatalog.map((catEntry) => {
              const inMyList = userHasInPersonal(catEntry.id)
              return (
                <div key={catEntry.id} className={`animes-catalog-card ${catEntry.imageUrl ? 'has-poster' : ''}`} onClick={() => setSelectedCatalogEntry(catEntry)}>
                  {catEntry.imageUrl && (
                    <div className="animes-catalog-poster">
                      <img src={catEntry.imageUrl} alt={catEntry.title} referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="animes-catalog-body">
                    <div className="animes-catalog-header">
                      <span className={`animes-card-type animes-type-${catEntry.type}`}>{catEntry.type}</span>
                      {isAdmin && (
                        <button className="animes-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteCatalog(catEntry.id) }} title="Remover do catálogo">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <h3 className="animes-catalog-title">{catEntry.title}</h3>
                    {catEntry.description && (
                      <p className="animes-catalog-description">{catEntry.description}</p>
                    )}
                    {(() => {
                      const { avg, count } = computeAvgRating(catEntry.ratings)
                      return (
                        <div className="animes-catalog-meta">
                          <div className="animes-catalog-avg-rating">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className={`animes-star-display ${s <= Math.round(avg) ? 'filled' : ''}`}>
                                <Star size={13} fill={s <= Math.round(avg) ? '#fbbf24' : 'none'} />
                              </span>
                            ))}
                            {count > 0 && (
                              <span className="animes-catalog-rating-info">{avg.toFixed(1)} (<Users size={11} /> {count})</span>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                    <div className="animes-catalog-actions">
                      {inMyList ? (
                        <span className="animes-catalog-added"><CheckCircle size={14} /> Adicionado</span>
                      ) : (
                        <button className="animes-btn animes-btn-primary animes-btn-small" onClick={(e) => { e.stopPropagation(); addToMyList(catEntry) }}>
                          <Plus size={12} /> Adicionar à minha lista
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : loading ? (
        <div className="animes-loading">Carregando...</div>
      ) : entries.length === 0 && activeTab === 'todos' ? (
        <div className="animes-empty">
          <div className="animes-empty-icon"><BookOpen size={48} /></div>
          <p>Sua biblioteca está vazia</p>
          <span className="animes-empty-sub">Adicione manhwas, mangás, séries e filmes para acompanhar sua leitura</span>
          <button className="animes-btn animes-btn-primary" onClick={() => { resetForm(); setShowForm(true) }}>
            <Plus size={16} /> Adicionar primeiro
          </button>
        </div>
      ) : (
        <div className="animes-columns" ref={columnsRef}>
          {(['acompanhando', 'nao_iniciado', 'completo'] as LeituraStatus[]).map((statusKey) => {
            const items = groupedEntries[statusKey]
            const show = activeTab === 'todos' ? (statusKey !== 'completo') : (activeTab === statusKey)
            if (!show) return null

            return (
              <div key={statusKey} className={`animes-column ${statusKey}`}>
                <div className="animes-column-header">
                  <span className="animes-column-icon">{STATUS_ICON[statusKey]}</span>
                  <span className="animes-column-title">{STATUS_LABEL[statusKey]}</span>
                  <span className="animes-column-count">{items.length}</span>
                </div>
                <div className="animes-column-list">
                  {items.length === 0 ? (
                    <div className="animes-column-empty">Nenhum item</div>
                  ) : (
                    items.map((entry) => {
                      const progress = entry.totalChapters && entry.chapterNum
                        ? Math.min(100, Math.round((entry.chapterNum / entry.totalChapters) * 100))
                        : undefined
                      const catEntry = getCatalogEntry(entry.id)

                      return (
                        <div key={entry.id} className={`animes-card ${entry.status === 'acompanhando' ? 'animes-card-ongoing' : ''} ${entry.imageUrl ? 'has-poster' : ''}`}>
                          {entry.imageUrl && (
                            <div className="animes-card-poster">
                              <img src={entry.imageUrl} alt={entry.title} referrerPolicy="no-referrer" />
                            </div>
                          )}
                          <div className="animes-card-content">
                            <div className="animes-card-header">
                              <span className={`animes-card-type animes-type-${entry.type}`}>{entry.type}</span>
                              <div className="animes-card-actions">
                                <button className="animes-action-btn edit" onClick={() => handleEdit(entry)} title="Editar"><Edit3 size={14} /></button>
                                <button className="animes-action-btn delete" onClick={() => handleDelete(entry.id)} title="Excluir"><Trash2 size={14} /></button>
                              </div>
                            </div>

                            <h3 className="animes-card-title">{entry.title}</h3>

                            {entry.status !== 'nao_iniciado' && entry.chapter && (
                              <div className="animes-card-chapter"><FileText size={12} /> {entry.chapter}</div>
                            )}

                            {progress !== undefined && (
                              <div className="animes-progress-bar">
                                <div className="animes-progress-fill" style={{ width: `${progress}%` }} />
                                <span className="animes-progress-text">{entry.chapterNum}/{entry.totalChapters} ({progress}%)</span>
                              </div>
                            )}

                            {catEntry && (() => {
                              const { avg, count } = computeAvgRating(catEntry.ratings)
                              if (count === 0) return null
                              return (
                                <div className="animes-card-catalog-rating">
                                  <span className="animes-card-catalog-rating-label">Média</span>
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <span key={s} className={`animes-star-display small ${s <= Math.round(avg) ? 'filled' : ''}`}>
                                      <Star size={11} fill={s <= Math.round(avg) ? '#fbbf24' : 'none'} />
                                    </span>
                                  ))}
                                  <span className="animes-card-catalog-rating-info">{avg.toFixed(1)} ({count})</span>
                                </div>
                              )
                            })()}

                            {entry.rating !== undefined && entry.rating > 0 && (
                              <div className="animes-card-rating">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <span key={s} className={`animes-star-display ${s <= (entry.rating || 0) ? 'filled' : ''}`}
                                    onClick={() => handleRatingChange(entry.id, s === entry.rating ? 0 : s)}
                                  ><Star size={14} fill={s <= (entry.rating || 0) ? '#fbbf24' : 'none'} /></span>
                                ))}
                              </div>
                            )}

                            {entry.notes && <div className="animes-card-notes"><MessageCircle size={12} /> {entry.notes}</div>}

                            {entry.lastReadAt && (
                              <div className="animes-card-lastread"><Clock size={11} /> lido {timeAgo(entry.lastReadAt)}</div>
                            )}

                            <div className="animes-card-footer">
                              {entry.status === 'acompanhando' && (
                                <>
                                  <button className="animes-btn animes-btn-small animes-btn-plus" onClick={() => quickAddChapter(entry)} title="Avançar 1 capítulo">
                                    <Plus size={11} strokeWidth={2.5} /> +1 Cap
                                  </button>
                                  <button className="animes-btn animes-btn-small animes-btn-complete" onClick={() => markCompleted(entry)} title="Marcar como completo">
                                    <CheckCircle size={12} /> Completar
                                  </button>
                                </>
                              )}
                              <select
                                className="animes-status-select"
                                value={entry.status}
                                onChange={(e) => handleStatusChange(entry.id, e.target.value as LeituraStatus)}
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal aberto={!!selectedCatalogEntry} onFechar={() => setSelectedCatalogEntry(null)} titulo={selectedCatalogEntry?.title || ''} largura="620px">
        {selectedCatalogEntry && (
          <div className="animes-catalog-detail">
            {selectedCatalogEntry.imageUrl && (
              <div className="animes-catalog-detail-poster">
                <img src={selectedCatalogEntry.imageUrl} alt={selectedCatalogEntry.title} referrerPolicy="no-referrer" />
              </div>
            )}
            <div className="animes-catalog-detail-body">
              <div className="animes-catalog-detail-header">
                <span className={`animes-card-type animes-type-${selectedCatalogEntry.type}`}>{selectedCatalogEntry.type}</span>
                {isAdmin && (
                  <button className="animes-action-btn delete" onClick={() => { handleDeleteCatalog(selectedCatalogEntry.id); setSelectedCatalogEntry(null) }} title="Remover do catálogo">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {selectedCatalogEntry.description && (
                <div className="animes-catalog-detail-desc">
                  <Info size={14} /> <span>{selectedCatalogEntry.description}</span>
                </div>
              )}
              {(() => {
                const { avg, count } = computeAvgRating(selectedCatalogEntry.ratings)
                const ratings = selectedCatalogEntry.ratings || {}
                const entries = Object.entries(ratings)
                return (
                  <div className="animes-catalog-detail-rating">
                    <div className="animes-catalog-detail-avg">
                      <span className="animes-catalog-detail-label">Avaliação média</span>
                      <div className="animes-catalog-detail-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={`animes-star-display ${s <= Math.round(avg) ? 'filled' : ''}`}>
                            <Star size={18} fill={s <= Math.round(avg) ? '#fbbf24' : 'none'} />
                          </span>
                        ))}
                        {count > 0 && <span className="animes-catalog-detail-avg-num">{avg.toFixed(1)} ({count} {count === 1 ? 'avaliação' : 'avaliações'})</span>}
                      </div>
                    </div>
                    {entries.length > 0 && (
                      <div className="animes-catalog-detail-users">
                        <span className="animes-catalog-detail-label">Avaliações individuais</span>
                        {entries.map(([userName, userRating]) => (
                          <div key={userName} className="animes-catalog-detail-user">
                            <span className="animes-catalog-detail-user-name">{userName}</span>
                            <div className="animes-catalog-detail-user-stars">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <span key={s} className={`animes-star-display small ${s <= userRating ? 'filled' : ''}`}>
                                  <Star size={12} fill={s <= userRating ? '#fbbf24' : 'none'} />
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
              <div className="animes-catalog-detail-actions">
                {userHasInPersonal(selectedCatalogEntry.id) ? (
                  <span className="animes-catalog-added"><CheckCircle size={16} /> Adicionado à sua lista</span>
                ) : (
                  <button className="animes-btn animes-btn-primary" onClick={() => { addToMyList(selectedCatalogEntry); setSelectedCatalogEntry(null) }}>
                    <Plus size={16} /> Adicionar à minha lista
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
