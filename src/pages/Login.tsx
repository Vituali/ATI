// pages/Login.tsx
import { useState } from "react";
import { login } from "../services/auth";
import "./Auth.css";

interface LoginProps {
  // Avisa o App.tsx que o login foi bem-sucedido
  onLogin: () => void;
  // Troca para a tela de cadastro
  onGoToRegister: () => void;
}

export default function Login({ onLogin, onGoToRegister }: LoginProps) {
  // Aceita username OU email — igual ao site original
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword]               = useState("");

  // Mensagem de erro exibida abaixo do formulário
  const [error, setError]     = useState("");

  // Desabilita o botão enquanto aguarda o Firebase responder
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(usernameOrEmail, password);
      onLogin(); // avisa o App.tsx: pode mostrar o app agora
    } catch (err: any) {
      // Traduz os erros mais comuns do Firebase para português
      if (err.code === "auth/invalid-credential" ||
          err.code === "auth/user-not-found"     ||
          err.code === "auth/wrong-password") {
        setError("Usuário ou senha incorretos.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde alguns minutos.");
      } else {
        setError(err.message || "Erro ao fazer login.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-titulo">🤖 ATI</h1>
        <p className="auth-subtitulo">Auxiliar de Atendimentos</p>

        <form onSubmit={handleSubmit} className="auth-form">

          <div className="auth-grupo">
            <label htmlFor="usernameOrEmail">Usuário ou E-mail</label>
            <input
              id="usernameOrEmail"
              name="usernameOrEmail"
              type="text"
              placeholder="seu.usuario ou email@exemplo.com"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="auth-grupo">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Só exibe o erro se houver algum */}
          {error && <p className="auth-erro">{error}</p>}

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

        </form>

        <p className="auth-link">
          Não tem conta?{" "}
          <button onClick={onGoToRegister} className="auth-link-btn">
            Cadastre-se
          </button>
        </p>
      </div>
    </div>
  );
}
