import React from 'react'
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Calendar,
  Star,
  MessageCircle,
  Clock,
  CheckCircle,
} from 'lucide-react'
import {
  LeituraEntry,
  CatalogEntry,
  LeituraStatus,
  TipoMidia,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_OPTIONS,
  computeAvgRating,
  timeAgo,
  formatMinutes,
} from './types'

interface LibraryTabProps {
  entries: LeituraEntry[]
  loading: boolean
  activeTab: LeituraStatus | 'todos'
  typeFilter: TipoMidia | 'todos'
  sortBy: 'updated' | 'title' | 'rating' | 'chapter'
  searchQuery: string
  columnsRef: React.RefObject<HTMLDivElement | null>
  onEdit: (entry: LeituraEntry) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, newStatus: LeituraStatus) => void
  onRatingChange: (id: string, rating: number) => void
  onQuickAddChapter: (entry: LeituraEntry) => void
  onMarkCompleted: (entry: LeituraEntry) => void
  getCatalogEntry: (entryId: string) => CatalogEntry | undefined
  onOpenNewForm: () => void
}

const getProgressValue = (e: LeituraEntry): number => {
  if (['serie', 'anime', 'dorama'].includes(e.type)) return e.episode || 0
  if (e.type === 'livro') return e.currentPage || 0
  return e.chapterNum || 0
}

const getLastActionLabel = (type: TipoMidia) => {
  if (['serie', 'anime', 'dorama', 'filme'].includes(type)) return 'visto'
  if (type === 'jogo') return 'jogado'
  return 'lido'
}

const getProgressInfo = (e: LeituraEntry, catEntry: CatalogEntry | undefined) => {
  if (['serie', 'anime', 'dorama'].includes(e.type)) {
    if (e.seasons && e.seasons.length > 0 && e.episode != null) {
      let completedEps = 0
      let totalAllEps = 0
      for (const s of e.seasons) {
        if (s.number < (e.season || 1)) completedEps += s.totalEpisodes
        totalAllEps += s.totalEpisodes
      }
      completedEps += e.episode

      // If currently airing, adjust total to the latest released episode from the catalog
      if (e.releaseStatus === 'lancando' && catEntry && catEntry.latestEpisode != null) {
        let releasedAllEps = 0
        const catalogLatestSeason = catEntry.latestSeason || 1
        for (const s of e.seasons) {
          if (s.number < catalogLatestSeason) releasedAllEps += s.totalEpisodes
        }
        releasedAllEps += catEntry.latestEpisode
        if (releasedAllEps > 0) {
          totalAllEps = releasedAllEps
        }
      }

      if (totalAllEps > 0) {
        return {
          progress: Math.min(100, Math.round((completedEps / totalAllEps) * 100)),
          current: completedEps,
          total: totalAllEps,
        }
      }
    }
    if (e.episode != null && e.totalEpisodes != null) {
      let total = e.totalEpisodes
      if (e.releaseStatus === 'lancando' && catEntry && catEntry.latestEpisode != null) {
        total = catEntry.latestEpisode
      }
      return {
        progress: Math.min(100, Math.round((e.episode / total) * 100)),
        current: e.episode,
        total: total,
      }
    }
  }
  if (e.type === 'filme' && e.chapterNum != null && e.totalChapters != null) {
    return {
      progress: Math.min(100, Math.round((e.chapterNum / e.totalChapters) * 100)),
      current: e.chapterNum,
      total: e.totalChapters,
    }
  }
  if (e.type === 'livro' && e.currentPage != null && e.totalPages != null) {
    return {
      progress: Math.min(100, Math.round((e.currentPage / e.totalPages) * 100)),
      current: e.currentPage,
      total: e.totalPages,
    }
  }
  if (e.chapterNum != null && e.totalChapters != null) {
    return {
      progress: Math.min(100, Math.round((e.chapterNum / e.totalChapters) * 100)),
      current: e.chapterNum,
      total: e.totalChapters,
    }
  }
  return null
}

const hasNewEpisode = (e: LeituraEntry, catEntry: CatalogEntry | undefined) => {
  if (e.status !== 'acompanhando' || e.releaseStatus !== 'lancando' || !catEntry) return false
  const progressInfo = getProgressInfo(e, catEntry)
  if (!progressInfo) return false
  return progressInfo.current < progressInfo.total
}

const isUpToDate = (e: LeituraEntry, catEntry: CatalogEntry | undefined) => {
  if (e.status !== 'acompanhando') return false
  const progressInfo = getProgressInfo(e, catEntry)
  if (!progressInfo) return false
  return progressInfo.progress === 100
}

export function LibraryTab({
  entries,
  loading,
  activeTab,
  typeFilter,
  sortBy,
  searchQuery,
  columnsRef,
  onEdit,
  onDelete,
  onStatusChange,
  onRatingChange,
  onQuickAddChapter,
  onMarkCompleted,
  getCatalogEntry,
  onOpenNewForm,
}: LibraryTabProps) {

  const sortedEntries = [...entries].sort((a, b) => {
    const catA = getCatalogEntry(a.id)
    const catB = getCatalogEntry(b.id)
    const upToDateA = isUpToDate(a, catA)
    const upToDateB = isUpToDate(b, catB)

    // Up-to-date (Em dia) items go to the bottom
    if (upToDateA && !upToDateB) return 1
    if (!upToDateA && upToDateB) return -1

    // If sorting by default ("updated"), push items with newly released episodes/chapters to the top
    if (sortBy === 'updated') {
      const newA = hasNewEpisode(a, catA)
      const newB = hasNewEpisode(b, catB)

      if (newA && !newB) return -1
      if (!newA && newB) return 1
    }

    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'rating':
        return (b.rating || 0) - (a.rating || 0)
      case 'chapter':
        return getProgressValue(b) - getProgressValue(a)
      default:
        return b.updatedAt - a.updatedAt
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

  const groupedEntries: Record<LeituraStatus, LeituraEntry[]> = {
    completo: filteredEntries.filter((e) => e.status === 'completo'),
    acompanhando: filteredEntries.filter((e) => e.status === 'acompanhando'),
    nao_iniciado: filteredEntries.filter((e) => e.status === 'nao_iniciado'),
  }

  if (loading) {
    return <div className="animes-loading">Carregando...</div>
  }

  if (entries.length === 0 && activeTab === 'todos') {
    return (
      <div className="animes-empty">
        <div className="animes-empty-icon">
          <BookOpen size={48} />
        </div>
        <p>Sua biblioteca está vazia</p>
        <span className="animes-empty-sub">
          Adicione manhwas, mangás, séries e filmes para acompanhar sua leitura
        </span>
        <button className="animes-btn animes-btn-primary" onClick={onOpenNewForm}>
          <Plus size={16} /> Adicionar primeiro
        </button>
      </div>
    )
  }

  return (
    <div className="animes-columns" ref={columnsRef}>
      {(['acompanhando', 'nao_iniciado', 'completo'] as LeituraStatus[]).map((statusKey) => {
        const items = groupedEntries[statusKey]
        const show = activeTab === 'todos' || activeTab === statusKey
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
                  const catEntry = getCatalogEntry(entry.id)
                  const progressInfo = getProgressInfo(entry, catEntry)
                  const hasNewEp = hasNewEpisode(entry, catEntry)
                  const upToDate = isUpToDate(entry, catEntry)

                  return (
                    <div
                      key={entry.id}
                      className={`animes-card ${
                        entry.status === 'acompanhando' ? 'animes-card-ongoing' : ''
                      } ${entry.imageUrl ? 'has-poster' : ''} ${hasNewEp ? 'has-new-content' : ''} ${
                        upToDate ? 'is-up-to-date' : ''
                      }`}
                    >
                      {entry.imageUrl && (
                        <div className="animes-card-poster">
                          <img src={entry.imageUrl} alt={entry.title} referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="animes-card-content">
                        <div className="animes-card-header" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className={`animes-card-type animes-type-${entry.type}`}>{entry.type}</span>
                          {hasNewEp && (
                            <span className="animes-card-release-badge ongoing" style={{ animation: 'pulse 2s infinite' }}>
                              Novo Ep!
                            </span>
                          )}
                          <div className="animes-card-actions" style={{ marginLeft: 'auto' }}>
                            <button
                              className="animes-action-btn edit"
                              onClick={() => onEdit(entry)}
                              title="Editar"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              className="animes-action-btn delete"
                              onClick={() => onDelete(entry.id)}
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <h3 className="animes-card-title">{entry.title}</h3>

                        {entry.status !== 'nao_iniciado' &&
                          entry.chapter &&
                          entry.type !== 'jogo' && (
                            <div className="animes-card-chapter">
                              <FileText size={12} /> {entry.chapter}
                            </div>
                          )}
                        {entry.releaseDay &&
                          entry.status === 'acompanhando' &&
                          ['serie', 'anime', 'dorama'].includes(entry.type) && (
                            <div className="animes-card-release-day">
                              <Calendar size={11} /> {entry.releaseDay}
                            </div>
                          )}

                        {progressInfo && (
                          <div className="animes-progress-bar">
                            <div
                              className="animes-progress-fill"
                              style={{ width: `${progressInfo.progress}%` }}
                            />
                            <span className="animes-progress-text">
                              {entry.type === 'filme'
                                ? `${formatMinutes(progressInfo.current)} / ${formatMinutes(progressInfo.total)}`
                                : entry.type === 'livro'
                                ? `${progressInfo.current} / ${progressInfo.total} pág`
                                : `${progressInfo.current}/${progressInfo.total}`}{' '}
                              ({progressInfo.progress === 100 ? 'Em dia' : `${progressInfo.progress}%`})
                            </span>
                          </div>
                        )}
                        {!progressInfo && entry.totalChapters && (
                          <div className="animes-card-total-caps" style={{ fontSize: '11px', opacity: 0.7, marginBottom: '6px' }}>
                            Total: {entry.totalChapters} caps
                          </div>
                        )}
                        {!progressInfo && entry.totalPages && (
                          <div className="animes-card-total-caps" style={{ fontSize: '11px', opacity: 0.7, marginBottom: '6px' }}>
                            Total: {entry.totalPages} pág
                          </div>
                        )}

                        {entry.status !== 'nao_iniciado' &&
                          entry.type !== 'jogo' &&
                          entry.releaseStatus === 'lancando' && (
                            <div className="animes-card-release-badge ongoing">Em lançamento</div>
                          )}
                        {entry.releaseStatus === 'descontinuado' && (
                          <div className="animes-card-release-badge discontinued">Descontinuado</div>
                        )}
                        {entry.releaseStatus === 'completo' && entry.type !== 'jogo' && (
                          <div className="animes-card-release-badge completed">Completo</div>
                        )}

                        {catEntry &&
                          (() => {
                            const { avg, count } = computeAvgRating(catEntry.ratings)
                            if (count === 0) return null
                            return (
                              <div className="animes-card-catalog-rating">
                                <span className="animes-card-catalog-rating-label">Média</span>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <span
                                    key={s}
                                    className={`animes-star-display small ${
                                      s <= Math.round(avg) ? 'filled' : ''
                                    }`}
                                  >
                                    <Star size={11} fill={s <= Math.round(avg) ? '#fbbf24' : 'none'} />
                                  </span>
                                ))}
                                <span className="animes-card-catalog-rating-info">
                                  {avg.toFixed(1)} ({count})
                                </span>
                              </div>
                            )
                          })()}

                        {entry.rating !== undefined && entry.rating > 0 && (
                          <div className="animes-card-rating">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span
                                key={s}
                                className={`animes-star-display ${
                                  s <= (entry.rating || 0) ? 'filled' : ''
                                }`}
                                onClick={() => onRatingChange(entry.id, s === entry.rating ? 0 : s)}
                              >
                                <Star size={14} fill={s <= (entry.rating || 0) ? '#fbbf24' : 'none'} />
                              </span>
                            ))}
                          </div>
                        )}

                        {entry.notes && (
                          <div className="animes-card-notes">
                            <MessageCircle size={12} /> {entry.notes}
                          </div>
                        )}

                        {entry.lastReadAt && (
                          <div className="animes-card-lastread">
                            <Clock size={11} /> {getLastActionLabel(entry.type)} {timeAgo(entry.lastReadAt)}
                          </div>
                        )}

                        <div className="animes-card-footer">
                          {entry.status === 'acompanhando' && (
                            <>
                              {['manhwa', 'manga', 'manhua', 'webtoon', 'serie', 'anime', 'dorama', 'filme'].includes(
                                entry.type
                              ) && (
                                <button
                                  className="animes-btn animes-btn-small animes-btn-plus"
                                  onClick={() => onQuickAddChapter(entry)}
                                  title={
                                    ['serie', 'anime', 'dorama'].includes(entry.type)
                                      ? 'Avançar 1 episódio'
                                      : entry.type === 'filme'
                                      ? 'Avançar 10 minutos'
                                      : 'Avançar 1 capítulo'
                                  }
                                >
                                  <Plus size={11} strokeWidth={2.5} />{' '}
                                  {['serie', 'anime', 'dorama'].includes(entry.type)
                                    ? '+1 Ep'
                                    : entry.type === 'filme'
                                    ? '+10 min'
                                    : '+1 Cap'}
                                </button>
                              )}
                              <button
                                className="animes-btn animes-btn-small animes-btn-complete"
                                onClick={() => onMarkCompleted(entry)}
                                title="Marcar como completo"
                              >
                                <CheckCircle size={12} /> Completar
                              </button>
                            </>
                          )}
                          <select
                            className="animes-status-select"
                            value={entry.status}
                            onChange={(e) => onStatusChange(entry.id, e.target.value as LeituraStatus)}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
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
  )
}
