// components/AvisosHome.tsx
// ---------------------------------------------------------------
// Exibe avisos ativos publicados por admins no topo da Home.
// Admins veem botão X para desativar/remover o aviso.
// ---------------------------------------------------------------

import { useEffect, useState } from "react";
import { ref, onValue, update, off } from "firebase/database";
import { db } from "../../services/firebase";
import { UserProfile } from "../../hooks/useUser";
import "./AvisosHome.css";

interface Aviso {
  id: string;
  titulo: string;
  corpo: string;
  tipo: "info" | "warning" | "danger";
  criadoPor: string;
  timestamp: number;
  ativo: boolean;
}

interface AvisosHomeProps {
  user: UserProfile;
}

function formatarData(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TIPO_ICON: Record<Aviso["tipo"], string> = {
  info: "ℹ️",
  warning: "⚠️",
  danger: "🚨",
};

export default function AvisosHome({ user }: AvisosHomeProps) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    const r = ref(db, "avisos");
    const unsub = onValue(r, (snap) => {
      const lista: Aviso[] = [];
      snap.forEach((child) => {
        const val = child.val() as Omit<Aviso, "id">;
        if (val.ativo) {
          lista.push({ id: child.key!, ...val });
        }
      });
      // Mais recentes primeiro
      lista.sort((a, b) => b.timestamp - a.timestamp);
      setAvisos(lista);
    });

    return () => off(r, "value", unsub as any);
  }, []);

  async function desativar(id: string) {
    try {
      await update(ref(db, `avisos/${id}`), { ativo: false });
    } catch (e) {
      console.error("Erro ao desativar aviso:", e);
    }
  }

  if (avisos.length === 0) return null;

  return (
    <div className="avisos-container">
      {avisos.map((aviso) => (
        <div key={aviso.id} className={`aviso-card aviso-${aviso.tipo}`}>
          <div className="aviso-icone">{TIPO_ICON[aviso.tipo]}</div>
          <div className="aviso-conteudo">
            <div className="aviso-header">
              <strong className="aviso-titulo">{aviso.titulo}</strong>
              <span className="aviso-meta">
                por @{aviso.criadoPor} · {formatarData(aviso.timestamp)}
              </span>
            </div>
            <p className="aviso-corpo">{aviso.corpo}</p>
          </div>
          {isAdmin && (
            <button
              className="aviso-btn-fechar"
              onClick={() => desativar(aviso.id)}
              title="Desativar aviso"
              aria-label="Fechar aviso"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
