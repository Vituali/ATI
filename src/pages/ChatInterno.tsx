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
  off,
  set,
} from "firebase/database";
import { db } from "../services/firebase";
import { useUser } from "../hooks/useUser";
import { SETOR_LABEL, type Setor } from "../services/permissions";
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

export default function ChatInterno() {
  const { user } = useUser();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Setor>("geral");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Gerencia a conexão com o Firebase (Sempre escutando a sala correta)
  useEffect(() => {
    const path = `chat/salas/${activeRoom}/mensagens`;
    
    const q = query(
      ref(db, path),
      orderByChild("timestamp"),
      limitToLast(100)
    );

    const unsubscribe = onValue(q, (snap) => {
      const lista: Mensagem[] = [];
      snap.forEach((child) => {
        lista.push({ id: child.key!, ...(child.val() as Omit<Mensagem, "id">) });
      });
      setMensagens(lista);
    });

    return () => off(q, "value", unsubscribe as any);
  }, [activeRoom]);

  // Auto-scroll robusto
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  useEffect(() => {
    if (mensagens.length > 0) {
      const scroll = () => {
        endRef.current?.scrollIntoView({ behavior: isFirstLoad ? "auto" : "smooth", block: "end" });
        if (isFirstLoad) setIsFirstLoad(false);
      };
      const timer = setTimeout(scroll, 100);
      return () => clearTimeout(timer);
    }
  }, [mensagens, isFirstLoad, profiles, activeRoom]);

  // Sincroniza perfis
  useEffect(() => {
    const aRef = ref(db, "atendentes");
    const unsubscribe = onValue(aRef, (snap) => {
      if (snap.exists()) setProfiles(snap.val());
    });
    return () => off(aRef, "value", unsubscribe as any);
  }, []);

  async function enviar() {
    if (!user || !texto.trim() || enviando) return;
    setEnviando(true);
    
    try {
      await push(ref(db, `chat/salas/${activeRoom}/mensagens`), {
        autor: user.username,
        nomeCompleto: user.nomeCompleto,
        setor: user.setor,
        room: activeRoom,
        texto: texto.trim(),
        timestamp: Date.now(),
        avatarUrl: user.avatarUrl ?? null,
      });
      setTexto("");
      inputRef.current?.focus();
    } catch (e) {
      console.error("Erro ao enviar mensagem:", e);
    } finally {
      setEnviando(false);
    }
  }

  async function limparSala() {
    if (!user) return;
    
    const confirmacao = window.confirm(
      `Deseja realmente apagar TODO o histórico da sala ${SETOR_LABEL[activeRoom] || activeRoom}?` 
    );
    
    if (!confirmacao) return;

    try {
      await set(ref(db, `chat/salas/${activeRoom}/mensagens`), null);
    } catch (e) {
      console.error("Erro ao limpar sala:", e);
      alert("Erro ao limpar mensagens.");
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
  const grupos: { msg: Mensagem; isOwn: boolean; showHeader: boolean }[] = mensagens.map(
    (msg, i) => {
      const prev = mensagens[i - 1];
      const isOwn = msg.autor === user.username;
      const showHeader =
        !prev || prev.autor !== msg.autor || msg.timestamp - prev.timestamp > 60_000;
      return { msg, isOwn, showHeader };
    }
  );

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
              {ROOM_ICONS[s]} {SETOR_LABEL[s]}
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
                    {SETOR_LABEL[msg.setor as keyof typeof SETOR_LABEL] ?? msg.setor}
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
                  <span className="ci-hora">{formatarHorario(msg.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={endRef} />
      </div>

      {/* Input de envio */}
      <div className="ci-input-area">
        <textarea
          ref={inputRef}
          className="ci-input"
          placeholder={`Falar em ${SETOR_LABEL[activeRoom]}…`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={enviando}
        />
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
