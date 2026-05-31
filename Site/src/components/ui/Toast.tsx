// src/components/ui/Toast.tsx
import { useState } from "react";
import "./Toast.css";
import { Notification, useNotification } from "../../hooks/useNotification";

/**
 * Propriedades do componente Toast (Contêiner) em Português
 */
interface ToastProps {
  notificacoes: Notification[];
  aoRemover: (id: string, resultado?: boolean) => void;
}

/**
 * Componente Toast que exibe notificações flutuantes no canto inferior direito.
 * Empilha múltiplos avisos e suporta notificações de confirmação.
 */
export function Toast({ notificacoes, aoRemover }: ToastProps) {
  return (
    <div className="toast-container" id="toast-container">
      {notificacoes.map((item) => (
        <ToastItem key={item.id} item={item} aoRemover={aoRemover} />
      ))}
    </div>
  );
}

/**
 * Componente interno para uma única notificação com lógica de animação de saída.
 */
function ToastItem({
  item,
  aoRemover,
}: {
  item: Notification;
  aoRemover: (id: string, resultado?: boolean) => void;
}) {
  const { id, message, type } = item;
  const [saindo, setSaindo] = useState(false);

  // Função para fechar com animação
  const fechar = (resultado: boolean = false) => {
    setSaindo(true);
    setTimeout(() => {
      aoRemover(id, resultado);
    }, 300); // Tempo da animação fade-out no CSS
  };

  const icons = {
    success: "✅",
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    confirm: "❓",
  };

  return (
    <div
      className={`toast-item toast-${type} ${saindo ? "exiting" : ""}`}
      id={`toast-${id}`}
      role="alert"
    >
      <div className="toast-icon">{icons[type]}</div>

      <div className="toast-content">
        <span>{message}</span>

        {type === "confirm" && (
          <div className="toast-buttons">
            <button
              className="toast-btn toast-btn-confirm"
              onClick={() => fechar(true)}
            >
              Confirmar
            </button>
            <button
              className="toast-btn toast-btn-cancel"
              onClick={() => fechar(false)}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {type !== "confirm" && (
        <button
          className="toast-close"
          onClick={() => fechar(false)}
          aria-label="Fechar"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Componente principal auto-injetado pelo hook.
 */
export default function ToastContainer() {
  const { notifications, remove } = useNotification();
  return <Toast notificacoes={notifications} aoRemover={remove} />;
}
