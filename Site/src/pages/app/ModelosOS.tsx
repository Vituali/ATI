// pages/ModelosOS.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ref, get, set, remove } from 'firebase/database'
import { db } from '../../services/firebase'
import { useUser } from '../../hooks/useUser'
import './ModelosOS.css'
import Modal from '../../components/ui/Modal'
import LoadingOverlay from '../../components/ui/LoadingOverlay'

// ---------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------

interface OccurrenceType {
  id: string
  text: string
}

interface UnifiedOccurrenceType {
  text: string
  id35?: string
  id53?: string
}

interface ModeloOS {
  id: string
  title: string
  text: string
  category: string
  occurrenceTypeId: string
  occurrenceTypeId_53?: string
  occurrenceTypeName?: string
  keywords?: string[]
}

// ---------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------

function gerarId(): string {
  return 'os_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function normalizarChave(txt: string): string {
  if (!txt) return ''
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function parseModelosFirebase(val: any): ModeloOS[] {
  if (!val) return []
  return Object.values(val) as ModeloOS[]
}

// ---------------------------------------------------------------
// FORM VAZIO
// ---------------------------------------------------------------

const FORM_VAZIO: Omit<ModeloOS, 'id'> = {
  title: '',
  text: '',
  category: '',
  occurrenceTypeId: '',
  occurrenceTypeId_53: '',
  occurrenceTypeName: '',
  keywords: [],
}

// ---------------------------------------------------------------
// COMPONENTE
// ---------------------------------------------------------------

export default function ModelosOS() {
  const { user } = useUser()

  const [modelos, setModelos] = useState<ModeloOS[]>([])
  const [occurrenceTypes, setOccurrenceTypes] = useState<OccurrenceType[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Filtros da listagem
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('')

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [modalModo, setModalModo] = useState<'novo' | 'editar'>('novo')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...FORM_VAZIO })
  const [keywordInput, setKeywordInput] = useState('')
  const [novaCat, setNovaCat] = useState(false)

  // Busca de tipo de ocorrência no modal
  const [occBusca, setOccBusca] = useState('')
  const [occAberto, setOccAberto] = useState(false)
  const occRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------
  // CARREGAR
  // ---------------------------------------------------------------

  useEffect(() => {
    if (!user) return
    let cancelled = false

    ;(async () => {
      try {
        const [snapModelos, snapCache35, snapCache53] = await Promise.all([get(ref(db, `modelos_os/${user.username}`)), get(ref(db, 'sgp_cache/occurrenceTypes')), get(ref(db, 'sgp_cache_53/occurrenceTypes'))])
        if (cancelled) return

        setModelos(parseModelosFirebase(snapModelos.val()))

        const raw35 = snapCache35.exists() ? snapCache35.val() : []
        const list35 = (Array.isArray(raw35) ? raw35.filter(Boolean) : Object.values(raw35)) as OccurrenceType[]

        const raw53 = snapCache53.exists() ? snapCache53.val() : []
        const list53 = (Array.isArray(raw53) ? raw53.filter(Boolean) : Object.values(raw53)) as OccurrenceType[]

        const mergedMap = new Map<string, UnifiedOccurrenceType>()

        list35.forEach((item) => {
          if (!item || !item.text) return
          const key = normalizarChave(item.text)
          mergedMap.set(key, {
            text: item.text,
            id35: item.id,
          })
        })

        list53.forEach((item) => {
          if (!item || !item.text) return
          const key = normalizarChave(item.text)
          const existing = mergedMap.get(key)
          if (existing) {
            existing.id53 = item.id
            existing.text = item.text
          } else {
            mergedMap.set(key, {
              text: item.text,
              id53: item.id,
            })
          }
        })

        const unifiedList = Array.from(mergedMap.values())
        setOccurrenceTypes(unifiedList as any)
      } catch (e) {
        console.error('Erro ao carregar:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  // Fecha dropdown de occurrence ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (occRef.current && !occRef.current.contains(e.target as Node)) {
        setOccAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ---------------------------------------------------------------
  // SALVAR / APAGAR
  // ---------------------------------------------------------------

  const salvarModelo = useCallback(
    async (modelo: ModeloOS) => {
      if (!user) return
      setSalvando(true)
      try {
        await set(ref(db, `modelos_os/${user.username}/${modelo.id}`), modelo)
      } catch (e) {
        console.error(e)
      } finally {
        setSalvando(false)
      }
    },
    [user],
  )

  const apagarModelo = useCallback(
    async (id: string) => {
      if (!user) return
      try {
        await remove(ref(db, `modelos_os/${user.username}/${id}`))
        setModelos((prev) => prev.filter((m) => m.id !== id))
      } catch (e) {
        console.error(e)
      }
    },
    [user],
  )

  // ---------------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------------

  const abrirNovo = useCallback(() => {
    setForm({ ...FORM_VAZIO })
    setKeywordInput('')
    setOccBusca('')
    setNovaCat(false)
    setModalModo('novo')
    setEditandoId(null)
    setModalAberto(true)
  }, [])

  const abrirEditar = useCallback(
    (modelo: ModeloOS) => {
      setForm({
        title: modelo.title,
        text: modelo.text,
        category: modelo.category,
        occurrenceTypeId: modelo.occurrenceTypeId,
        occurrenceTypeId_53: modelo.occurrenceTypeId_53 ?? '',
        occurrenceTypeName: modelo.occurrenceTypeName ?? '',
        keywords: modelo.keywords ?? [],
      })
      // Preenche o campo de busca com o nome do tipo atual
      let label = modelo.occurrenceTypeName ?? ''
      if (!label) {
        const tipo = (occurrenceTypes as any[]).find((o) => o.id35 === modelo.occurrenceTypeId || (modelo.occurrenceTypeId_53 && o.id53 === modelo.occurrenceTypeId_53))
        label = tipo?.text ?? ''
      }
      setOccBusca(label)
      setKeywordInput('')
      setNovaCat(false)
      setModalModo('editar')
      setEditandoId(modelo.id)
      setModalAberto(true)
    },
    [occurrenceTypes],
  )

  const handleSalvar = useCallback(async () => {
    if (!form.title.trim() || !form.text.trim() || !form.category.trim()) return

    const modelo: ModeloOS = {
      id: modalModo === 'editar' && editandoId ? editandoId : gerarId(),
      title: form.title.trim(),
      text: form.text.trim(),
      category: form.category.trim(),
      occurrenceTypeId: form.occurrenceTypeId,
      occurrenceTypeId_53: form.occurrenceTypeId_53 || '',
      occurrenceTypeName: form.occurrenceTypeName || '',
      keywords: form.keywords?.filter(Boolean) ?? [],
    }

    await salvarModelo(modelo)

    setModelos((prev) => {
      const idx = prev.findIndex((m) => m.id === modelo.id)
      if (idx >= 0) {
        const nova = [...prev]
        nova[idx] = modelo
        return nova
      }
      return [...prev, modelo]
    })

    setModalAberto(false)
  }, [form, modalModo, editandoId, salvarModelo])

  // ---------------------------------------------------------------
  // KEYWORDS
  // ---------------------------------------------------------------

  const adicionarKeyword = useCallback(() => {
    const k = keywordInput.trim().toLowerCase()
    if (!k || form.keywords?.includes(k)) return
    setForm((f) => ({ ...f, keywords: [...(f.keywords ?? []), k] }))
    setKeywordInput('')
  }, [keywordInput, form.keywords])

  const removerKeyword = useCallback((k: string) => {
    setForm((f) => ({ ...f, keywords: f.keywords?.filter((kw) => kw !== k) }))
  }, [])

  // ---------------------------------------------------------------
  // FILTROS DA LISTAGEM
  // ---------------------------------------------------------------

  const categorias = useMemo(() => {
    return [...new Set(modelos.map((m) => m.category))].sort()
  }, [modelos])

  const modelosFiltrados = useMemo(() => {
    return modelos.filter((m) => {
      const q = busca.toLowerCase()
      const matchBusca = !busca || m.title.toLowerCase().includes(q) || m.text.toLowerCase().includes(q) || m.keywords?.some((k) => k.includes(q))
      const matchCat = !catFiltro || m.category === catFiltro
      return matchBusca && matchCat
    })
  }, [modelos, busca, catFiltro])

  const agrupados = useMemo(() => {
    return categorias
      .filter((c) => !catFiltro || c === catFiltro)
      .map((cat) => ({
        cat,
        itens: modelosFiltrados.filter((m) => m.category === cat),
      }))
      .filter((g) => g.itens.length > 0)
  }, [categorias, modelosFiltrados, catFiltro])

  const occFiltrados = useMemo(() => {
    return occurrenceTypes.filter((o) => o.text.toLowerCase().includes(occBusca.toLowerCase()))
  }, [occurrenceTypes, occBusca])

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------

  if (loading) {
    return (
      <div className="modelos-os-page">
        <LoadingOverlay message="Carregando modelos..." />
      </div>
    )
  }

  return (
    <div className="modelos-os-page">
      {/* Cabeçalho */}
      <div className="modelos-os-header">
        <div>
          <h1 className="modelos-os-titulo">📝 Modelos de O.S.</h1>
          <p className="modelos-os-subtitulo">Gerencie seus templates de ordens de serviço</p>
        </div>
        <div className="modelos-os-header-acoes">
          {salvando && <span className="modelos-os-salvando">💾 Salvando...</span>}
          <button className="modelos-os-btn-novo" onClick={abrirNovo}>
            ➕ Novo modelo
          </button>
        </div>
      </div>

      {/* Toolbar de filtros */}
      <div className="modelos-os-toolbar">
        <input id="modelos-os-busca" name="modelos-os-busca" className="modelos-os-busca" type="text" placeholder="Buscar por título, texto ou keyword..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select id="modelos-os-filtro-cat" name="modelos-os-filtro-cat" className="modelos-os-filtro-cat" value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}>
          <option value="">{'Todas as categorias'}</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="modelos-os-contador">{modelosFiltrados.length} modelo(s)</span>
      </div>

      {/* Listagem agrupada por categoria */}
      {agrupados.length === 0 ? (
        <div className="modelos-os-vazio">{busca || catFiltro ? 'Nenhum modelo encontrado para esse filtro.' : 'Nenhum modelo ainda. Crie o primeiro!'}</div>
      ) : (
        agrupados.map(({ cat, itens }) => (
          <div key={cat} className="modelos-os-grupo">
            <h2 className="modelos-os-grupo-titulo">
              {cat} <span>{itens.length}</span>
            </h2>
            <div className="modelos-os-lista">
              {itens.map((modelo) => {
                const tipo = (occurrenceTypes as any[]).find((o) => o.id35 === modelo.occurrenceTypeId || (modelo.occurrenceTypeId_53 && o.id53 === modelo.occurrenceTypeId_53))
                const tipoNome = modelo.occurrenceTypeName || tipo?.text
                return (
                  <div key={modelo.id} className="modelos-os-card">
                    <div className="modelos-os-card-header">
                      <h3 className="modelos-os-card-titulo">{modelo.title}</h3>
                      <div className="modelos-os-card-acoes">
                        <button className="modelos-os-btn-editar" onClick={() => abrirEditar(modelo)}>
                          ✏️
                        </button>
                        <button className="modelos-os-btn-apagar" onClick={() => apagarModelo(modelo.id)}>
                          🗑️
                        </button>
                      </div>
                    </div>

                    <p className="modelos-os-card-texto">{modelo.text}</p>

                    <div className="modelos-os-card-meta">
                      {tipoNome && (
                        <span className="modelos-os-badge tipo" title="Tipo de ocorrência SGP">
                          🏷️ {tipoNome}
                        </span>
                      )}
                      {modelo.keywords && modelo.keywords.length > 0 && (
                        <div className="modelos-os-keywords">
                          {modelo.keywords.map((k) => (
                            <span key={k} className="modelos-os-keyword">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* MODAL */}
      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo={modalModo === 'novo' ? '➕ Novo Modelo' : '✏️ Editar Modelo'} largura="560px">
        {/* Título */}
        <div className="modelos-os-grupo-form">
          <label htmlFor="modelos-os-modal-title">Título</label>
          <input id="modelos-os-modal-title" name="title" type="text" placeholder="Ex: Sem Conexão" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
        </div>

        {/* Categoria */}
        <div className="modelos-os-grupo-form">
          <label htmlFor="modelos-os-modal-category">{'Categoria'}</label>
          {!novaCat ? (
            <div className="modal-row">
              <select id="modelos-os-modal-category" name="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">{'Selecione'}</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                className="modelos-os-btn-nova-cat"
                onClick={() => {
                  setNovaCat(true)
                  setForm({ ...form, category: '' })
                }}
              >
                + Nova
              </button>
            </div>
          ) : (
            <div className="modal-row">
              <input id="modelos-os-modal-new-category" name="category" type="text" placeholder="Nome da nova categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} autoFocus />
              <button className="modelos-os-btn-nova-cat" onClick={() => setNovaCat(false)}>
                ← Voltar
              </button>
            </div>
          )}
        </div>

        {/* Tipo de ocorrência SGP — select com busca */}
        <div className="modelos-os-grupo-form">
          <label htmlFor="modelos-os-modal-occ-busca">Tipo de Ocorrência SGP</label>
          <div className="modelos-os-occ-wrapper" ref={occRef}>
            <input
              id="modelos-os-modal-occ-busca"
              name="occ-busca"
              type="text"
              placeholder="Buscar tipo... (ex: sem acesso)"
              value={occBusca}
              onChange={(e) => {
                setOccBusca(e.target.value)
                setOccAberto(true)
              }}
              onFocus={() => setOccAberto(true)}
              className={form.occurrenceTypeId ? 'modelos-os-occ-selected' : ''}
            />
            {form.occurrenceTypeId && (
              <button
                className="modelos-os-occ-clear"
                onClick={() => {
                  setForm({
                    ...form,
                    occurrenceTypeId: '',
                    occurrenceTypeId_53: '',
                    occurrenceTypeName: '',
                  })
                  setOccBusca('')
                }}
                title="Limpar"
              >
                ✕
              </button>
            )}
            {occAberto && occFiltrados.length > 0 && (
              <ul className="modelos-os-occ-dropdown">
                {occFiltrados.map((o: any) => {
                  const isSelected = form.occurrenceTypeId === o.id35 || (form.occurrenceTypeId_53 && form.occurrenceTypeId_53 === o.id53)
                  return (
                    <li
                      key={o.text}
                      className={`modelos-os-occ-item ${isSelected ? 'ativo' : ''}`}
                      onClick={() => {
                        setForm({
                          ...form,
                          occurrenceTypeId: o.id35 || '',
                          occurrenceTypeId_53: o.id53 || '',
                          occurrenceTypeName: o.text,
                        })
                        setOccBusca(o.text)
                        setOccAberto(false)
                      }}
                    >
                      <span className="modelos-os-occ-id">
                        {o.id35 ? `#${o.id35}` : ''} {o.id53 ? `(53: #${o.id53})` : ''}
                      </span>
                      {o.text}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Texto */}
        <div className="modelos-os-grupo-form">
          <label htmlFor="modelos-os-modal-text">{'Texto da O.S.'}</label>
          <textarea id="modelos-os-modal-text" name="text" placeholder="Ex: CLIENTE SEM ACESSO. REALIZADO OS PROCEDIMENTOS E RETORNOU." value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={5} />
        </div>

        {/* Keywords */}
        <div className="modelos-os-grupo-form">
          <label htmlFor="modelos-os-modal-keyword">
            Keywords <span className="modelos-os-label-dica">(gatilhos para a extensão)</span>
          </label>
          <div className="modelos-os-keyword-input-row">
            <input id="modelos-os-modal-keyword" name="keyword" type="text" placeholder="Ex: sem internet" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarKeyword())} />
            <button className="modelos-os-btn-add-kw" onClick={adicionarKeyword}>
              + Adicionar
            </button>
          </div>
          {(form.keywords ?? []).length > 0 && (
            <div className="modelos-os-keywords-edit">
              {form.keywords!.map((k) => (
                <span key={k} className="modelos-os-keyword-edit">
                  {k}
                  <button onClick={() => removerKeyword(k)}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="modal-acoes">
          <button className="modelos-os-btn-salvar" onClick={handleSalvar} disabled={!form.title || !form.text || !form.category}>
            💾 Salvar
          </button>
          <button className="modelos-os-btn-cancelar" onClick={() => setModalAberto(false)}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  )
}
