// pages/ChatInterno.tsx
// ---------------------------------------------------------------
// Chat interno com salas por setor.
// Usa Firebase Realtime Database: /chat/salas/{room}/mensagens
// ---------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import {
  ref,
  push,
  onValue,
  query,
  orderByChild,
  limitToLast,
  set,
} from "firebase/database";
import { db } from "../../services/firebase";
import { useUser } from "../../hooks/useUser";
import { SETOR_LABEL, type Setor } from "../../services/permissions";
import { useNotification } from "../../hooks/useNotification";
import "./ChatInterno.css";

interface Mensagem {
  id: string;
  autor: string;
  nomeCompleto: string;
  setor: string; // Setor do autor (badge)
  room?: string; // Sala de destino (novo)
  texto: string;
  timestamp: number;
  avatarUrl?: string;
}

const ROOM_ICONS: Record<string, string> = {
  geral: "🌐",
  ti: "🛠️",
  financeiro: "💰",
  suporte: "🎧",
  comercial: "🤝",
};

function formatarHorario(ts: number): string {
  const d = new Date(ts);
  const horas = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  const hoje = new Date();
  if (
    d.getDate() === hoje.getDate() &&
    d.getMonth() === hoje.getMonth() &&
    d.getFullYear() === hoje.getFullYear()
  ) {
    return `${horas}:${min}`;
  }
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")} ${horas}:${min}`;
}

interface ChatProps {
  unreadRooms?: Setor[];
}

export default function ChatInterno({ unreadRooms = [] }: ChatProps) {
  const { user } = useUser();
  const { notify } = useNotification();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [lastSent, setLastSent] = useState(0);
  const [activeRoom, setActiveRoom] = useState<Setor>(() => {
    return (localStorage.getItem("lastChatRoom") as Setor) || "geral";
  });
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persiste a sala ativa
  useEffect(() => {
    localStorage.setItem("lastChatRoom", activeRoom);
  }, [activeRoom]);

  // Gerencia a conexão com o Firebase (Sempre escutando a sala correta)
  useEffect(() => {
    const path = `chat/salas/${activeRoom}/mensagens`;

    const q = query(ref(db, path), orderByChild("timestamp"), limitToLast(100));

    const unsubscribe = onValue(q, (snap) => {
      const lista: Mensagem[] = [];
      snap.forEach((child) => {
        lista.push({
          id: child.key!,
          ...(child.val() as Omit<Mensagem, "id">),
        });
      });
      setMensagens(lista);
    });

    return () => unsubscribe();
  }, [activeRoom]);

  // Auto-scroll robusto
  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (mensagens.length > 0) {
      const scroll = () => {
        endRef.current?.scrollIntoView({
          behavior: isFirstLoad.current ? "auto" : "smooth",
          block: "end",
        });
        if (isFirstLoad.current) isFirstLoad.current = false;
      };
      const timer = setTimeout(scroll, 100);
      return () => clearTimeout(timer);
    }
  }, [mensagens, profiles, activeRoom]);

  // Sincroniza perfis
  useEffect(() => {
    const aRef = ref(db, "atendentes");
    const unsubscribe = onValue(aRef, (snap) => {
      if (snap.exists()) setProfiles(snap.val());
    });
    return () => unsubscribe();
  }, []);

  async function enviar() {
    if (!user || !texto.trim() || enviando) return;

    const charLimit = 500;
    const cooldown = 2000; // 2 segundos

    if (texto.length > charLimit) {
      notify(`A mensagem excede o limite de ${charLimit} caracteres.`, "warning");
      return;
    }

    const agora = Date.now();
    if (agora - lastSent < cooldown) {
      notify("Aguarde um momento antes de enviar outra mensagem.", "warning");
      return;
    }

    setEnviando(true);

    try {
      const now = Date.now();
      await push(ref(db, `chat/salas/${activeRoom}/mensagens`), {
        autor: user.username,
        nomeCompleto: user.nomeCompleto,
        setor: user.setor,
        room: activeRoom,
        texto: texto.trim(),
        timestamp: now,
        avatarUrl: user.avatarUrl ?? null,
      });

      // Correção 6: Gravar meta da última mensagem
      await set(ref(db, `chat/meta/${activeRoom}/ultimaMensagem`), {
        autor: user.username,
        timestamp: now,
      });

      setTexto("");
      setLastSent(agora);
      inputRef.current?.focus();
    } catch (e) {
      notify("Erro ao enviar mensagem. Verifique sua conexão.", "error");
      console.error("Erro ao enviar mensagem:", e);
    } finally {
      setEnviando(false);
    }
  }

  async function limparSala() {
    if (!user) return;

    const confirmacao = window.confirm(
      `Deseja realmente apagar TODO o histórico da sala ${SETOR_LABEL[activeRoom] || activeRoom}?`,
    );

    if (!confirmacao) return;

    try {
      await set(ref(db, `chat/salas/${activeRoom}/mensagens`), null);
      notify(`Histórico da sala ${activeRoom} limpo com sucesso!`, "info");
    } catch (e) {
      console.error("Erro ao limpar sala:", e);
      notify("Erro ao limpar mensagens.", "error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  if (!user) return null;

  const isPrivileged = ["supervisor", "moderador", "admin"].includes(user.role);

  // Salas visíveis: Geral sempre, e a sala do setor do usuário se não for 'geral'.
  // Cargos privilegiados veem todas as salas.
  const salasVisiveis = (Object.keys(ROOM_ICONS) as Setor[]).filter((s) => {
    if (isPrivileged) return true;
    if (s === "geral") return true;
    return s === user.setor;
  });

  // Agrupar mensagens para balões compactos
  const grupos: { msg: Mensagem; isOwn: boolean; showHeader: boolean }[] =
    mensagens.map((msg, i) => {
      const prev = mensagens[i - 1];
      const isOwn = msg.autor === user.username;
      const showHeader =
        !prev ||
        prev.autor !== msg.autor ||
        msg.timestamp - prev.timestamp > 60_000;
      return { msg, isOwn, showHeader };
    });

  return (
    <div className="ci-page">
      {/* Cabeçalho */}
      <div className="ci-header">
        <div className="ci-header-info">
          <span className="ci-header-icon">
            {ROOM_ICONS[activeRoom] || "💬"}
          </span>
          <div>
            <h1 className="ci-titulo">Chat Interno</h1>
            <p className="ci-subtitulo">
              Sala: {SETOR_LABEL[activeRoom] || activeRoom}
            </p>
          </div>
        </div>
        <div className="ci-header-acoes">
          {isPrivileged && mensagens.length > 0 && (
            <button
              className="ci-btn-limpar"
              onClick={limparSala}
              title="Limpar mensagens dessa sala"
            >
              🗑️ Limpar
            </button>
          )}
          <div className="ci-badge-online">
            <span className="ci-dot" />
            Online
          </div>
        </div>
      </div>

      {/* Seletor de Salas */}
      {salasVisiveis.length > 1 && (
        <div className="ci-filtros">
          {salasVisiveis.map((s) => (
            <button
              key={s}
              className={`ci-filtro-btn ${activeRoom === s ? "active" : ""}`}
              onClick={() => setActiveRoom(s)}
            >
              <span className="ci-filtro-icon">{ROOM_ICONS[s]}</span>
              <span className="ci-filtro-label">{SETOR_LABEL[s]}</span>
              {unreadRooms.includes(s) && <span className="ci-unread-dot" />}
            </button>
          ))}
        </div>
      )}

      {/* Lista de mensagens */}
      <div className="ci-mensagens">
        {mensagens.length === 0 && (
          <div className="ci-vazio">
            <span>{ROOM_ICONS[activeRoom]}</span>
            <p>
              A sala {SETOR_LABEL[activeRoom]} está vazia. Comece a conversa!
            </p>
          </div>
        )}

        {grupos.map(({ msg, isOwn, showHeader }) => {
          const avatarUrl = profiles[msg.autor]?.avatarUrl;

          return (
            <div
              key={msg.id}
              className={`ci-balao-wrap ${isOwn ? "right" : "left"}`}
            >
              {showHeader && !isOwn && (
                <div className="ci-autor-info">
                  <span className="ci-autor-nome">{msg.nomeCompleto}</span>
                  <span className="ci-autor-setor">
                    {SETOR_LABEL[msg.setor as keyof typeof SETOR_LABEL] ??
                      msg.setor}
                  </span>
                </div>
              )}

              <div className="ci-balao-conteudo">
                {showHeader && (
                  <div className="ci-avatar">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="ci-avatar-img" />
                    ) : (
                      msg.nomeCompleto.charAt(0).toUpperCase()
                    )}
                  </div>
                )}
                {!showHeader && <div className="ci-avatar-spacer" />}

                <div className={`ci-balao ${isOwn ? "own" : "other"}`}>
                  <span className="ci-texto">{msg.texto}</span>
                  <span className="ci-hora">
                    {formatarHorario(msg.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={endRef} />
      </div>

      {/* Input de envio */}
      <div className="ci-input-area">
        <div className="ci-input-wrapper">
          <textarea
            ref={inputRef}
            className="ci-input"
            placeholder={`Falar em ${SETOR_LABEL[activeRoom]}…`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={500}
          />
          <div
            className={`ci-char-counter ${texto.length >= 500 ? "limit" : ""}`}
          >
            {texto.length}/500
          </div>
        </div>
        <button
          className="ci-btn-enviar"
          onClick={enviar}
          disabled={!texto.trim() || enviando}
          aria-label="Enviar mensagem"
        >
          {enviando ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}
