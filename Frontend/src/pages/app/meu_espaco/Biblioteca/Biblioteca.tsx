import { useState, useEffect, useRef, useCallback } from 'react'
import { ref, onValue, push, update, remove, get, set, serverTimestamp } from 'firebase/database'
import { db } from '../../../../services/firebase'
import { useUser } from '../../../../hooks'
import { BookOpen, Layers, Plus } from 'lucide-react'
import './Biblioteca.css'

import {
  LeituraEntry,
  CatalogEntry,
  LeituraStatus,
  TipoMidia,
  ReleaseStatus,
  SeasonInfo,
  TIPO_OPTIONS,
  STATUS_OPTIONS,
  RELEASE_DAYS,
} from './types'
import { ItemModal } from './ItemModal'
import { CatalogTab } from './CatalogTab'
import { LibraryTab } from './LibraryTab'

export default function Biblioteca() {
  const { user } = useUser()
  const columnsRef = useRef<HTMLDivElement>(null)

  const [entries, setEntries] = useState<LeituraEntry[]>([])
  const [catalogEntries, setCatalogEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [catalogLoading, setCatalogLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<LeituraEntry | null>(null)

  const [activeTab, setActiveTab] = useState<LeituraStatus | 'todos'>('todos')
  const [activeMainTab, setActiveMainTab] = useState<'meus' | 'catalogo'>('meus')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TipoMidia | 'todos'>('todos')
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'rating' | 'chapter'>('updated')

  const username = user?.username
  const isAdmin = user?.role === 'admin'
  const canManageCatalog = !!(isAdmin || user?.customAllowedSections?.includes('biblioteca'))

  useEffect(() => {
    const el = columnsRef.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const targets = el.querySelectorAll('.animes-card, .animes-category-card')
      for (const card of targets) {
        const rect = (card as HTMLElement).getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        ;(card as HTMLElement).style.setProperty('--mouse-x', `${x}%`)
        ;(card as HTMLElement).style.setProperty('--mouse-y', `${y}%`)
      }
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [activeMainTab])

  useEffect(() => {
    if (!username) return
    Promise.resolve().then(() => {
      setLoading(true)
    })
    const entriesRef = ref(db, `leitura/${username}`)
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
          season: val.season ?? undefined,
          episode: val.episode ?? undefined,
          totalEpisodes: val.totalEpisodes ?? undefined,
          currentPage: val.currentPage ?? undefined,
          totalPages: val.totalPages ?? undefined,
          releaseStatus: val.releaseStatus ?? undefined,
          seasons: val.seasons ?? undefined,
          releaseDay: val.releaseDay ?? undefined,
          rating: val.rating ?? undefined,
          notes: val.notes || '',
          imageUrl: val.imageUrl || '',
          lastReadAt: val.lastReadAt || 0,
          lastAutoUpdate: val.lastAutoUpdate || 0,
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

  // Subscriptions to Catalog List
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
          seasons: val.seasons ?? undefined,
          totalChapters: val.totalChapters ?? undefined,
          totalPages: val.totalPages ?? undefined,
          duration: val.duration ?? undefined,
          latestSeason: val.latestSeason ?? undefined,
          latestEpisode: val.latestEpisode ?? undefined,
          releaseStatus: val.releaseStatus ?? undefined,
          releaseDay: val.releaseDay ?? undefined,
          lastAutoUpdate: val.lastAutoUpdate || 0,
          createdAt: val.createdAt || 0,
        }))
        setCatalogEntries(list)
      } else {
        setCatalogEntries([])
      }
      setCatalogLoading(false)
    })
    return () => unsub()
  }, [])

  const getCatalogEntry = (entryId: string) => catalogEntries.find((ce) => ce.id === entryId)
  const userHasInPersonal = (catalogId: string) => entries.some((e) => e.id === catalogId)

  const updateCatalogRating = async (catalogId: string, uName: string, newRating: number) => {
    if (newRating === 0) {
      await remove(ref(db, `leitura-catalogo/${catalogId}/ratings/${uName}`))
    } else {
      await set(ref(db, `leitura-catalogo/${catalogId}/ratings/${uName}`), newRating)
    }
  }

  const quickAddChapter = async (entry: LeituraEntry) => {
    if (!username) return
    const payload: Record<string, any> = {
      status: 'acompanhando',
      lastReadAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const autoComplete = entry.releaseStatus !== 'lancando'

    if (['serie', 'anime', 'dorama'].includes(entry.type)) {
      const nextEp = (entry.episode ?? 0) + 1
      if (!autoComplete && entry.totalEpisodes && nextEp > entry.totalEpisodes) {
        payload.season = (entry.season ?? 1) + 1
        payload.episode = 1
        payload.chapter = `T${payload.season} Ep 1`
      } else {
        payload.episode = nextEp
        payload.chapter = entry.season ? `T${entry.season} Ep ${nextEp}` : `Ep ${nextEp}`
        if (autoComplete && entry.totalEpisodes && nextEp >= entry.totalEpisodes) {
          payload.status = 'completo'
        }
      }
    } else if (entry.type === 'filme') {
      const nextMins = (entry.chapterNum ?? 0) + 10
      payload.chapterNum = nextMins
      let str = ''
      if (entry.episode) str += `Filme ${entry.episode}`
      str += `${str ? ' - ' : ''}${nextMins} min`
      payload.chapter = str
      if (entry.totalChapters && nextMins >= entry.totalChapters) {
        payload.status = 'completo'
      }
    } else {
      const nextNum = (entry.chapterNum ?? 0) + 1
      payload.chapterNum = nextNum
      payload.chapter = `Cap ${nextNum}`
      if (autoComplete && entry.totalChapters && nextNum >= entry.totalChapters) {
        payload.status = 'completo'
      }
    }

    if (entry.notes) payload.notes = entry.notes
    if (entry.rating) payload.rating = entry.rating
    if (entry.totalChapters) payload.totalChapters = entry.totalChapters
    if (entry.totalEpisodes) payload.totalEpisodes = entry.totalEpisodes
    if (entry.type) payload.type = entry.type
    if (entry.title) payload.title = entry.title
    if (entry.imageUrl) payload.imageUrl = entry.imageUrl
    if (entry.season) payload.season = entry.season
    if (entry.releaseStatus) payload.releaseStatus = entry.releaseStatus
    const existingSnap = await get(ref(db, `leitura/${username}/${entry.id}`))
    if (existingSnap.exists()) {
      const existing = existingSnap.val()
      Object.keys(existing).forEach((k) => {
        if (!(k in payload) && k !== 'id') payload[k] = existing[k]
      })
    }
    await update(ref(db, `leitura/${username}/${entry.id}`), payload)
  }

  const runAutoUpdates = useCallback(async () => {
    if (!username || entries.length === 0) return
    const today = new Date().getDay()
    const dayMap = [6, 0, 1, 2, 3, 4, 5]
    const todayReleaseDay = RELEASE_DAYS[dayMap[today]]

    for (const entry of entries) {
      if (
        entry.releaseDay === todayReleaseDay &&
        entry.releaseStatus === 'lancando' &&
        ['serie', 'anime', 'dorama'].includes(entry.type) &&
        entry.season != null &&
        entry.episode != null &&
        entry.totalEpisodes != null &&
        entry.episode < entry.totalEpisodes
      ) {
        const lastDate = entry.lastAutoUpdate ? new Date(entry.lastAutoUpdate).toDateString() : ''
        if (lastDate === new Date().toDateString()) continue

        const nextEp = entry.episode + 1
        const now = serverTimestamp()
        const payload: Record<string, any> = {
          episode: nextEp,
          chapter: entry.season ? `T${entry.season} Ep ${nextEp}` : `Ep ${nextEp}`,
          lastAutoUpdate: now,
          updatedAt: now,
          lastReadAt: now,
        }
        if (entry.notes) payload.notes = entry.notes
        if (entry.rating) payload.rating = entry.rating
        if (entry.totalEpisodes) payload.totalEpisodes = entry.totalEpisodes
        if (entry.type) payload.type = entry.type
        if (entry.title) payload.title = entry.title
        if (entry.imageUrl) payload.imageUrl = entry.imageUrl
        if (entry.season) payload.season = entry.season
        if (entry.releaseStatus) payload.releaseStatus = entry.releaseStatus
        if (entry.seasons) payload.seasons = entry.seasons
        if (entry.releaseDay) payload.releaseDay = entry.releaseDay

        await update(ref(db, `leitura/${username}/${entry.id}`), payload)
      }
    }
  }, [username, entries])

  useEffect(() => {
    if (!loading && entries.length > 0) {
      const timer = setTimeout(() => runAutoUpdates(), 1000)
      return () => clearTimeout(timer)
    }
  }, [entries, loading, runAutoUpdates])

  const handleEdit = (entry: LeituraEntry) => {
    setEditEntry(entry)
    setShowForm(true)
  }

  const handleSaveEntry = async (formData: {
    title: string
    type: TipoMidia
    status: LeituraStatus
    chapter: string
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
    notes: string
    imageUrl?: string
    description: string
    addToCatalog: boolean
  }) => {
    if (!username) return

    const now = serverTimestamp()
    const payload: Record<string, any> = {
      title: formData.title,
      type: formData.type,
      status: formData.status,
      chapter: formData.chapter,
      chapterNum: formData.chapterNum || null,
      totalChapters: formData.totalChapters || null,
      season: formData.season || null,
      episode: formData.episode || null,
      totalEpisodes: formData.totalEpisodes || null,
      currentPage: formData.currentPage || null,
      totalPages: formData.totalPages || null,
      releaseStatus: formData.releaseStatus || null,
      seasons: formData.seasons && formData.seasons.length > 0 ? formData.seasons : null,
      releaseDay: formData.releaseDay || null,
      rating: formData.rating || null,
      notes: formData.notes.trim(),
      imageUrl: formData.imageUrl?.trim() || null,
      updatedAt: now,
    }

    if (editEntry) {
      const existingSnap = await get(ref(db, `leitura/${username}/${editEntry.id}`))
      if (existingSnap.exists()) {
        const existing = existingSnap.val()
        if (existing.createdAt) payload.createdAt = existing.createdAt
      }
      await update(ref(db, `leitura/${username}/${editEntry.id}`), payload)

      if (canManageCatalog) {
        const isInCatalog = !!getCatalogEntry(editEntry.id)
        if (isInCatalog) {
          const catPayload: Record<string, any> = {
            title: formData.title,
            type: formData.type,
            description: formData.description.trim(),
            imageUrl: formData.imageUrl?.trim() || null,
            seasons: formData.seasons && formData.seasons.length > 0 ? formData.seasons : null,
            releaseStatus: formData.releaseStatus || null,
            releaseDay: formData.releaseDay || null,
            updatedAt: now,
          }
          if (formData.type === 'livro') {
            catPayload.totalPages = formData.totalPages || null
          } else if (formData.type === 'filme') {
            catPayload.duration = formData.totalChapters || null
          } else {
            catPayload.totalChapters = formData.totalChapters || null
          }
          await update(ref(db, `leitura-catalogo/${editEntry.id}`), catPayload)
          if (formData.rating) {
            await set(ref(db, `leitura-catalogo/${editEntry.id}/ratings/${username}`), formData.rating)
          } else {
            await remove(ref(db, `leitura-catalogo/${editEntry.id}/ratings/${username}`))
          }
        } else if (formData.addToCatalog && formData.description.trim()) {
          const catPayload: Record<string, any> = {
            title: formData.title,
            type: formData.type,
            description: formData.description.trim(),
            imageUrl: formData.imageUrl?.trim() || null,
            createdBy: username,
            releaseStatus: formData.releaseStatus || null,
            releaseDay: formData.releaseDay || null,
            createdAt: now,
            updatedAt: now,
          }
          if (formData.rating) {
            catPayload.ratings = { [username]: formData.rating }
          }
          if (formData.seasons && formData.seasons.length > 0) {
            catPayload.seasons = formData.seasons
          }
          if (formData.season) {
            catPayload.latestSeason = formData.season
          }
          if (formData.episode) {
            catPayload.latestEpisode = formData.episode
          }
          if (formData.type === 'livro') {
            catPayload.totalPages = formData.totalPages || null
          } else if (formData.type === 'filme') {
            catPayload.duration = formData.totalChapters || null
          } else {
            catPayload.totalChapters = formData.totalChapters || null
          }
          await update(ref(db, `leitura-catalogo/${editEntry.id}`), catPayload)
        }
      }
    } else {
      const newRef = push(ref(db, `leitura/${username}`))
      const newId = newRef.key!
      payload.createdAt = now
      await update(ref(db, `leitura/${username}/${newId}`), payload)

      if (canManageCatalog && formData.addToCatalog) {
        const catPayload: Record<string, any> = {
          title: formData.title,
          type: formData.type,
          description: formData.description.trim(),
          imageUrl: formData.imageUrl?.trim() || null,
          createdBy: username,
          releaseStatus: formData.releaseStatus || null,
          releaseDay: formData.releaseDay || null,
          createdAt: now,
          updatedAt: now,
        }
        if (formData.rating) {
          catPayload.ratings = { [username]: formData.rating }
        }
        if (formData.seasons && formData.seasons.length > 0) {
          catPayload.seasons = formData.seasons
        }
        if (formData.season) {
          catPayload.latestSeason = formData.season
        }
        if (formData.episode) {
          catPayload.latestEpisode = formData.episode
        }
        if (formData.type === 'livro') {
           catPayload.totalPages = formData.totalPages || null
         } else if (formData.type === 'filme') {
           catPayload.duration = formData.totalChapters || null
         } else {
           catPayload.totalChapters = formData.totalChapters || null
         }
         await set(ref(db, `leitura-catalogo/${newId}`), catPayload)
      }
    }
    setShowForm(false)
    setEditEntry(null)
  }

  const handleDelete = async (id: string) => {
    if (!username) return
    await remove(ref(db, `leitura/${username}/${id}`))
  }

  const handleDeleteCatalog = async (id: string) => {
    if (!canManageCatalog || !username) return
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
    if (['serie', 'anime', 'dorama'].includes(entry.type)) {
      if (entry.totalEpisodes) {
        payload.episode = entry.totalEpisodes
        payload.chapter = entry.season ? `T${entry.season} Ep ${entry.totalEpisodes}` : `Ep ${entry.totalEpisodes}`
      }
    } else if (entry.type === 'filme') {
      if (entry.totalChapters) {
        payload.chapterNum = entry.totalChapters
        let str = ''
        if (entry.episode) str += `Filme ${entry.episode}`
        str += `${str ? ' - ' : ''}${entry.totalChapters} min`
        payload.chapter = str
      }
    } else if (entry.type === 'livro') {
      if (entry.totalPages) {
        payload.currentPage = entry.totalPages
        payload.chapter = `Pág ${entry.totalPages}`
      }
    } else {
      if (entry.totalChapters && entry.chapterNum) {
        payload.chapter = `Cap ${entry.totalChapters}`
        payload.chapterNum = entry.totalChapters
      }
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
      totalChapters: catalogEntry.totalChapters || null,
      totalPages: catalogEntry.totalPages || null,
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
    if (catalogEntry.type === 'filme' && catalogEntry.duration) {
      payload.totalChapters = catalogEntry.duration
    }
    await update(ref(db, `leitura/${username}/${catalogEntry.id}`), payload)
  }

  const onCatalogEditSave = async (
    id: string,
    description: string,
    seasons: SeasonInfo[],
    latestSeason: number,
    latestEpisode: number,
    releaseStatus: ReleaseStatus,
    totalChapters?: number,
    totalPages?: number,
    duration?: number
  ) => {
    const now = serverTimestamp()
    await update(ref(db, `leitura-catalogo/${id}`), {
      description: description.trim(),
      seasons: seasons.length > 0 ? seasons : null,
      latestSeason: latestSeason || null,
      latestEpisode: latestEpisode || null,
      releaseStatus: releaseStatus || null,
      totalChapters: totalChapters || null,
      totalPages: totalPages || null,
      duration: duration || null,
      updatedAt: now,
    })
  }

  const runCatalogAutoUpdates = useCallback(async () => {
    if (!username || catalogEntries.length === 0) return
    const today = new Date().getDay()
    const dayMap = [6, 0, 1, 2, 3, 4, 5]
    const todayReleaseDay = RELEASE_DAYS[dayMap[today]]

    for (const entry of catalogEntries) {
      if (
        entry.releaseDay === todayReleaseDay &&
        entry.releaseStatus === 'lancando' &&
        ['serie', 'anime', 'dorama'].includes(entry.type) &&
        entry.latestEpisode != null
      ) {
        const lastDate = entry.lastAutoUpdate ? new Date(entry.lastAutoUpdate).toDateString() : ''
        if (lastDate === new Date().toDateString()) continue

        let nextEp = entry.latestEpisode + 1
        let nextSeason = entry.latestSeason || 1

        if (entry.seasons && entry.seasons.length > 0) {
          const currentSeasonInfo = entry.seasons.find((s) => s.number === nextSeason)
          if (currentSeasonInfo && nextEp > currentSeasonInfo.totalEpisodes) {
            const hasNextSeason = entry.seasons.some((s) => s.number === nextSeason + 1)
            if (hasNextSeason) {
              nextSeason += 1
              nextEp = 1
            } else {
              continue
            }
          }
        }

        const now = serverTimestamp()
        await update(ref(db, `leitura-catalogo/${entry.id}`), {
          latestEpisode: nextEp,
          latestSeason: nextSeason,
          lastAutoUpdate: now,
          updatedAt: now,
        })
      }
    }
  }, [username, catalogEntries])

  useEffect(() => {
    if (!catalogLoading && catalogEntries.length > 0) {
      const timer = setTimeout(() => runCatalogAutoUpdates(), 1500)
      return () => clearTimeout(timer)
    }
  }, [catalogEntries, catalogLoading, runCatalogAutoUpdates])

  const stats = {
    total: entries.length,
    completo: entries.filter((e) => e.status === 'completo').length,
    acompanhando: entries.filter((e) => e.status === 'acompanhando').length,
    nao_iniciado: entries.filter((e) => e.status === 'nao_iniciado').length,
  }

  return (
    <div className="animes-page">
      <div className="animes-header">
        <div className="animes-title-row">
          <h1 className="animes-title">
            <BookOpen size={24} /> Minha Biblioteca
          </h1>
          <button
            className="animes-btn animes-btn-primary"
            onClick={() => {
              setEditEntry(null)
              setShowForm(true)
            }}
          >
            <Plus size={16} /> Novo
          </button>
        </div>

        <div className="animes-main-tabs">
          <button
            className={`animes-main-tab ${activeMainTab === 'meus' ? 'active' : ''}`}
            onClick={() => {
              setActiveMainTab('meus')
              setSearchQuery('')
            }}
          >
            <BookOpen size={16} /> Meus Itens
          </button>
          <button
            className={`animes-main-tab ${activeMainTab === 'catalogo' ? 'active' : ''}`}
            onClick={() => {
              setActiveMainTab('catalogo')
            }}
          >
            <Layers size={16} /> Catálogo{' '}
            {catalogEntries.length > 0 && <span className="animes-main-tab-badge">{catalogEntries.length}</span>}
          </button>
        </div>

        {activeMainTab === 'meus' && (
          <div className="animes-stats-bar">
            <span className="animes-stat-item">
              <strong>{stats.total}</strong> total
            </span>
            <span className="animes-stat-item completo">
              <BookOpen size={12} /> <strong>{stats.completo}</strong> completos
            </span>
            <span className="animes-stat-item acompanhando">
              <BookOpen size={12} /> <strong>{stats.acompanhando}</strong> acompanhando
            </span>
            <span className="animes-stat-item nao_iniciado">
              <Layers size={12} /> <strong>{stats.nao_iniciado}</strong> não iniciados
            </span>
          </div>
        )}

        {activeMainTab === 'meus' && (
          <div className="animes-type-tabs">
            <button
              className={`animes-type-tab ${typeFilter === 'todos' ? 'active' : ''}`}
              onClick={() => setTypeFilter('todos')}
            >
              Todos
            </button>
            {TIPO_OPTIONS.map((t) => (
              <button
                key={t.value}
                className={`animes-type-tab ${typeFilter === t.value ? 'active' : ''}`}
                onClick={() => setTypeFilter(t.value)}
              >
                <span className="animes-type-tab-icon">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="animes-toolbar">
          {activeMainTab === 'meus' && (
            <div className="animes-tabs">
              {[
                { value: 'todos' as const, label: 'Todos', icon: <BookOpen size={14} /> },
                ...STATUS_OPTIONS,
              ].map((tab) => (
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
            {activeMainTab === 'meus' && (
              <select
                className="animes-filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="updated">Última atualização</option>
                <option value="title">Ordem alfabética</option>
                <option value="rating">Melhor avaliação</option>
                <option value="chapter">Mais progresso</option>
              </select>
            )}
            {activeMainTab === 'meus' && (
              <div className="animes-search">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="animes-search-input"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <ItemModal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false)
            setEditEntry(null)
          }}
          onSubmit={handleSaveEntry}
          editEntry={editEntry}
          initialCatalogDescription={editEntry ? getCatalogEntry(editEntry.id)?.description || '' : ''}
          isAlreadyInCatalog={editEntry ? !!getCatalogEntry(editEntry.id) : true}
          canManageCatalog={canManageCatalog}
        />
      )}

      {activeMainTab === 'catalogo' ? (
        <CatalogTab
          catalogEntries={catalogEntries}
          catalogLoading={catalogLoading}
          canManageCatalog={canManageCatalog}
          userHasInPersonal={userHasInPersonal}
          addToMyList={addToMyList}
          handleDeleteCatalog={handleDeleteCatalog}
          onCatalogEditSave={onCatalogEditSave}
        />
      ) : (
        <LibraryTab
          entries={entries}
          loading={loading}
          activeTab={activeTab}
          typeFilter={typeFilter}
          sortBy={sortBy}
          searchQuery={searchQuery}
          columnsRef={columnsRef}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onRatingChange={handleRatingChange}
          onQuickAddChapter={quickAddChapter}
          onMarkCompleted={markCompleted}
          getCatalogEntry={getCatalogEntry}
          onOpenNewForm={() => {
            setEditEntry(null)
            setShowForm(true)
          }}
        />
      )}
    </div>
  )
}
