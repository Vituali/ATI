// components/Modal.tsx
// ---------------------------------------------------------------
// Modal reutilizável. Usado no Chat, OS, Admin e qualquer outro
// lugar que precisar de overlay + card centralizado.
//
// Uso:
//   <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Título">
//     {/* conteúdo aqui */}
//   </Modal>
// ---------------------------------------------------------------

import { useEffect } from "react";
import "./Modal.css";

interface ModalProps {
  aberto:     boolean;
  onFechar:   () => void;
  titulo:     string;
  children:   React.ReactNode;
  largura?:   string; // ex: "520px" — padrão 480px
}

export default function Modal({ aberto, onFechar, titulo, children, largura }: ModalProps) {

  // Fecha com ESC
  useEffect(() => {
    if (!aberto) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [aberto, onFechar]);

  // Trava o scroll do body enquanto modal está aberto
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div
        className="modal-content"
        style={largura ? { maxWidth: largura } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com título e botão fechar */}
        <div className="modal-header">
          <h2 className="modal-titulo">{titulo}</h2>
          <button className="modal-fechar" onClick={onFechar} aria-label="Fechar modal">
            ✕
          </button>
        </div>

        {/* Conteúdo passado como children */}
        <div className="modal-body">
          {children}
        </div>

      </div>
    </div>
  );
}
