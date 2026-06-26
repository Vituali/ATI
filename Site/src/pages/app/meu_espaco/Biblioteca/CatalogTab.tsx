import React, { useState } from 'react'
import {
  Layers,
  Star,
  Users,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  LayoutList,
  Info,
} from 'lucide-react'
import Modal from '../../../../components/ui/Modal'
import {
  CatalogEntry,
  SeasonInfo,
  TIPO_OPTIONS,
  TipoMidia,
  computeAvgRating,
  ReleaseStatus,
  formatMinutes,
} from './types'

interface CatalogTabProps {
  catalogEntries: CatalogEntry[]
  catalogLoading: boolean
  canManageCatalog: boolean
  userHasInPersonal: (catalogId: string) => boolean
  addToMyList: (catalogEntry: CatalogEntry) => void
  handleDeleteCatalog: (id: string) => void
  onCatalogEditSave: (
    id: string,
    description: string,
    seasons: SeasonInfo[],
    latestSeason: number,
    latestEpisode: number,
    releaseStatus: ReleaseStatus,
    totalChapters?: number,
    totalPages?: number,
    duration?: number
  ) => Promise<void>
}

export function CatalogTab({
  catalogEntries,
  catalogLoading,
  canManageCatalog,
  userHasInPersonal,
  addToMyList,
  handleDeleteCatalog,
  onCatalogEditSave,
}: CatalogTabProps) {
  const [catalogCategory, setCatalogCategory] = useState<TipoMidia | 'todos' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatalogEntry, setSelectedCatalogEntry] = useState<CatalogEntry | null>(null)
  const [catalogEditEntry, setCatalogEditEntry] = useState<CatalogEntry | null>(null)
  const [catalogEditDescription, setCatalogEditDescription] = useState('')
  const [catalogEditSeasons, setCatalogEditSeasons] = useState<SeasonInfo[]>([])
  const [catalogEditLatestSeason, setCatalogEditLatestSeason] = useState<number>(1)
  const [catalogEditLatestEpisode, setCatalogEditLatestEpisode] = useState<number>(0)
  const [catalogEditReleaseStatus, setCatalogEditReleaseStatus] = useState<ReleaseStatus>('completo')
  const [catalogEditTotalChapters, setCatalogEditTotalChapters] = useState<number | undefined>(undefined)
  const [catalogEditTotalPages, setCatalogEditTotalPages] = useState<number | undefined>(undefined)
  const [catalogEditDuration, setCatalogEditDuration] = useState<number | undefined>(undefined)

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catalogEditEntry) return
    await onCatalogEditSave(
      catalogEditEntry.id,
      catalogEditDescription,
      catalogEditSeasons,
      catalogEditLatestSeason,
      catalogEditLatestEpisode,
      catalogEditReleaseStatus,
      catalogEditTotalChapters,
      catalogEditTotalPages,
      catalogEditDuration
    )
    // Update the selected entry details if open
    if (selectedCatalogEntry && selectedCatalogEntry.id === catalogEditEntry.id) {
      setSelectedCatalogEntry({
        ...selectedCatalogEntry,
        description: catalogEditDescription.trim(),
        seasons: catalogEditSeasons.length > 0 ? catalogEditSeasons : undefined,
        latestSeason: catalogEditLatestSeason,
        latestEpisode: catalogEditLatestEpisode,
        releaseStatus: catalogEditReleaseStatus,
        totalChapters: catalogEditTotalChapters,
        totalPages: catalogEditTotalPages,
        duration: catalogEditDuration,
      })
    }
    setCatalogEditEntry(null)
  }

  const filteredCatalog = catalogEntries
    .filter((ce) => {
      if (catalogCategory && catalogCategory !== 'todos' && ce.type !== catalogCategory) return false
      const matchesSearch =
        !searchQuery ||
        ce.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ce.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => a.title.localeCompare(b.title))

  if (catalogCategory) {
    return (
      <>
        <div className="animes-catalog-header-bar">
          <button
            className="animes-btn animes-btn-secondary animes-btn-small"
            onClick={() => {
              setCatalogCategory(null)
              setSearchQuery('')
            }}
          >
            ← Voltar
          </button>
          <span className="animes-catalog-header-title">
            {catalogCategory === 'todos'
              ? 'Todos os itens'
              : TIPO_OPTIONS.find((t) => t.value === catalogCategory)?.label}
          </span>
          <div className="animes-catalog-header-search">
            <input
              type="text"
              placeholder="Buscar no catálogo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="animes-search-input"
            />
          </div>
        </div>

        {catalogLoading ? (
          <div className="animes-loading">Carregando...</div>
        ) : filteredCatalog.length === 0 ? (
          <div className="animes-empty">
            <div className="animes-empty-icon">
              <Layers size={48} />
            </div>
            <p>Catálogo vazio</p>
            {searchQuery ? (
              <span className="animes-empty-sub">
                Nenhum item encontrado para "<strong>{searchQuery}</strong>"
              </span>
            ) : (
              <span className="animes-empty-sub">Nenhum item compartilhado no catálogo ainda</span>
            )}
          </div>
        ) : (
          <div className="animes-catalog-grid">
            {filteredCatalog.map((catEntry) => {
              const inMyList = userHasInPersonal(catEntry.id)
              return (
                <div
                  key={catEntry.id}
                  className={`animes-catalog-card ${catEntry.imageUrl ? 'has-poster' : ''}`}
                  onClick={() => setSelectedCatalogEntry(catEntry)}
                >
                  {catEntry.imageUrl && (
                    <div className="animes-catalog-poster">
                      <img src={catEntry.imageUrl} alt={catEntry.title} referrerPolicy="no-referrer" />
                      {catEntry.seasons && catEntry.seasons.length > 0 && ['serie', 'anime', 'dorama'].includes(catEntry.type) && (
                        <div className="animes-catalog-poster-seasons">
                          {catEntry.seasons.length} temporada{catEntry.seasons.length > 1 ? 's' : ''} ·{' '}
                          {catEntry.seasons.reduce((a, s) => a + s.totalEpisodes, 0)} eps
                        </div>
                      )}
                      {catEntry.type === 'livro' && catEntry.totalPages && (
                        <div className="animes-catalog-poster-seasons">
                          {catEntry.totalPages} páginas
                        </div>
                      )}
                      {catEntry.type === 'filme' && catEntry.duration && (
                        <div className="animes-catalog-poster-seasons">
                          {formatMinutes(catEntry.duration)}
                        </div>
                      )}
                      {['manhwa', 'manga', 'manhua', 'webtoon'].includes(catEntry.type) && catEntry.totalChapters && (
                        <div className="animes-catalog-poster-seasons">
                          {catEntry.totalChapters} capítulos
                        </div>
                      )}
                    </div>
                  )}
                  <div className="animes-catalog-body">
                    <div className="animes-catalog-header" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className={`animes-card-type animes-type-${catEntry.type}`}>{catEntry.type}</span>
                      {catEntry.releaseStatus && (
                        <span className={`animes-card-release-badge ${catEntry.releaseStatus === 'lancando' ? 'ongoing' : catEntry.releaseStatus === 'descontinuado' ? 'discontinued' : 'completed'}`}>
                          {catEntry.releaseStatus === 'lancando' ? 'Lançando' : catEntry.releaseStatus === 'descontinuado' ? 'Descontinuado' : 'Completo'}
                        </span>
                      )}
                      {canManageCatalog && (
                        <button
                          className="animes-action-btn delete"
                          style={{ marginLeft: 'auto' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCatalog(catEntry.id)
                          }}
                          title="Remover do catálogo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <h3 className="animes-catalog-title">{catEntry.title}</h3>
                    {catEntry.description && <p className="animes-catalog-description">{catEntry.description}</p>}
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
                              <span className="animes-catalog-rating-info">
                                {avg.toFixed(1)} (<Users size={11} /> {count})
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                    {catEntry.latestEpisode != null && (
                      <div className="animes-catalog-latest-ep">
                        Último:{' '}
                        {catEntry.latestSeason
                          ? `T${catEntry.latestSeason} Ep ${catEntry.latestEpisode}`
                          : `Ep ${catEntry.latestEpisode}`}
                        {catEntry.seasons && catEntry.seasons.length > 0 && (
                          <span style={{ opacity: 0.7, fontSize: '0.9em' }}>
                            {' '}/ {catEntry.seasons.reduce((a, s) => a + s.totalEpisodes, 0)} eps
                          </span>
                        )}
                      </div>
                    )}
                    <div className="animes-catalog-actions">
                      {inMyList ? (
                        <span className="animes-catalog-added">
                          <CheckCircle size={14} /> Adicionado
                        </span>
                      ) : (
                        <button
                          className="animes-btn animes-btn-primary animes-btn-small"
                          onClick={(e) => {
                            e.stopPropagation()
                            addToMyList(catEntry)
                          }}
                        >
                          <Plus size={12} /> Adicionar à minha lista
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Modal
          aberto={!!selectedCatalogEntry}
          onFechar={() => setSelectedCatalogEntry(null)}
          titulo={selectedCatalogEntry?.title || ''}
          largura="620px"
        >
          {selectedCatalogEntry && (
            <div className="animes-catalog-detail">
              {selectedCatalogEntry.imageUrl && (
                <div className="animes-catalog-detail-poster" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <img src={selectedCatalogEntry.imageUrl} alt={selectedCatalogEntry.title} referrerPolicy="no-referrer" />
                  
                  {selectedCatalogEntry.seasons &&
                    selectedCatalogEntry.seasons.length > 0 &&
                    ['serie', 'anime', 'dorama'].includes(selectedCatalogEntry.type) && (
                      <div className="animes-catalog-detail-seasons" style={{ marginTop: '0px' }}>
                        <span className="animes-catalog-detail-label">Temporadas</span>
                        <div className="animes-catalog-detail-season-list">
                          {selectedCatalogEntry.seasons.map((s) => (
                            <span key={s.number} className="animes-catalog-detail-season-badge">
                              T{s.number}: {s.totalEpisodes} eps
                            </span>
                          ))}
                        </div>
                        <span className="animes-catalog-detail-total">
                          Total:{' '}
                          {selectedCatalogEntry.seasons.reduce((a, s) => a + s.totalEpisodes, 0)} episódios
                        </span>
                      </div>
                    )}
                  {selectedCatalogEntry.type === 'livro' && selectedCatalogEntry.totalPages && (
                    <div className="animes-catalog-detail-seasons" style={{ marginTop: '0px' }}>
                      <span className="animes-catalog-detail-label">Páginas</span>
                      <span className="animes-catalog-detail-total">
                        Total: {selectedCatalogEntry.totalPages} páginas
                      </span>
                    </div>
                  )}
                  {selectedCatalogEntry.type === 'filme' && selectedCatalogEntry.duration && (
                    <div className="animes-catalog-detail-seasons" style={{ marginTop: '0px' }}>
                      <span className="animes-catalog-detail-label">Duração</span>
                      <span className="animes-catalog-detail-total">
                        Duração: {formatMinutes(selectedCatalogEntry.duration)}
                      </span>
                    </div>
                  )}
                  {['manhwa', 'manga', 'manhua', 'webtoon'].includes(selectedCatalogEntry.type) && selectedCatalogEntry.totalChapters && (
                    <div className="animes-catalog-detail-seasons" style={{ marginTop: '0px' }}>
                      <span className="animes-catalog-detail-label">Capítulos</span>
                      <span className="animes-catalog-detail-total">
                        Total: {selectedCatalogEntry.totalChapters} capítulos
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="animes-catalog-detail-body">
                <div className="animes-catalog-detail-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`animes-card-type animes-type-${selectedCatalogEntry.type}`}>
                    {selectedCatalogEntry.type}
                  </span>
                  {selectedCatalogEntry.releaseStatus && (
                    <span className={`animes-card-release-badge ${selectedCatalogEntry.releaseStatus === 'lancando' ? 'ongoing' : selectedCatalogEntry.releaseStatus === 'descontinuado' ? 'discontinued' : 'completed'}`}>
                      {selectedCatalogEntry.releaseStatus === 'lancando' ? 'Lançando' : selectedCatalogEntry.releaseStatus === 'descontinuado' ? 'Descontinuado' : 'Completo'}
                    </span>
                  )}
                  {canManageCatalog && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                      <button
                        className="animes-action-btn edit"
                        onClick={() => {
                          setCatalogEditEntry(selectedCatalogEntry)
                          setCatalogEditDescription(selectedCatalogEntry.description)
                          setCatalogEditSeasons(selectedCatalogEntry.seasons || [])
                          setCatalogEditLatestSeason(selectedCatalogEntry.latestSeason || 1)
                          setCatalogEditLatestEpisode(selectedCatalogEntry.latestEpisode || 0)
                          setCatalogEditReleaseStatus(selectedCatalogEntry.releaseStatus || 'completo')
                          setCatalogEditTotalChapters(selectedCatalogEntry.totalChapters)
                          setCatalogEditTotalPages(selectedCatalogEntry.totalPages)
                          setCatalogEditDuration(selectedCatalogEntry.duration)
                        }}
                        title="Editar catálogo"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="animes-action-btn delete"
                        onClick={() => {
                          handleDeleteCatalog(selectedCatalogEntry.id)
                          setSelectedCatalogEntry(null)
                        }}
                        title="Remover do catálogo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {selectedCatalogEntry.description && (
                  <div className="animes-catalog-detail-desc">
                    <Info size={14} /> <span>{selectedCatalogEntry.description}</span>
                  </div>
                )}
                {selectedCatalogEntry.latestEpisode != null && (
                  <div className="animes-catalog-detail-latest">
                    <span className="animes-catalog-detail-label">Último episódio</span>
                    <span className="animes-catalog-detail-latest-ep">
                      {selectedCatalogEntry.latestSeason
                        ? `T${selectedCatalogEntry.latestSeason} Ep ${selectedCatalogEntry.latestEpisode}`
                        : `Ep ${selectedCatalogEntry.latestEpisode}`}
                      {selectedCatalogEntry.seasons && selectedCatalogEntry.seasons.length > 0 && (
                        <span style={{ opacity: 0.7, fontSize: '0.9em', marginLeft: '6px' }}>
                          (de {selectedCatalogEntry.seasons.reduce((a, s) => a + s.totalEpisodes, 0)} eps)
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {(() => {
                  const { avg, count } = computeAvgRating(selectedCatalogEntry.ratings)
                  const ratings = selectedCatalogEntry.ratings || {}
                  const rEntries = Object.entries(ratings)
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
                          {count > 0 && (
                            <span className="animes-catalog-detail-avg-num">
                              {avg.toFixed(1)} ({count} {count === 1 ? 'avaliação' : 'avaliações'})
                            </span>
                          )}
                        </div>
                      </div>
                      {rEntries.length > 0 && (
                        <div className="animes-catalog-detail-users">
                          <span className="animes-catalog-detail-label">Avaliações individuais</span>
                          {rEntries.map(([userName, userRating]) => (
                            <div key={userName} className="animes-catalog-detail-user">
                              <span className="animes-catalog-detail-user-name">{userName}</span>
                              <div className="animes-catalog-detail-user-stars">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <span
                                    key={s}
                                    className={`animes-star-display small ${s <= userRating ? 'filled' : ''}`}
                                  >
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
                    <span className="animes-catalog-added">
                      <CheckCircle size={16} /> Adicionado à sua lista
                    </span>
                  ) : (
                    <button
                      className="animes-btn animes-btn-primary"
                      onClick={() => {
                        addToMyList(selectedCatalogEntry)
                        setSelectedCatalogEntry(null)
                      }}
                    >
                      <Plus size={16} /> Adicionar à minha lista
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        <Modal
          aberto={!!catalogEditEntry}
          onFechar={() => setCatalogEditEntry(null)}
          titulo="Editar Catálogo"
          largura="520px"
        >
          {catalogEditEntry && (
            <form onSubmit={handleEditSave} style={{ margin: 0, padding: 0 }}>
              <div className="animes-form-grid">
                <div className="animes-form-group full-width">
                  <label htmlFor="catalog-descricao">Descrição / Sinopse</label>
                  <textarea
                    id="catalog-descricao"
                    name="catalogDescricao"
                    value={catalogEditDescription}
                    onChange={(e) => setCatalogEditDescription(e.target.value)}
                    placeholder="Sinopse da obra..."
                    rows={3}
                  />
                </div>
                {['serie', 'anime', 'dorama'].includes(catalogEditEntry.type) && (
                  <div className="animes-form-group full-width">
                    <label>Temporadas</label>
                    <div className="animes-seasons-list">
                      {catalogEditSeasons.map((s, i) => (
                        <div key={i} className="animes-season-row">
                          <span className="animes-season-label">T{s.number}</span>
                          <input
                            id={`catalog-season-${i}`}
                            name={`catalogSeason${i}`}
                            type="number"
                            min={0}
                            className="animes-season-input"
                            value={s.totalEpisodes || ''}
                            onChange={(e) => {
                              const updated = [...catalogEditSeasons]
                              updated[i] = {
                                ...updated[i],
                                totalEpisodes: e.target.value ? Number(e.target.value) : 0,
                              }
                              setCatalogEditSeasons(updated)
                            }}
                            placeholder="eps"
                          />
                          <button
                            type="button"
                            className="animes-season-remove"
                            onClick={() =>
                              setCatalogEditSeasons(catalogEditSeasons.filter((_, idx) => idx !== i))
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="animes-btn animes-btn-small animes-season-add"
                        onClick={() => {
                          const nextNum =
                            catalogEditSeasons.length > 0
                              ? Math.max(...catalogEditSeasons.map((s) => s.number)) + 1
                              : 1
                          setCatalogEditSeasons([
                            ...catalogEditSeasons,
                            { number: nextNum, totalEpisodes: 0 },
                          ])
                        }}
                      >
                        + Adicionar temporada
                      </button>
                    </div>
                  </div>
                )}
                {['serie', 'anime', 'dorama'].includes(catalogEditEntry.type) && (
                  <>
                    <div className="animes-form-group">
                      <label htmlFor="catalog-ultima-temporada">Último ep lançado - Temporada</label>
                      <input
                        id="catalog-ultima-temporada"
                        name="catalogUltimaTemporada"
                        type="number"
                        min={1}
                        value={catalogEditLatestSeason}
                        onChange={(e) => setCatalogEditLatestSeason(e.target.value ? Number(e.target.value) : 1)}
                      />
                    </div>
                    <div className="animes-form-group">
                      <label htmlFor="catalog-ultimo-episodio">Último ep lançado - Episódio</label>
                      <input
                        id="catalog-ultimo-episodio"
                        name="catalogUltimoEpisodio"
                        type="number"
                        min={0}
                        value={catalogEditLatestEpisode}
                        onChange={(e) => setCatalogEditLatestEpisode(e.target.value ? Number(e.target.value) : 0)}
                      />
                    </div>
                  </>
                )}
                {['serie', 'anime', 'dorama'].includes(catalogEditEntry.type) && (
                  <div className="animes-form-group full-width">
                    <label>Status da obra</label>
                    <div className="animes-release-status-group">
                      {[
                        { value: 'completo' as ReleaseStatus, label: 'Completo' },
                        { value: 'lancando' as ReleaseStatus, label: 'Lançando' },
                        { value: 'descontinuado' as ReleaseStatus, label: 'Descontinuado' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`animes-release-status-btn ${catalogEditReleaseStatus === opt.value ? 'active' : ''}`}
                          onClick={() => setCatalogEditReleaseStatus(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {catalogEditEntry.type === 'livro' && (
                  <div className="animes-form-group full-width">
                    <label htmlFor="catalog-total-paginas">Total de páginas</label>
                    <input
                      id="catalog-total-paginas"
                      name="catalogTotalPaginas"
                      type="number"
                      min={0}
                      value={catalogEditTotalPages ?? ''}
                      onChange={(e) => setCatalogEditTotalPages(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ex: 300"
                    />
                  </div>
                )}
                {catalogEditEntry.type === 'filme' && (
                  <div className="animes-form-group full-width">
                    <label htmlFor="catalog-duracao">Duração em minutos</label>
                    <input
                      id="catalog-duracao"
                      name="catalogDuracao"
                      type="number"
                      min={0}
                      value={catalogEditDuration ?? ''}
                      onChange={(e) => setCatalogEditDuration(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ex: 120"
                    />
                  </div>
                )}
                {['manhwa', 'manga', 'manhua', 'webtoon'].includes(catalogEditEntry.type) && (
                  <div className="animes-form-group full-width">
                    <label htmlFor="catalog-total-capitulos">Total de capítulos</label>
                    <input
                      id="catalog-total-capitulos"
                      name="catalogTotalCapitulos"
                      type="number"
                      min={0}
                      value={catalogEditTotalChapters ?? ''}
                      onChange={(e) => setCatalogEditTotalChapters(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ex: 200"
                    />
                  </div>
                )}
                {catalogEditEntry.type !== 'jogo' && !['serie', 'anime', 'dorama'].includes(catalogEditEntry.type) && (
                  <div className="animes-form-group full-width">
                    <label>Status da obra</label>
                    <div className="animes-release-status-group">
                      {[
                        { value: 'completo' as ReleaseStatus, label: 'Completo' },
                        { value: 'lancando' as ReleaseStatus, label: 'Lançando' },
                        { value: 'descontinuado' as ReleaseStatus, label: 'Descontinuado' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`animes-release-status-btn ${catalogEditReleaseStatus === opt.value ? 'active' : ''}`}
                          onClick={() => setCatalogEditReleaseStatus(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="animes-form-actions">
                <button type="submit" className="animes-btn animes-btn-primary">
                  Salvar
                </button>
                <button
                  type="button"
                  className="animes-btn animes-btn-secondary"
                  onClick={() => setCatalogEditEntry(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </Modal>
      </>
    )
  }

  return (
    <div className="animes-category-grid">
      <h2 className="animes-category-title">Escolha uma categoria</h2>
      <p className="animes-category-subtitle">Selecione o tipo de conteúdo para explorar o catálogo</p>
      <div className="animes-category-cards">
        {TIPO_OPTIONS.map((t) => (
          <button key={t.value} className="animes-category-card" onClick={() => setCatalogCategory(t.value)}>
            <span className="animes-category-card-icon">{t.icon}</span>
            <span className="animes-category-card-label">{t.label}</span>
          </button>
        ))}
        <button
          className="animes-category-card animes-category-card-all"
          onClick={() => setCatalogCategory('todos')}
        >
          <span className="animes-category-card-icon">
            <LayoutList size={32} />
          </span>
          <span className="animes-category-card-label">Todos</span>
        </button>
      </div>
    </div>
  )
}
