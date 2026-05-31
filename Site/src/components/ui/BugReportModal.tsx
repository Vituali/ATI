import { useState } from "react";
import { ref, push, serverTimestamp } from "firebase/database";
import { db } from "../../services/firebase";
import Modal from "./Modal";
import "./BugReportModal.css";

interface BugReportModalProps {
  aberto: boolean;
  onFechar: () => void;
  user: any; // Opcional, para sabermos quem reportou
}

export default function BugReportModal({ aberto, onFechar, user }: BugReportModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) {
      setErro("Preencha título e descrição.");
      return;
    }

    setEnviando(true);
    setErro("");

    try {
      await push(ref(db, "bugs"), {
        titulo,
        descricao,
        autor: user?.nomeCompleto || user?.username || "Anônimo",
        timestamp: serverTimestamp(),
        status: "aberto"
      });
      setSucesso(true);
      setTimeout(() => {
        setSucesso(false);
        setTitulo("");
        setDescricao("");
        onFechar();
      }, 2000);
    } catch (err: any) {
      setErro("Erro ao enviar bug: " + err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="🐛 Relatar um Bug">
      {sucesso ? (
        <div className="bug-modal-sucesso">
          <p>✅ Bug relatado com sucesso! Obrigado por ajudar.</p>
        </div>
      ) : (
        <form onSubmit={handleEnviar} className="bug-modal-form">
          {erro && (
            <p className="bug-modal-erro">{erro}</p>
          )}
          
          <div className="bug-modal-field">
            <label htmlFor="bug-titulo">
              Como você resume o bug?
            </label>
            <input
              id="bug-titulo"
              type="text"
              placeholder="Ex: Botão de salvar não funciona"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
            />
          </div>

          <div className="bug-modal-field">
            <label htmlFor="bug-descricao">
              Descreva o que aconteceu (passo a passo se possível):
            </label>
            <textarea
              id="bug-descricao"
              placeholder="Eu cliquei na página X, digitei Y e a tela ficou branca..."
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="bug-modal-acoes">
            <button
              type="button"
              className="bug-btn-cancelar"
              onClick={onFechar}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bug-btn-enviar"
              disabled={enviando}
            >
              {enviando ? "Enviando..." : "Enviar Relato"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
