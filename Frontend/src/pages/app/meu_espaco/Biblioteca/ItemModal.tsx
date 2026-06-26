import React, { useState } from 'react'
import { Info } from 'lucide-react'
import Modal from '../../../../components/ui/Modal'
import { StarRating } from './StarRating'
import {
  LeituraStatus,
  TipoMidia,
  ReleaseStatus,
  SeasonInfo,
  LeituraEntry,
  STATUS_OPTIONS,
  TIPO_OPTIONS,
  RELEASE_DAYS,
} from './types'

interface ItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: {
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
  }) => void
  editEntry: LeituraEntry | null
  initialCatalogDescription?: string
  isAlreadyInCatalog: boolean
  canManageCatalog: boolean
}

export function ItemModal({
  isOpen,
  onClose,
  onSubmit,
  editEntry,
  initialCatalogDescription = '',
  isAlreadyInCatalog,
  canManageCatalog,
}: ItemModalProps) {
  const [formTitle, setFormTitle] = useState(editEntry ? editEntry.title : '')
  const [formType, setFormType] = useState<TipoMidia>(editEntry ? editEntry.type : 'manhwa')
  const [formStatus, setFormStatus] = useState<LeituraStatus>(editEntry ? editEntry.status : 'acompanhando')
  const [formChapterNum, setFormChapterNum] = useState<number | undefined>(editEntry?.chapterNum)
  const [formTotalChapters, setFormTotalChapters] = useState<number | undefined>(editEntry?.totalChapters)
  const [formSeason, setFormSeason] = useState<number | undefined>(editEntry?.season)
  const [formEpisode, setFormEpisode] = useState<number | undefined>(editEntry?.episode)
  const [formTotalEpisodes, setFormTotalEpisodes] = useState<number | undefined>(editEntry?.totalEpisodes)
  const [formCurrentPage, setFormCurrentPage] = useState<number | undefined>(editEntry?.currentPage)
  const [formTotalPages, setFormTotalPages] = useState<number | undefined>(editEntry?.totalPages)
  const [formReleaseStatus, setFormReleaseStatus] = useState<ReleaseStatus>(editEntry?.releaseStatus || 'completo')
  const [formSeasons, setFormSeasons] = useState<SeasonInfo[]>(editEntry?.seasons || [])
  const [formReleaseDay, setFormReleaseDay] = useState(editEntry?.releaseDay || '')
  const [formRating, setFormRating] = useState(editEntry?.rating || 0)
  const [formNotes, setFormNotes] = useState(editEntry?.notes || '')
  const [formImageUrl, setFormImageUrl] = useState(editEntry?.imageUrl || '')
  const [formDescription, setFormDescription] = useState(initialCatalogDescription)
  const [addToCatalog, setAddToCatalog] = useState(editEntry ? isAlreadyInCatalog : true)

  const getChapterStr = (type: TipoMidia, season?: number, ep?: number, page?: number, chNum?: number) => {
    switch (type) {
      case 'serie':
      case 'anime':
      case 'dorama':
        if (season && ep) return `T${season} Ep ${ep}`
        if (ep) return `Ep ${ep}`
        return ''
      case 'livro':
        return page ? `Pág ${page}` : ''
      case 'filme': {
        let str = ''
        if (ep) str += `Filme ${ep}`
        if (chNum) str += `${str ? ' - ' : ''}${chNum} min`
        return str
      }
      case 'jogo':
        return ''
      default:
        return chNum ? `Cap ${chNum}` : ''
    }
  }

  const handleSeasonSelectChange = (newSeason: number | undefined) => {
    setFormSeason(newSeason)
    if (newSeason && formSeasons.length > 0) {
      const match = formSeasons.find((s) => s.number === newSeason)
      if (match && match.totalEpisodes) {
        setFormTotalEpisodes(match.totalEpisodes)
      }
    }
  }

  const updateSeasonEpisodes = (index: number, val: number) => {
    const updated = [...formSeasons]
    updated[index] = { ...updated[index], totalEpisodes: val }
    setFormSeasons(updated)
    if (formSeason === updated[index].number) {
      setFormTotalEpisodes(val)
    }
  }

  const handleRemoveSeason = (index: number, sNum: number) => {
    const updated = formSeasons.filter((_, idx) => idx !== index)
    setFormSeasons(updated)
    if (formSeason === sNum) {
      setFormTotalEpisodes(undefined)
    }
  }

  const handleAddSeason = () => {
    const nextNum = formSeasons.length > 0 ? Math.max(...formSeasons.map((s) => s.number)) + 1 : 1
    setFormSeasons([...formSeasons, { number: nextNum, totalEpisodes: 0 }])
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    onSubmit({
      title: formTitle.trim(),
      type: formType,
      status: formStatus,
      chapter: getChapterStr(formType, formSeason, formEpisode, formCurrentPage, formChapterNum),
      chapterNum: formChapterNum,
      totalChapters: formTotalChapters,
      season: formSeason,
      episode: formEpisode,
      totalEpisodes: formTotalEpisodes,
      currentPage: formCurrentPage,
      totalPages: formTotalPages,
      releaseStatus: formReleaseStatus,
      seasons: formSeasons,
      releaseDay: formReleaseDay,
      rating: formRating,
      notes: formNotes,
      imageUrl: formImageUrl,
      description: formDescription,
      addToCatalog,
    })
  }

  return (
    <Modal aberto={isOpen} onFechar={onClose} titulo={editEntry ? 'Editar Item' : 'Novo Item'} largura="560px">
      <form onSubmit={handleFormSubmit} style={{ margin: 0, padding: 0 }}>
        <div className="animes-form-grid">
          <div className="animes-form-group">
            <label htmlFor="item-titulo">Título *</label>
            <input
              id="item-titulo"
              name="itemTitulo"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ex: Clones Farm"
              required
            />
          </div>
          <div className="animes-form-group">
            <label htmlFor="item-tipo">Tipo</label>
            <select id="item-tipo" name="itemTipo" value={formType} onChange={(e) => setFormType(e.target.value as TipoMidia)}>
              {TIPO_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="animes-form-group">
            <label htmlFor="item-status">Status</label>
            <select id="item-status" name="itemStatus" value={formStatus} onChange={(e) => setFormStatus(e.target.value as LeituraStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {['serie', 'anime', 'dorama'].includes(formType) ? (
            <>
              <div className="animes-form-group">
                <label htmlFor="item-temporada">Temporada</label>
                <input
                  id="item-temporada"
                  name="itemTemporada"
                  type="number"
                  min={0}
                  value={formSeason ?? ''}
                  onChange={(e) => handleSeasonSelectChange(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="1"
                />
              </div>
              <div className="animes-form-group">
                <label htmlFor="item-episodio">Episódio</label>
                <input
                  id="item-episodio"
                  name="itemEpisodio"
                  type="number"
                  min={0}
                  value={formEpisode ?? ''}
                  onChange={(e) => setFormEpisode(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="5"
                />
              </div>
              <div className="animes-form-group full-width">
                <label>Temporadas</label>
                <div className="animes-seasons-list">
                  {formSeasons.map((s, i) => (
                    <div key={i} className="animes-season-row">
                      <span className="animes-season-label">T{s.number}</span>
                      <input
                        id={`item-season-${i}`}
                        name={`itemSeason${i}`}
                        type="number"
                        min={0}
                        className="animes-season-input"
                        value={s.totalEpisodes || ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : 0
                          updateSeasonEpisodes(i, val)
                        }}
                        placeholder="eps"
                      />
                      <button
                        type="button"
                        className="animes-season-remove"
                        onClick={() => handleRemoveSeason(i, s.number)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="animes-btn animes-btn-small animes-season-add"
                    onClick={handleAddSeason}
                  >
                    + Adicionar temporada
                  </button>
                </div>
              </div>
              <div className="animes-form-group">
                <label htmlFor="item-dia-lancamento">Dia de lançamento</label>
                <select id="item-dia-lancamento" name="itemDiaLancamento" value={formReleaseDay} onChange={(e) => setFormReleaseDay(e.target.value)}>
                  <option value="">—</option>
                  {RELEASE_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : formType === 'livro' ? (
            <>
              <div className="animes-form-group">
                <label htmlFor="item-pagina-atual">Página atual</label>
                <input
                  id="item-pagina-atual"
                  name="itemPaginaAtual"
                  type="number"
                  min={0}
                  value={formCurrentPage ?? ''}
                  onChange={(e) => setFormCurrentPage(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="150"
                />
              </div>
              <div className="animes-form-group">
                <label htmlFor="item-total-paginas">Total de páginas</label>
                <input
                  id="item-total-paginas"
                  name="itemTotalPaginas"
                  type="number"
                  min={0}
                  value={formTotalPages ?? ''}
                  onChange={(e) => setFormTotalPages(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 300"
                />
              </div>
            </>
          ) : formType === 'filme' ? (
            <>
              <div className="animes-form-group">
                <label htmlFor="item-parte">Parte / Sequência (ex: 1, 2...)</label>
                <input
                  id="item-parte"
                  name="itemParte"
                  type="number"
                  min={1}
                  value={formEpisode ?? ''}
                  onChange={(e) => setFormEpisode(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 1"
                />
              </div>
              <div className="animes-form-group">
                <label htmlFor="item-minutos-assistidos">Minutos assistidos</label>
                <input
                  id="item-minutos-assistidos"
                  name="itemMinutosAssistidos"
                  type="number"
                  min={0}
                  value={formChapterNum ?? ''}
                  onChange={(e) => setFormChapterNum(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 90"
                />
              </div>
              <div className="animes-form-group">
                <label htmlFor="item-duracao">Duração em minutos</label>
                <input
                  id="item-duracao"
                  name="itemDuracao"
                  type="number"
                  min={0}
                  value={formTotalChapters ?? ''}
                  onChange={(e) => setFormTotalChapters(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 120"
                />
              </div>
            </>
          ) : formType === 'jogo' ? null : (
            <>
              <div className="animes-form-group">
                <label htmlFor="item-capitulo">Capítulo</label>
                <input
                  id="item-capitulo"
                  name="itemCapitulo"
                  type="number"
                  min={0}
                  value={formChapterNum ?? ''}
                  onChange={(e) => setFormChapterNum(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="129"
                />
              </div>
              <div className="animes-form-group">
                <label htmlFor="item-total-capitulos">Total de capítulos</label>
                <input
                  id="item-total-capitulos"
                  name="itemTotalCapitulos"
                  type="number"
                  min={0}
                  value={formTotalChapters ?? ''}
                  onChange={(e) => setFormTotalChapters(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ex: 200"
                />
              </div>
            </>
          )}
          {formType !== 'jogo' && (
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
                    className={`animes-release-status-btn ${formReleaseStatus === opt.value ? 'active' : ''}`}
                    onClick={() => setFormReleaseStatus(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="animes-form-group">
            <label>Avaliação</label>
            <StarRating value={formRating} onChange={setFormRating} />
          </div>
          <div className="animes-form-group full-width">
            <label htmlFor="item-url-imagem">URL da Imagem (Poster)</label>
            <input
              id="item-url-imagem"
              name="itemUrlImagem"
              type="url"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://exemplo.com/poster.jpg"
            />
          </div>
          <div className="animes-form-group full-width">
            <label htmlFor="item-notas">Notas</label>
            <textarea
              id="item-notas"
              name="itemNotas"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Notas pessoais..."
              rows={2}
            />
          </div>
          {canManageCatalog && (
            <div className="animes-form-group full-width">
              <label htmlFor="item-descricao">
                <Info size={12} /> Descrição / Sinopse
              </label>
              <textarea
                id="item-descricao"
                name="itemDescricao"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Sinopse da obra..."
                rows={3}
              />
              {(!editEntry || !isAlreadyInCatalog) && (
                <label className="animes-form-checkbox">
                  <input
                    id="item-add-catalog"
                    name="itemAddCatalog"
                    type="checkbox"
                    checked={addToCatalog}
                    onChange={(e) => setAddToCatalog(e.target.checked)}
                  />
                  Compartilhar no catálogo
                </label>
              )}
            </div>
          )}
        </div>
        <div className="animes-form-actions">
          <button type="submit" className="animes-btn animes-btn-primary">
            {editEntry ? 'Salvar' : 'Adicionar'}
          </button>
          <button type="button" className="animes-btn animes-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
