// components/PainelAvisos.tsx
import { useState, useEffect } from "react";
import { ref, get, push, update, remove } from "firebase/database";
import { db } from "../../services/firebase";
import { UserProfile } from "../../hooks/useUser";
import LoadingOverlay from "../ui/LoadingOverlay";
import { useNotification } from "../../hooks/useNotification";


interface Aviso {
  id: string;
  titulo: string;
  corpo: string;
  tipo: "info" | "warning" | "danger";
  criadoPor: string;
  timestamp: number;
  ativo: boolean;
}

interface PainelAvisosProps {
  user: UserProfile;
}

export default function PainelAvisos({ user }: PainelAvisosProps) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify, confirm } = useNotification();


  // Estados do formulário (Novo / Editar)
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    corpo: "",
    tipo: "info" as Aviso["tipo"],
  });



  useEffect(() => {
    carregarAvisos();
  }, []);

  async function carregarAvisos() {
    setLoading(true);
    try {
      const snap = await get(ref(db, "avisos"));
      const lista: Aviso[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          lista.push({ id: child.key!, ...(child.val() as Omit<Aviso, "id">) });
        });
      }
      // Ordenar: ativos primeiro, depois por data decrescente
      lista.sort((a, b) => {
        if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
        return b.timestamp - a.timestamp;
      });
      setAvisos(lista);
    } catch (e: any) {
      notify("Erro ao carregar avisos: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }




  async function handleSalvar() {
    if (!form.titulo.trim() || !form.corpo.trim()) {
      notify("Preencha todos os campos obrigatórios.", "warning");
      return;
    }

    try {
      if (editandoId) {
        // Editar
        await update(ref(db, `avisos/${editandoId}`), {
          titulo: form.titulo.trim(),
          corpo: form.corpo.trim(),
          tipo: form.tipo,
        });
        notify("Aviso atualizado com sucesso!", "success");
      } else {
        // Novo
        await push(ref(db, "avisos"), {
          titulo: form.titulo.trim(),
          corpo: form.corpo.trim(),
          tipo: form.tipo,
          criadoPor: user.username,
          timestamp: Date.now(),
          ativo: true,
        });
        notify("Novo aviso criado!", "success");
      }
      setMostrandoForm(false);
      setEditandoId(null);
      setForm({ titulo: "", corpo: "", tipo: "info" });
      carregarAvisos();
    } catch (e: any) {
      notify("Erro ao salvar: " + e.message, "error");
    }
  }


  async function toggleAtivo(aviso: Aviso) {
    try {
      await update(ref(db, `avisos/${aviso.id}`), { ativo: !aviso.ativo });
      notify(
        aviso.ativo ? "Aviso desativado." : "Aviso ativado!",
        "success",
      );
      carregarAvisos();
    } catch (e: any) {
      notify("Erro ao alterar status: " + e.message, "error");
    }
  }


  async function handleExcluir(id: string) {
    const confirmacao = await confirm("Tem certeza que deseja excluir este aviso permanentemente?");
    if (!confirmacao) return;

    try {
      await remove(ref(db, `avisos/${id}`));
      notify("Aviso excluído permanentemente.", "success");
      carregarAvisos();
    } catch (e: any) {
      notify("Erro ao excluir: " + e.message, "error");
    }
  }


  function abrirEdicao(aviso: Aviso) {
    setForm({ titulo: aviso.titulo, corpo: aviso.corpo, tipo: aviso.tipo });
    setEditandoId(aviso.id);
    setMostrandoForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="painel-avisos">
      {/* Header local do painel */}
      <div
        className="admin-header"
        style={{ borderBottom: "none", marginBottom: "0" }}
      >
        <div>
          <h2 className="admin-titulo" style={{ fontSize: "1.3rem" }}>
            📢 Gerenciar Avisos
          </h2>
          <p className="admin-subtitulo">
            Publique avisos globais para todos os usuários
          </p>
        </div>
        <div className="admin-header-acoes">
          <button className="admin-btn-refresh" onClick={carregarAvisos}>
            ↻ Atualizar
          </button>
          <button
            className="admin-btn-salvar-todos"
            style={{ background: "var(--accent-blue)" }}
            onClick={() => {
              setMostrandoForm(!mostrandoForm);
              setEditandoId(null);
              setForm({ titulo: "", corpo: "", tipo: "info" });
            }}
          >
            {mostrandoForm ? "✕ Fechar" : "➕ Novo Aviso"}
          </button>
        </div>
      </div>



      {/* Formulário Inline */}
      {mostrandoForm && (
        <div
          className="admin-card"
          style={{
            marginBottom: "1.5rem",
            border: "1px solid var(--accent-blue-border)",
          }}
        >
          <h3 className="admin-secao-titulo">
            {editandoId ? "✏️ Editar Aviso" : "📝 Novo Aviso"}
          </h3>
          <div className="up-section" style={{ padding: "0" }}>
            <div className="up-grupo">
              <label>Título do Aviso</label>
              <input
                className="admin-input"
                type="text"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Manutenção no SGP hoje"
              />
            </div>
            <div className="up-grupo">
              <label>Corpo do Aviso</label>
              <textarea
                className="admin-input"
                style={{ minHeight: "100px", fontFamily: "inherit" }}
                value={form.corpo}
                onChange={(e) => setForm({ ...form, corpo: e.target.value })}
                placeholder="Descreva o aviso em detalhes..."
              />
            </div>
            <div className="up-grupo">
              <label>Tipo / Gravidade</label>
              <select
                className="admin-select"
                value={form.tipo}
                onChange={(e) =>
                  setForm({ ...form, tipo: e.target.value as Aviso["tipo"] })
                }
              >
                <option value="info">ℹ️ Info (Azul)</option>
                <option value="warning">⚠️ Warning (Amarelo)</option>
                <option value="danger">🚨 Danger (Vermelho)</option>
              </select>
            </div>
            <div className="chat-acoes" style={{ marginTop: "1rem" }}>
              <button
                className="admin-btn-salvar"
                onClick={handleSalvar}
                style={{ width: "auto", padding: "10px 25px" }}
              >
                {editandoId ? "💾 Salvar Alterações" : "🚀 Publicar Aviso"}
              </button>
              <button
                className="btn-limpar"
                onClick={() => setMostrandoForm(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-card">
        {loading && <LoadingOverlay message="Carregando avisos..." />}
        {!loading && (
          <div className="admin-tabela-wrapper">

            <table className="admin-tabela">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Criado por</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {avisos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-vazio">
                      Nenhum aviso encontrado
                    </td>
                  </tr>
                )}
                {avisos.map((aviso) => (
                  <tr key={aviso.id} style={{ opacity: aviso.ativo ? 1 : 0.5 }}>
                    <td>
                      <div
                        style={{ fontWeight: 700, color: "var(--text-white)" }}
                      >
                        {aviso.titulo}
                      </div>
                      <div
                        className="admin-email"
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "250px",
                        }}
                      >
                        {aviso.corpo}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`home-badge`}
                        style={{
                          background: `var(--color-bg-${aviso.tipo}, rgba(255,255,255,0.05))`,
                          color: `var(--color-text-${aviso.tipo}, var(--text-grey))`,
                          borderColor: `var(--color-border-${aviso.tipo}, var(--border-subtle))`,
                        }}
                      >
                        {aviso.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`admin-btn-salvar`}
                        style={{
                          background: aviso.ativo
                            ? "rgba(255, 82, 82, 0.1)"
                            : "rgba(0, 200, 83, 0.1)",
                          color: aviso.ativo ? "#ff5252" : "#00c853",
                          border: `1px solid ${aviso.ativo ? "rgba(255, 82, 82, 0.2)" : "rgba(0, 200, 83, 0.2)"}`,
                          fontSize: "11px",
                          padding: "4px 8px",
                        }}
                        onClick={() => toggleAtivo(aviso)}
                      >
                        {aviso.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                    <td>
                      <span className="admin-username">@{aviso.criadoPor}</span>
                    </td>
                    <td>
                      <span className="admin-email">
                        {new Date(aviso.timestamp).toLocaleDateString()}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="admin-btn-salvar"
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          onClick={() => abrirEdicao(aviso)}
                        >
                          Editar
                        </button>
                        <button
                          className="admin-btn-salvar"
                          style={{
                            background: "transparent",
                            color: "#ff5252",
                            padding: "4px 8px",
                            fontSize: "11px",
                          }}
                          onClick={() => handleExcluir(aviso.id)}
                        >
                          Excluir
                        </button>
                      </div>

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
