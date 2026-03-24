// pages/OS.tsx
import { useState, useEffect, useRef } from "react";
import { ref, get, set, remove } from "firebase/database";
import { db } from "../services/firebase";
import { useUser } from "../hooks/useUser";
import "./OS.css";
import Modal from "../components/Modal";

// ---------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------

interface OccurrenceType {
  id:   string;
  text: string;
}

interface ModeloOS {
  id:               string;
  title:            string;
  text:             string;
  category:         string;
  occurrenceTypeId: string;
  keywords?:        string[];
}

// ---------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------

function gerarId(): string {
  return "os_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function parseModelosFirebase(val: any): ModeloOS[] {
  if (!val) return [];
  return Object.values(val) as ModeloOS[];
}

// ---------------------------------------------------------------
// FORM VAZIO
// ---------------------------------------------------------------

const FORM_VAZIO: Omit<ModeloOS, "id"> = {
  title:            "",
  text:             "",
  category:         "",
  occurrenceTypeId: "",
  keywords:         [],
};

// ---------------------------------------------------------------
// COMPONENTE
// ---------------------------------------------------------------

export default function OS() {
  const { user } = useUser();

  const [modelos, setModelos]               = useState<ModeloOS[]>([]);
  const [occurrenceTypes, setOccurrenceTypes] = useState<OccurrenceType[]>([]);
  const [loading, setLoading]               = useState(true);
  const [salvando, setSalvando]             = useState(false);

  // Filtros da listagem
  const [busca, setBusca]                   = useState("");
  const [catFiltro, setCatFiltro]           = useState("");

  // Modal
  const [modalAberto, setModalAberto]       = useState(false);
  const [modalModo, setModalModo]           = useState<"novo" | "editar">("novo");
  const [editandoId, setEditandoId]         = useState<string | null>(null);
  const [form, setForm]                     = useState({ ...FORM_VAZIO });
  const [keywordInput, setKeywordInput]     = useState("");
  const [novaCat, setNovaCat]               = useState(false);

  // Busca de tipo de ocorrência no modal
  const [occBusca, setOccBusca]             = useState("");
  const [occAberto, setOccAberto]           = useState(false);
  const occRef                              = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------
  // CARREGAR
  // ---------------------------------------------------------------

  useEffect(() => {
    if (!user) return;
    carregarTudo();
  }, [user]);

  // Fecha dropdown de occurrence ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (occRef.current && !occRef.current.contains(e.target as Node)) {
        setOccAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function carregarTudo() {
    if (!user) return;
    setLoading(true);
    try {
      const [snapModelos, snapCache] = await Promise.all([
        get(ref(db, `modelos_os/${user.username}`)),
        get(ref(db, "sgp_cache/occurrenceTypes")),
      ]);

      setModelos(parseModelosFirebase(snapModelos.val()));

      if (snapCache.exists()) {
        const raw = snapCache.val();
        const lista = Array.isArray(raw)
          ? raw.filter(Boolean)
          : Object.values(raw);
        setOccurrenceTypes(lista as OccurrenceType[]);
      }
    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------
  // SALVAR / APAGAR
  // ---------------------------------------------------------------

  async function salvarModelo(modelo: ModeloOS) {
    if (!user) return;
    setSalvando(true);
    try {
      await set(ref(db, `modelos_os/${user.username}/${modelo.id}`), modelo);
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  async function apagarModelo(id: string) {
    if (!user) return;
    try {
      await remove(ref(db, `modelos_os/${user.username}/${id}`));
      setModelos((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  // ---------------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------------

  function abrirNovo() {
    setForm({ ...FORM_VAZIO });
    setKeywordInput("");
    setOccBusca("");
    setNovaCat(false);
    setModalModo("novo");
    setEditandoId(null);
    setModalAberto(true);
  }

  function abrirEditar(modelo: ModeloOS) {
    setForm({
      title:            modelo.title,
      text:             modelo.text,
      category:         modelo.category,
      occurrenceTypeId: modelo.occurrenceTypeId,
      keywords:         modelo.keywords ?? [],
    });
    // Preenche o campo de busca com o nome do tipo atual
    const tipo = occurrenceTypes.find((o) => o.id === modelo.occurrenceTypeId);
    setOccBusca(tipo?.text ?? "");
    setKeywordInput("");
    setNovaCat(false);
    setModalModo("editar");
    setEditandoId(modelo.id);
    setModalAberto(true);
  }

  async function handleSalvar() {
    if (!form.title.trim() || !form.text.trim() || !form.category.trim()) return;

    const modelo: ModeloOS = {
      id:               modalModo === "editar" && editandoId ? editandoId : gerarId(),
      title:            form.title.trim(),
      text:             form.text.trim(),
      category:         form.category.trim(),
      occurrenceTypeId: form.occurrenceTypeId,
      keywords:         form.keywords?.filter(Boolean) ?? [],
    };

    await salvarModelo(modelo);

    setModelos((prev) => {
      const idx = prev.findIndex((m) => m.id === modelo.id);
      if (idx >= 0) {
        const nova = [...prev];
        nova[idx] = modelo;
        return nova;
      }
      return [...prev, modelo];
    });

    setModalAberto(false);
  }

  // ---------------------------------------------------------------
  // KEYWORDS
  // ---------------------------------------------------------------

  function adicionarKeyword() {
    const k = keywordInput.trim().toLowerCase();
    if (!k || form.keywords?.includes(k)) return;
    setForm((f) => ({ ...f, keywords: [...(f.keywords ?? []), k] }));
    setKeywordInput("");
  }

  function removerKeyword(k: string) {
    setForm((f) => ({ ...f, keywords: f.keywords?.filter((kw) => kw !== k) }));
  }

  // ---------------------------------------------------------------
  // FILTROS DA LISTAGEM
  // ---------------------------------------------------------------

  const categorias = [...new Set(modelos.map((m) => m.category))].sort();

  const modelosFiltrados = modelos.filter((m) => {
    const q = busca.toLowerCase();
    const matchBusca =
      !busca ||
      m.title.toLowerCase().includes(q) ||
      m.text.toLowerCase().includes(q)  ||
      m.keywords?.some((k) => k.includes(q));
    const matchCat = !catFiltro || m.category === catFiltro;
    return matchBusca && matchCat;
  });

  // Agrupa por categoria
  const agrupados = categorias
    .filter((c) => !catFiltro || c === catFiltro)
    .map((cat) => ({
      cat,
      itens: modelosFiltrados.filter((m) => m.category === cat),
    }))
    .filter((g) => g.itens.length > 0);

  // Occurrence types filtrados pela busca no modal
  const occFiltrados = occurrenceTypes.filter((o) =>
    o.text.toLowerCase().includes(occBusca.toLowerCase())
  );

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------

  if (loading) {
    return <div className="os-page"><div className="os-loading">Carregando modelos...</div></div>;
  }

  return (
    <div className="os-page">

      {/* Cabeçalho */}
      <div className="os-header">
        <div>
          <h1 className="os-titulo">📝 Modelos de O.S.</h1>
          <p className="os-subtitulo">Gerencie seus templates de ordens de serviço</p>
        </div>
        <div className="os-header-acoes">
          {salvando && <span className="os-salvando">💾 Salvando...</span>}
          <button className="os-btn-novo" onClick={abrirNovo}>➕ Novo modelo</button>
        </div>
      </div>

      {/* Toolbar de filtros */}
      <div className="os-toolbar">
        <input
          id="os-busca"
          name="os-busca"
          className="os-busca"
          type="text"
          placeholder="Buscar por título, texto ou keyword..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          id="os-filtro-cat"
          name="os-filtro-cat"
          className="os-filtro-cat"
          value={catFiltro}
          onChange={(e) => setCatFiltro(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="os-contador">{modelosFiltrados.length} modelo(s)</span>
      </div>

      {/* Listagem agrupada por categoria */}
      {agrupados.length === 0 ? (
        <div className="os-vazio">
          {busca || catFiltro ? "Nenhum modelo encontrado para esse filtro." : "Nenhum modelo ainda. Crie o primeiro!"}
        </div>
      ) : (
        agrupados.map(({ cat, itens }) => (
          <div key={cat} className="os-grupo">
            <h2 className="os-grupo-titulo">{cat} <span>{itens.length}</span></h2>
            <div className="os-lista">
              {itens.map((modelo) => {
                const tipo = occurrenceTypes.find((o) => o.id === modelo.occurrenceTypeId);
                return (
                  <div key={modelo.id} className="os-card">
                    <div className="os-card-header">
                      <h3 className="os-card-titulo">{modelo.title}</h3>
                      <div className="os-card-acoes">
                        <button className="os-btn-editar" onClick={() => abrirEditar(modelo)}>✏️</button>
                        <button className="os-btn-apagar" onClick={() => apagarModelo(modelo.id)}>🗑️</button>
                      </div>
                    </div>

                    <p className="os-card-texto">{modelo.text}</p>

                    <div className="os-card-meta">
                      {tipo && (
                        <span className="os-badge tipo" title="Tipo de ocorrência SGP">
                          🏷️ {tipo.text}
                        </span>
                      )}
                      {modelo.keywords && modelo.keywords.length > 0 && (
                        <div className="os-keywords">
                          {modelo.keywords.map((k) => (
                            <span key={k} className="os-keyword">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* MODAL */}
            <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={modalModo === "novo" ? "➕ Novo Modelo" : "✏️ Editar Modelo"}
        largura="560px"
      >
        {/* Título */}
        <div className="os-grupo-form">
          <label htmlFor="os-modal-title">Título</label>
          <input
            id="os-modal-title"
            name="title"
            type="text"
            placeholder="Ex: Sem Conexão"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            autoFocus
          />
        </div>

        {/* Categoria */}
        <div className="os-grupo-form">
          <label htmlFor="os-modal-category">Categoria</label>
          {!novaCat ? (
            <div className="modal-row">
              <select
                id="os-modal-category"
                name="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Selecione</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button className="os-btn-nova-cat" onClick={() => { setNovaCat(true); setForm({ ...form, category: "" }); }}>
                + Nova
              </button>
            </div>
          ) : (
            <div className="modal-row">
              <input
                id="os-modal-new-category"
                name="category"
                type="text"
                placeholder="Nome da nova categoria"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                autoFocus
              />
              <button className="os-btn-nova-cat" onClick={() => setNovaCat(false)}>← Voltar</button>
            </div>
          )}
        </div>

        {/* Tipo de ocorrência SGP — select com busca */}
        <div className="os-grupo-form">
          <label htmlFor="os-modal-occ-busca">Tipo de Ocorrência SGP</label>
          <div className="os-occ-wrapper" ref={occRef}>
            <input
              id="os-modal-occ-busca"
              name="occ-busca"
              type="text"
              placeholder="Buscar tipo... (ex: sem acesso)"
              value={occBusca}
              onChange={(e) => { setOccBusca(e.target.value); setOccAberto(true); }}
              onFocus={() => setOccAberto(true)}
              className={form.occurrenceTypeId ? "os-occ-selected" : ""}
            />
            {form.occurrenceTypeId && (
              <button
                className="os-occ-clear"
                onClick={() => { setForm({ ...form, occurrenceTypeId: "" }); setOccBusca(""); }}
                title="Limpar"
              >
                ✕
              </button>
            )}
            {occAberto && occFiltrados.length > 0 && (
              <ul className="os-occ-dropdown">
                {occFiltrados.map((o) => (
                  <li
                    key={o.id}
                    className={`os-occ-item ${form.occurrenceTypeId === o.id ? "ativo" : ""}`}
                    onClick={() => {
                      setForm({ ...form, occurrenceTypeId: o.id });
                      setOccBusca(o.text);
                      setOccAberto(false);
                    }}
                  >
                    <span className="os-occ-id">#{o.id}</span>
                    {o.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Texto */}
        <div className="os-grupo-form">
          <label htmlFor="os-modal-text">Texto da O.S.</label>
          <textarea
            id="os-modal-text"
            name="text"
            placeholder="Ex: CLIENTE SEM ACESSO. REALIZADO OS PROCEDIMENTOS E RETORNOU."
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            rows={5}
          />
        </div>

        {/* Keywords */}
        <div className="os-grupo-form">
          <label htmlFor="os-modal-keyword">Keywords <span className="os-label-dica">(gatilhos para a extensão)</span></label>
          <div className="os-keyword-input-row">
            <input
              id="os-modal-keyword"
              name="keyword"
              type="text"
              placeholder="Ex: sem internet"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionarKeyword())}
            />
            <button className="os-btn-add-kw" onClick={adicionarKeyword}>+ Adicionar</button>
          </div>
          {(form.keywords ?? []).length > 0 && (
            <div className="os-keywords-edit">
              {form.keywords!.map((k) => (
                <span key={k} className="os-keyword-edit">
                  {k}
                  <button onClick={() => removerKeyword(k)}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="modal-acoes">
          <button
            className="os-btn-salvar"
            onClick={handleSalvar}
            disabled={!form.title || !form.text || !form.category}
          >
            💾 Salvar
          </button>
          <button className="os-btn-cancelar" onClick={() => setModalAberto(false)}>
            Cancelar
          </button>
        </div>
      </Modal>

    </div>
  );
}
