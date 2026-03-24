// pages/Home.tsx
// ---------------------------------------------------------------
// Página inicial exibida após o login.
// Mostra boas-vindas, perfil completo (incluindo SGP) e atalhos rápidos.
// ---------------------------------------------------------------

import { UserProfile } from "../hooks/useUser";
import {
  isPendente,
  SETOR_LABEL,
  ROLE_LABEL,
  getAllowedSections,
  Section,
} from "../services/permissions";
import "./Home.css";
import AvisosHome from "../components/AvisosHome";

interface HomeProps {
  user: UserProfile;
  onSelectSection: (section: Section) => void;
}

function getSaudacao(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

const SECTION_META: Record<
  Section,
  { icon: string; label: string; desc: string; color: string }
> = {
  home: {
    icon: "🏠",
    label: "Home",
    desc: "Página inicial",
    color: "#64b5f6",
  },
  chat_interno: {
    icon: "💬",
    label: "Chat Interno",
    desc: "Chat interno",
    color: "#4dd0e1",
  },
  chat: {
    icon: "🗨️",
    label: "Chat Automatizado",
    desc: "Respostas rápidas e categorizadas para atendimentos",
    color: "#4dd0e1",
  },
  os: {
    icon: "📝",
    label: "Modelos de O.S.",
    desc: "Templates de ordens de serviço para o SGP",
    color: "#aed581",
  },
  conversor: {
    icon: "📄",
    label: "Conversor de Aditivo",
    desc: "Extrai dados de PDFs de aditivo e gera O.S. formatada",
    color: "#ffb74d",
  },
  senhas: {
    icon: "🔑",
    label: "Senhas",
    desc: "Logins e acessos rápidos a equipamentos e sistemas",
    color: "#f06292",
  },
  relatorios: {
    icon: "📊",
    label: "Relatórios",
    desc: "Visão gerencial e indicadores de atendimento",
    color: "#ba68c8",
  },
  admin: {
    icon: "🛡️",
    label: "Admin",
    desc: "Gerenciamento de usuários, roles e setores",
    color: "#0064ff",
  },
};

export default function Home({ user, onSelectSection }: HomeProps) {
  const pendente = isPendente(user.setor);
  const primeiroNome = user.nomeCompleto.split(" ")[0];
  const inicial = primeiroNome.charAt(0).toUpperCase();

  // Seções acessíveis (excluindo home)
  const acessos = getAllowedSections(user.role, user.setor).filter(
    (s) => s !== "home",
  );

  return (
    <div className="home-page">
      {/* ── Avisos ── */}
      <AvisosHome user={user} />

      {/* ── Hero / Saudação ── */}
      <div className="home-hero">
        <div className="home-hero-glow" />
        <div className="home-avatar-wrap">
          <div className="home-avatar">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="home-avatar-img"
              />
            ) : (
              inicial
            )}
          </div>
          <div className="home-avatar-ring" />
        </div>
        <div className="home-hero-text">
          <h1 className="home-titulo">
            {getSaudacao()},{" "}
            <span className="home-nome-accent">{primeiroNome}</span>! 👋
          </h1>
          <p className="home-subtitulo">
            Bem-vindo ao ATI — Auxiliar de Atendimentos
          </p>
          <div className="home-hero-badges">
            <span className={`home-badge role-${user.role}`}>
              {ROLE_LABEL[user.role]}
            </span>
            <span
              className={`home-badge setor ${pendente ? "pendente" : "ok"}`}
            >
              {SETOR_LABEL[user.setor]}
            </span>
            <span className="home-badge ok">Ativo</span>
          </div>
        </div>
      </div>

      {/* ── Aviso de setor pendente ── */}
      {pendente && (
        <div className="home-aviso">
          <span className="home-aviso-icon">⏳</span>
          <div>
            <strong>Acesso pendente</strong>
            <p>
              Sua conta foi criada, mas você ainda está no setor{" "}
              <strong>Geral</strong>. Um administrador precisa atribuir seu
              setor para liberar as demais funcionalidades.
            </p>
          </div>
        </div>
      )}

      {/* ── Grade dupla: Perfil + SGP ── */}
      <div className="home-cards-row">
        {/* Card de Perfil */}
        <div className="home-card">
          <div className="home-card-header">
            <span className="home-card-icon">👤</span>
            <h2 className="home-card-titulo">Seu Perfil</h2>
          </div>
          <div className="home-info-grid">
            <div className="home-info-item">
              <span className="home-info-label">Usuário</span>
              <span className="home-info-valor mono">@{user.username}</span>
            </div>
            <div className="home-info-item">
              <span className="home-info-label">Nome</span>
              <span className="home-info-valor">{user.nomeCompleto}</span>
            </div>
            <div className="home-info-item">
              <span className="home-info-label">E-mail</span>
              <span className="home-info-valor" style={{ fontSize: "0.9rem" }}>
                {user.email}
              </span>
            </div>
            <div className="home-info-item">
              <span className="home-info-label">Setor</span>
              <span
                className={`home-badge setor ${pendente ? "pendente" : "ok"}`}
              >
                {SETOR_LABEL[user.setor]}
              </span>
            </div>
          </div>
        </div>

        {/* Card SGP */}
        <div className="home-card home-card-sgp">
          <div className="home-card-header">
            <span className="home-card-icon">🖥️</span>
            <h2 className="home-card-titulo">SGP</h2>
          </div>
          <div
            className="home-info-grid"
            style={{ gridTemplateColumns: "1fr" }}
          >
            <div className="home-info-item">
              <span className="home-info-label">Usuário SGP</span>
              {user.sgpUsername ? (
                <span className="home-info-valor mono">
                  @{user.sgpUsername}
                </span>
              ) : (
                <span className="home-info-sgp-vazio">
                  Não configurado —{" "}
                  <span className="home-info-sgp-dica">
                    edite no painel de perfil 👤
                  </span>
                </span>
              )}
            </div>
            <div className="home-info-item">
              <span className="home-info-label">Acesso externo</span>
              <a
                href="https://sgp.atiinternet.com.br/admin/"
                target="_blank"
                rel="noopener noreferrer"
                className="home-sgp-link"
              >
                sgp.atiinternet.com.br ↗
              </a>
            </div>
            <div className="home-info-item">
              <span className="home-info-label">Acesso interno</span>
              <a
                href="http://201.158.20.35:8000/"
                target="_blank"
                rel="noopener noreferrer"
                className="home-sgp-link"
              >
                201.158.20.35:8000 ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Acesso rápido às seções ── */}
      {!pendente && acessos.length > 0 && (
        <div className="home-card">
          <div className="home-card-header">
            <span className="home-card-icon">⚡</span>
            <h2 className="home-card-titulo">Acesso rápido</h2>
          </div>
          <p className="home-card-desc">
            Use a barra lateral ou clique nos atalhos abaixo para navegar pelo
            sistema.
          </p>
          <div className="home-shortcuts-grid">
            {acessos.map((section) => {
              const meta = SECTION_META[section];
              return (
                <div
                  key={section}
                  className="home-shortcut"
                  onClick={() => onSelectSection(section)}
                  style={
                    { "--shortcut-color": meta.color } as React.CSSProperties
                  }
                >
                  <span className="home-shortcut-icon">{meta.icon}</span>
                  <div className="home-shortcut-info">
                    <span className="home-shortcut-label">{meta.label}</span>
                    <span className="home-shortcut-desc">{meta.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
