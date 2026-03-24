// pages/Chat.tsx
import { useState, useEffect, useRef } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "../services/firebase";
import { useUser } from "../hooks/useUser";
import "./Chat.css";
import LoadingOverlay from "../components/LoadingOverlay";
import Modal from "../components/Modal";

// ---------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------

export interface Resposta {
  category:    string;
  subCategory: string;
  title:       string;
  text:        string;
}

// ---------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------

function aplicarMarcadores(texto: string): string {
  const h = new Date().getHours();
  const saudacao  = h >= 5 && h < 12 ? "Bom dia"  : h >= 12 && h < 18 ? "Boa tarde"  : "Boa noite";
  const despedida = h >= 5 && h < 12 ? "Tenha um ótimo dia" : h >= 12 && h < 18 ? "Tenha uma ótima tarde" : "Tenha uma ótima noite";
  return texto.replace(/\[saudacao\]/gi, saudacao).replace(/\[despedida\]/gi, despedida);
}

function parseArrayFirebase(val: any): Resposta[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean) as Resposta[];
  return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map((k) => val[k]).filter(Boolean) as Resposta[];
}

async function copiar(texto: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(texto); return true; }
  catch { return false; }
}

const MODAL_VAZIO: Resposta = { category: "quick_reply", subCategory: "", title: "", text: "" };

// ---------------------------------------------------------------
// COMPONENTE
// ---------------------------------------------------------------

export default function Chat() {
  const { user } = useUser();

  const [respostas, setRespostas]         = useState<Resposta[]>([]);
  const [ordemCats, setOrdemCats]         = useState<string[]>([]);
  const [loading, setLoading]             = useState(true);
  const [salvando, setSalvando]           = useState(false);

  // Seleção
  const [subCatSel, setSubCatSel]         = useState("");
  const [respostaSel, setRespostaSel]     = useState<number | "">("");
  const [textoFinal, setTextoFinal]       = useState("");
  const [tituloFinal, setTituloFinal]     = useState("");
  const [copiado, setCopiado]             = useState(false);

  // Modo reordenar categorias
  const [reordenandoCats, setReordenandoCats] = useState(false);
  const dragCatIdx = useRef<number | null>(null);

  // Drag and drop respostas
  const dragRespostaIdx = useRef<number | null>(null);

  // Modal
  const [modalAberto, setModalAberto]     = useState(false);
  const [modalModo, setModalModo]         = useState<"novo" | "editar">("novo");
  const [modalIdx, setModalIdx]           = useState<number | null>(null);
  const [modalForm, setModalForm]         = useState<Resposta>(MODAL_VAZIO);
  const [modalNovaCat, setModalNovaCat]   = useState(false);

  // ---------------------------------------------------------------
  // CARREGAR FIREBASE
  // ---------------------------------------------------------------

  useEffect(() => {
    if (!user) return;
    carregarTudo();
  }, [user]);

  async function carregarTudo() {
    if (!user) return;
    setLoading(true);
    try {
      const [snapRespostas, snapOrdem] = await Promise.all([
        get(ref(db, `respostas/${user.username}`)),
        get(ref(db, `categorias_ordem/${user.username}`)),
      ]);

      const lista = parseArrayFirebase(snapRespostas.val());
      setRespostas(lista);

      // Se já tem ordem salva, usa ela; senão deriva das respostas
      if (snapOrdem.exists()) {
        setOrdemCats(snapOrdem.val() as string[]);
      } else {
        setOrdemCats([...new Set(lista.map((r) => r.subCategory))]);
      }
    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------
  // SALVAR
  // ---------------------------------------------------------------

  async function salvarRespostas(lista: Resposta[]) {
    if (!user) return;
    setSalvando(true);
    try { await set(ref(db, `respostas/${user.username}`), lista); }
    catch (e) { console.error(e); }
    finally { setSalvando(false); }
  }

  async function salvarOrdemCats(ordem: string[]) {
    if (!user) return;
    try { await set(ref(db, `categorias_ordem/${user.username}`), ordem); }
    catch (e) { console.error(e); }
  }

  // ---------------------------------------------------------------
  // CATEGORIAS ORDENADAS
  // ordemCats é a fonte da verdade para a ordem
  // Categorias novas (ainda não na ordem) vão pro final
  // ---------------------------------------------------------------

  const todasCats = [...new Set(respostas.map((r) => r.subCategory))];

  const catsOrdenadas = [
    ...ordemCats.filter((c) => todasCats.includes(c)),     // salvas + existentes
    ...todasCats.filter((c) => !ordemCats.includes(c)),    // novas ainda não salvas
  ];

  // ---------------------------------------------------------------
  // DRAG AND DROP — CATEGORIAS
  // ---------------------------------------------------------------

  function handleCatDragStart(i: number) {
    dragCatIdx.current = i;
  }

  function handleCatDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragCatIdx.current === null || dragCatIdx.current === i) return;

    const nova = [...catsOrdenadas];
    const [item] = nova.splice(dragCatIdx.current, 1);
    nova.splice(i, 0, item);

    dragCatIdx.current = i;
    setOrdemCats(nova);
  }

  async function handleCatDragEnd() {
    dragCatIdx.current = null;
    await salvarOrdemCats(catsOrdenadas);
  }

  // ---------------------------------------------------------------
  // SELEÇÃO EM CASCATA
  // ---------------------------------------------------------------

  const respostasDaCat = respostas
    .map((r, i) => ({ ...r, _idx: i }))
    .filter((r) => r.subCategory === subCatSel);

  function handleSubCatChange(val: string) {
    if (reordenandoCats) return; // bloqueia seleção durante reordenação
    setSubCatSel(val);
    setRespostaSel("");
    setTextoFinal("");
    setTituloFinal("");
  }

  function handleRespostaChange(idxStr: string) {
    const idx = Number(idxStr);
    setRespostaSel(idx);
    const r = respostas[idx];
    if (r) { setTituloFinal(r.title); setTextoFinal(aplicarMarcadores(r.text)); }
  }

  async function handleCopiar() {
    const ok = await copiar(textoFinal);
    if (ok) { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
  }

  function handleLimpar() {
    setSubCatSel(""); setRespostaSel(""); setTextoFinal(""); setTituloFinal("");
  }

  // ---------------------------------------------------------------
  // DRAG AND DROP — RESPOSTAS
  // ---------------------------------------------------------------

  function handleRespostaDragStart(globalIdx: number) { dragRespostaIdx.current = globalIdx; }

  function handleRespostaDragOver(e: React.DragEvent, globalIdx: number) {
    e.preventDefault();
    if (dragRespostaIdx.current === null || dragRespostaIdx.current === globalIdx) return;
    const nova = [...respostas];
    const [item] = nova.splice(dragRespostaIdx.current, 1);
    nova.splice(globalIdx, 0, item);
    dragRespostaIdx.current = globalIdx;
    setRespostas(nova);
  }

  async function handleRespostaDragEnd() {
    dragRespostaIdx.current = null;
    await salvarRespostas(respostas);
  }

  // ---------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------

  function abrirModalNovo() {
    setModalForm({ ...MODAL_VAZIO, subCategory: subCatSel });
    setModalModo("novo"); setModalIdx(null); setModalNovaCat(false); setModalAberto(true);
  }

  function abrirModalEditar() {
    if (respostaSel === "") return;
    setModalForm({ ...respostas[respostaSel as number] });
    setModalModo("editar"); setModalIdx(respostaSel as number); setModalNovaCat(false); setModalAberto(true);
  }

  async function handleModalSalvar() {
    if (!modalForm.title.trim() || !modalForm.text.trim() || !modalForm.subCategory.trim()) return;
    const novaLista = [...respostas];

    if (modalModo === "novo") {
      novaLista.push(modalForm);
      // Se categoria nova, adiciona na ordem
      if (!ordemCats.includes(modalForm.subCategory)) {
        const novaOrdem = [...ordemCats, modalForm.subCategory];
        setOrdemCats(novaOrdem);
        await salvarOrdemCats(novaOrdem);
      }
    } else if (modalIdx !== null) {
      novaLista[modalIdx] = modalForm;
      if (respostaSel === modalIdx) {
        setTextoFinal(aplicarMarcadores(modalForm.text));
        setTituloFinal(modalForm.title);
      }
    }

    setRespostas(novaLista);
    await salvarRespostas(novaLista);
    setModalAberto(false);
  }

  async function handleApagar() {
    if (respostaSel === "") return;
    const novaLista = respostas.filter((_, i) => i !== respostaSel);
    setRespostas(novaLista);
    setRespostaSel(""); setTextoFinal(""); setTituloFinal("");
    await salvarRespostas(novaLista);
  }

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------

  if (loading) {
    return (
      <div className="chat-page">
        <LoadingOverlay message="Carregando respostas..." />
      </div>
    );
  }

  return (
    <div className="chat-page">

      <div className="chat-header">
        <h1 className="chat-titulo">🗨️ Chat Automatizado</h1>
        {salvando && <span className="chat-salvando">💾 Salvando...</span>}
      </div>

      <div className="chat-card">

        {/* SELECT DE CATEGORIA — normal ou modo reordenação */}
        <div className="chat-grupo">
          <div className="chat-label-row">
            <label htmlFor="chat-subcat-sel">Categoria</label>
            <button
              className={`btn-reordenar-cats ${reordenandoCats ? "ativo" : ""}`}
              onClick={() => setReordenandoCats((v) => !v)}
              title="Reordenar categorias"
            >
              ↕ {reordenandoCats ? "Concluir" : "Reordenar"}
            </button>
          </div>

          {/* Modo normal: select comum */}
          {!reordenandoCats ? (
            <select
              id="chat-subcat-sel"
              name="subCategory"
              value={subCatSel}
              onChange={(e) => handleSubCatChange(e.target.value)}
            >
              <option value="">Selecione uma categoria</option>
              {catsOrdenadas.map((sc) => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
          ) : (
            /* Modo reordenação: lista arrastável inline */
            <ul className="chat-cats-drag-lista">
              {catsOrdenadas.map((sc, i) => (
                <li
                  key={sc}
                  className="chat-cats-drag-item"
                  draggable
                  onDragStart={() => handleCatDragStart(i)}
                  onDragOver={(e) => handleCatDragOver(e, i)}
                  onDragEnd={handleCatDragEnd}
                >
                  <span className="chat-reorder-handle">⠿</span>
                  <span className="chat-cats-drag-nome">{sc}</span>
                  <span className="chat-cats-drag-count">
                    {respostas.filter((r) => r.subCategory === sc).length} respostas
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* SELECT DE RESPOSTA */}
        {subCatSel && !reordenandoCats && (
          <div className="chat-grupo">
            <label htmlFor="chat-resposta-sel">Resposta</label>
            <select
              id="chat-resposta-sel"
              name="resposta"
              value={respostaSel}
              onChange={(e) => handleRespostaChange(e.target.value)}
            >
              <option value="">Selecione uma resposta</option>
              {respostasDaCat.map((r) => (
                <option key={r._idx} value={r._idx}>{r.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* RESULTADO */}
        {textoFinal && !reordenandoCats && (
          <div className="chat-resultado">
            <div className="chat-grupo">
              <label htmlFor="chat-titulo-final">Título</label>
              <input
                id="chat-titulo-final"
                name="title"
                type="text"
                value={tituloFinal}
                onChange={(e) => setTituloFinal(e.target.value)}
              />
            </div>
            <div className="chat-grupo">
              <label htmlFor="chat-texto-final">Resposta final</label>
              <textarea
                id="chat-texto-final"
                name="text"
                value={textoFinal}
                onChange={(e) => setTextoFinal(e.target.value)}
                rows={6}
              />
            </div>
            <div className="chat-acoes">
              <button className="btn-copiar" onClick={handleCopiar} disabled={copiado}>
                {copiado ? "✅ Copiado!" : "📋 Copiar"}
              </button>
              <button className="btn-editar"  onClick={abrirModalEditar}>✏️ Editar</button>
              <button className="btn-apagar"  onClick={handleApagar}>🗑️ Apagar</button>
              <button className="btn-limpar"  onClick={handleLimpar}>✕ Limpar</button>
            </div>
          </div>
        )}

        {/* BOTÃO ADICIONAR */}
        {!reordenandoCats && (
          <div className="chat-add-wrapper">
            <button className="btn-adicionar" onClick={abrirModalNovo}>➕ Nova resposta</button>
          </div>
        )}

      </div>

      {/* REORDENAR RESPOSTAS DA CATEGORIA */}
      {subCatSel && !reordenandoCats && respostasDaCat.length > 1 && (
        <div className="chat-card">
          <h2 className="chat-reorder-titulo">↕ Reordenar — <span>{subCatSel}</span></h2>
          <p className="chat-reorder-dica">Arraste para reordenar</p>
          <ul className="chat-reorder-lista">
            {respostasDaCat.map((r) => (
              <li
                key={r._idx}
                className="chat-reorder-item"
                draggable
                onDragStart={() => handleRespostaDragStart(r._idx)}
                onDragOver={(e) => handleRespostaDragOver(e, r._idx)}
                onDragEnd={handleRespostaDragEnd}
              >
                <span className="chat-reorder-handle">⠿</span>
                <span className="chat-reorder-nome">{r.title}</span>
                <span className="chat-reorder-cat">{r.subCategory}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MODAL */}
      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={modalModo === "novo" ? "➕ Nova Resposta" : "✏️ Editar Resposta"}
        largura="520px"
      >
        <div className="chat-grupo">
          <label htmlFor="chat-modal-subcat">Categoria</label>
          {!modalNovaCat ? (
            <div className="modal-row">
              <select
                id="chat-modal-subcat"
                value={modalForm.subCategory}
                onChange={(e) => setModalForm({ ...modalForm, subCategory: e.target.value })}
              >
                <option value="">Selecione</option>
                {catsOrdenadas.map((sc) => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
              <button className="btn-nova-cat" onClick={() => setModalNovaCat(true)}>+ Nova</button>
            </div>
          ) : (
            <div className="modal-row">
              <input
                id="chat-modal-new-cat"
                name="subCategory"
                type="text"
                placeholder="Nome da nova categoria"
                value={modalForm.subCategory}
                onChange={(e) => setModalForm({ ...modalForm, subCategory: e.target.value })}
                autoFocus
              />
              <button className="btn-nova-cat" onClick={() => setModalNovaCat(false)}>← Voltar</button>
            </div>
          )}
        </div>

        <div className="chat-grupo">
          <label htmlFor="chat-modal-title">Título</label>
          <input
            id="chat-modal-title"
            name="title"
            type="text"
            placeholder="Ex: Saudação padrão"
            value={modalForm.title}
            onChange={(e) => setModalForm({ ...modalForm, title: e.target.value })}
          />
        </div>

        <div className="chat-grupo">
          <label htmlFor="chat-modal-text">Texto</label>
          <textarea
            id="chat-modal-text"
            name="text"
            placeholder="Use [SAUDACAO] e [DESPEDIDA] para marcadores dinâmicos"
            value={modalForm.text}
            onChange={(e) => setModalForm({ ...modalForm, text: e.target.value })}
            rows={6}
          />
          <span className="modal-dica">
            Marcadores: [SAUDACAO] e [DESPEDIDA] se ajustam ao horário automaticamente
          </span>
        </div>

        <div className="modal-acoes">
          <button
            className="btn-copiar"
            onClick={handleModalSalvar}
            disabled={!modalForm.title || !modalForm.text || !modalForm.subCategory}
          >
            💾 Salvar
          </button>
          <button className="btn-limpar" onClick={() => setModalAberto(false)}>Cancelar</button>
        </div>
      </Modal>

    </div>
  );
}
