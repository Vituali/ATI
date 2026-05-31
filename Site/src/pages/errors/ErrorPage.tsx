// pages/ErrorPage.tsx
// ---------------------------------------------------------------
// Página de erro amigável com mensagens específicas por tipo.
// Recebe o erro como string e mapeia para um conteúdo rico.
// ---------------------------------------------------------------

import { logout } from "../../services/auth";
import "./ErrorPage.css";

interface ErrorPageProps {
  message: string;
}

// Tipos de erro conhecidos com conteúdo personalizado
interface ErrorContent {
  icon: string;
  titulo: string;
  descricao: string;
  dica: string;
  acao: "logout" | "reload";
  acaoLabel: string;
}

// Mapeia fragmentos da mensagem de erro para conteúdo amigável
function resolveErrorContent(message: string): ErrorContent {
  const msg = message.toLowerCase();

  if (msg.includes("inativa")) {
    return {
      icon: "🔒",
      titulo: "Conta inativa",
      descricao: "Sua conta foi desativada pelo administrador do sistema.",
      dica: "Entre em contato com o administrador para reativar seu acesso.",
      acao: "logout",
      acaoLabel: "Voltar ao login",
    };
  }

  if (msg.includes("perfil não encontrado") || msg.includes("banco de dados")) {
    return {
      icon: "👤",
      titulo: "Perfil não encontrado",
      descricao:
        "Sua conta foi autenticada, mas os dados de perfil não estão no banco.",
      dica: "Isso pode acontecer após um cadastro incompleto. Contate o administrador informando seu e-mail.",
      acao: "logout",
      acaoLabel: "Tentar novamente",
    };
  }

  if (msg.includes("permiss") || msg.includes("403")) {
    return {
      icon: "⛔",
      titulo: "Sem permissão",
      descricao: "Você não tem autorização para acessar este recurso.",
      dica: "Solicite ao administrador que verifique sua role e setor.",
      acao: "logout",
      acaoLabel: "Voltar ao login",
    };
  }

  if (
    msg.includes("rede") ||
    msg.includes("network") ||
    msg.includes("fetch")
  ) {
    return {
      icon: "📡",
      titulo: "Erro de conexão",
      descricao: "Não foi possível conectar ao servidor.",
      dica: "Verifique sua conexão com a internet e tente novamente.",
      acao: "reload",
      acaoLabel: "Tentar novamente",
    };
  }

  // Erro genérico
  return {
    icon: "⚠️",
    titulo: "Algo deu errado",
    descricao: message || "Ocorreu um erro inesperado no sistema.",
    dica: "Se o problema persistir, contate o administrador do sistema.",
    acao: "logout",
    acaoLabel: "Voltar ao login",
  };
}

export default function ErrorPage({ message }: ErrorPageProps) {
  const content = resolveErrorContent(message);

  function handleAcao() {
    if (content.acao === "logout") {
      logout();
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="error-page">
      <div className="error-card">
        <span className="error-icon">{content.icon}</span>

        <div className="error-body">
          <h1 className="error-titulo">{content.titulo}</h1>
          <p className="error-descricao">{content.descricao}</p>

          <div className="error-dica">
            <span className="error-dica-icon">💡</span>
            <p>{content.dica}</p>
          </div>

          {/* Mensagem técnica em detalhe colapsável */}
          <details className="error-detalhe">
            <summary>Detalhes técnicos</summary>
            <code>{message}</code>
          </details>
        </div>

        <button className="error-btn" onClick={handleAcao}>
          {content.acaoLabel}
        </button>
      </div>
    </div>
  );
}
