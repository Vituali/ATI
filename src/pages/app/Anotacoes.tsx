// pages/app/Anotacoes.tsx
import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { ref, onValue, off, push, remove, update } from "firebase/database";
import { useUser } from "../../hooks/useUser";
import { useNotification } from "../../hooks/useNotification";
import Modal from "../../components/ui/Modal";
import "./Anotacoes.css";

interface Task {
  text: string;
  completed: boolean;
}

interface Nota {
  id: string;
  titulo: string;
  corpo: string;
  tasks: Task[];
  status: "pendente" | "em andamento" | "concluído";
  timestamp: number;
}

export default function Anotacoes() {
  const { user } = useUser();
  const { notify, confirm } = useNotification();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<Nota | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [filtro, setFiltro] = useState("");

  // Firebase Listener
  useEffect(() => {
    if (!user) return;

    const path = `anotacoes/${user.username}`;
    const q = ref(db, path);

    const unsubscribe = onValue(q, (snap) => {
      const lista: Nota[] = [];
      snap.forEach((child) => {
        lista.push({
          id: child.key!,
          ...(child.val() as Omit<Nota, "id">),
        });
      });
      // Ordenar por data (mais recentes primeiro)
      setNotas(lista.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    });

    return () => off(q, "value", unsubscribe as any);
  }, [user]);

  const abrirModal = (nota?: Nota) => {
    if (nota) {
      setEditando({ ...nota, tasks: nota.tasks || [] });
    } else {
      setEditando({
        id: "",
        titulo: "",
        corpo: "",
        tasks: [],
        status: "pendente",
        timestamp: Date.now(),
      });
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setTimeout(() => setEditando(null), 200); // Aguarda animação de fechamento
  };

  const salvarNota = async () => {
    if (!user || !editando || !editando.titulo.trim()) return;

    try {
      const path = `anotacoes/${user.username}`;
      const data = {
        titulo: editando.titulo.trim(),
        corpo: editando.corpo.trim(),
        tasks: editando.tasks,
        status: editando.status,
        timestamp: editando.id ? editando.timestamp : Date.now(),
      };

      if (editando.id) {
        await update(ref(db, `${path}/${editando.id}`), data);
        notify("Nota atualizada!", "info");
      } else {
        await push(ref(db, path), data);
        notify("Nota criada com sucesso!", "success");
      }
      fecharModal();
    } catch (e) {
      console.error(e);
      notify("Erro ao salvar nota.", "error");
    }
  };

  const excluirNota = async () => {
    if (!user || !editando?.id) return;
    const aceito = await confirm("Deseja realmente excluir esta nota?");
    if (!aceito) return;

    try {
      await remove(ref(db, `anotacoes/${user.username}/${editando.id}`));
      notify("Nota excluída.", "info");
      fecharModal();
    } catch (e) {
      notify("Erro ao excluir.", "error");
    }
  };

  const toggleTask = (index: number) => {
    if (!editando) return;
    const novasTasks = [...editando.tasks];
    novasTasks[index].completed = !novasTasks[index].completed;
    setEditando({ ...editando, tasks: novasTasks });
  };

  const addTask = () => {
    if (!editando) return;
    setEditando({
      ...editando,
      tasks: [...editando.tasks, { text: "", completed: false }],
    });
  };

  const removeTask = (index: number) => {
    if (!editando) return;
    const novasTasks = editando.tasks.filter((_, i) => i !== index);
    setEditando({ ...editando, tasks: novasTasks });
  };

  const updateTaskText = (index: number, text: string) => {
    if (!editando) return;
    const novasTasks = [...editando.tasks];
    novasTasks[index].text = text;
    setEditando({ ...editando, tasks: novasTasks });
  };

  const notasFiltradas = notas.filter(
    (n) =>
      n.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
      n.corpo.toLowerCase().includes(filtro.toLowerCase()),
  );

  return (
    <div className="an-container">
      <header className="an-header">
        <div className="an-header-info">
          <h1>Minhas Anotações</h1>
          <p>Organize suas tarefas e lembretes do dia a dia.</p>
        </div>
        <button className="an-btn-novo" onClick={() => abrirModal()}>
          <span>➕</span> Nova Nota
        </button>
      </header>

      <div className="an-header-acoes">
        <label htmlFor="an-search" className="sr-only">Pesquisar notas</label>
        <input
          id="an-search"
          name="search"
          type="text"
          className="an-search"
          placeholder="Pesquisar em notas..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      <div className="an-grid">
        {notasFiltradas.length === 0 && !loading && (
          <div className="an-empty">
            <span className="an-empty-icon">📂</span>
            <p>Nenhuma nota encontrada.</p>
          </div>
        )}

        {notasFiltradas.map((nota) => {
          const totalTasks = nota.tasks?.length || 0;
          const doneTasks = nota.tasks?.filter((t) => t.completed).length || 0;

          return (
            <div
              key={nota.id}
              className="an-card"
              onClick={() => abrirModal(nota)}
            >
              <div className="an-card-header">
                <h3 className="an-card-titulo">{nota.titulo}</h3>
                <span className={`an-status-badge an-status-${nota.status.replace(/\s+/g, '-')}`}>
                  {nota.status}
                </span>
              </div>

              {nota.corpo && <p className="an-card-preview">{nota.corpo}</p>}

              {totalTasks > 0 && (
                <div className="an-card-checklist">
                  {nota.tasks.slice(0, 3).map((task, idx) => (
                    <div
                      key={idx}
                      className={`an-mini-task ${task.completed ? "completed" : ""}`}
                    >
                      <span className="an-mini-dot" />
                      {task.text || "(sem texto)"}
                    </div>
                  ))}
                  {totalTasks > 3 && (
                    <div className="an-mini-task" style={{ opacity: 0.5 }}>
                      +{totalTasks - 3} itens...
                    </div>
                  )}
                </div>
              )}

              <div className="an-card-footer">
                <span>{new Date(nota.timestamp).toLocaleDateString()}</span>
                {totalTasks > 0 && (
                  <span>
                    ✅ {doneTasks}/{totalTasks}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        aberto={modalAberto}
        onFechar={fecharModal}
        titulo="Editor de Nota"
        largura="600px"
      >
        {editando && (
          <>
            <div className="an-input-group">
              <label htmlFor="an-titulo" className="an-label">Título</label>
              <input
                id="an-titulo"
                name="titulo"
                type="text"
                className="an-input-titulo"
                placeholder="Título da nota..."
                value={editando.titulo}
                onChange={(e) =>
                  setEditando({ ...editando, titulo: e.target.value })
                }
                autoFocus
              />
            </div>

            <div className="an-input-group">
              <label htmlFor="an-status" className="an-label">Status</label>
              <select
                id="an-status"
                name="status"
                className="an-select-status"
                value={editando.status}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    status: e.target.value as any,
                  })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="em andamento">Em Andamento</option>
                <option value="concluído">Concluído</option>
              </select>
            </div>

            <div className="an-input-group">
              <label htmlFor="an-corpo" className="an-label">Conteúdo</label>
              <textarea
                id="an-corpo"
                name="corpo"
                className="an-textarea"
                placeholder="Escreva algo..."
                value={editando.corpo}
                onChange={(e) =>
                  setEditando({ ...editando, corpo: e.target.value })
                }
              />
            </div>

            <div className="an-checklist-editor">
              <label className="an-label">Checklist</label>
              {editando.tasks.map((task, idx) => (
                <div key={idx} className="an-task-row">
                  <label className="an-checkbox-wrapper" htmlFor={`task-check-${idx}`}>
                    <span className="sr-only">Concluir tarefa {idx + 1}</span>
                    <input
                      type="checkbox"
                      id={`task-check-${idx}`}
                      name={`task-check-${idx}`}
                      checked={task.completed}
                      onChange={() => toggleTask(idx)}
                    />
                    <span className="an-checkmark" />
                  </label>
                  
                  <div style={{ flex: 1 }}>
                    <label htmlFor={`task-text-${idx}`} className="sr-only">Descrição da tarefa {idx + 1}</label>
                    <textarea
                      id={`task-text-${idx}`}
                      name={`task-text-${idx}`}
                      className={`an-task-input ${task.completed ? "completed" : ""}`}
                      value={task.text}
                      onChange={(e) => updateTaskText(idx, e.target.value)}
                      placeholder="Item da tarefa..."
                    />
                  </div>
                  <button
                    className="an-btn-remove-task"
                    onClick={() => removeTask(idx)}
                    title="Remover tarefa"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <button className="an-btn-add-task" onClick={addTask}>
                <span>➕</span> Adicionar tarefa
              </button>
            </div>

            <footer className="an-modal-footer">
              <div>
                {editando.id && (
                  <button className="an-btn-delete" onClick={excluirNota}>
                    Excluir Nota
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="an-btn-cancelar"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
                <button className="an-btn-save" onClick={salvarNota}>
                  Gravar Alterações
                </button>
              </div>
            </footer>
          </>
        )}
      </Modal>
    </div>
  );
}
