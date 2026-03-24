// pages/Home.tsx
// ---------------------------------------------------------------
// Página inicial exibida após o login.
// Mostra boas-vindas, info do usuário e aviso se setor for "geral".
// ---------------------------------------------------------------

import { UserProfile } from "../hooks/useUser";
import { isPendente, SETOR_LABEL, ROLE_LABEL } from "../services/permissions";
import "./Home.css";

interface HomeProps {
  user: UserProfile;
}

// Saudação baseada no horário
function getSaudacao(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Home({ user }: HomeProps) {
  const pendente = isPendente(user.setor);

  return (
    <div className="home-page">

      {/* Saudação */}
      <div className="home-header">
        <h1 className="home-titulo">
          {getSaudacao()}, {user.nomeCompleto.split(" ")[0]}! 👋
        </h1>
        <p className="home-subtitulo">Bem-vindo ao ATI — Auxiliar de Atendimentos</p>
      </div>

      {/* Aviso de setor pendente */}
      {pendente && (
        <div className="home-aviso">
          <span className="home-aviso-icon">⏳</span>
          <div>
            <strong>Acesso pendente</strong>
            <p>
              Sua conta foi criada com sucesso, mas você ainda está no setor{" "}
              <strong>Geral</strong>. Um administrador precisa atribuir seu setor
              para liberar as demais funcionalidades.
            </p>
          </div>
        </div>
      )}

      {/* Card de info do usuário */}
      <div className="home-card">
        <h2 className="home-card-titulo">Seu perfil</h2>
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
            <span className="home-info-valor">{user.email}</span>
          </div>

          <div className="home-info-item">
            <span className="home-info-label">Setor</span>
            <span className={`home-badge setor ${pendente ? "pendente" : "ok"}`}>
              {SETOR_LABEL[user.setor]}
            </span>
          </div>

          <div className="home-info-item">
            <span className="home-info-label">Role</span>
            <span className={`home-badge role role-${user.role}`}>
              {ROLE_LABEL[user.role]}
            </span>
          </div>

          <div className="home-info-item">
            <span className="home-info-label">Status</span>
            <span className="home-badge ok">Ativo</span>
          </div>

        </div>
      </div>

      {/* Card de acesso rápido — só aparece se não for pendente */}
      {!pendente && (
        <div className="home-card">
          <h2 className="home-card-titulo">Acesso rápido</h2>
          <p className="home-card-desc">
            Use a barra lateral para navegar entre as seções disponíveis para o
            setor <strong>{SETOR_LABEL[user.setor]}</strong>.
          </p>
        </div>
      )}

    </div>
  );
}
