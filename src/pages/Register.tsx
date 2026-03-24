// pages/Register.tsx
import { useState } from "react";
import { register } from "../services/auth";
import "./Auth.css";

interface RegisterProps {
  onLogin:     () => void;
  onGoToLogin: () => void;
}

export default function Register({ onLogin, onGoToLogin }: RegisterProps) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      // Sem setor — auth.ts define "geral" automaticamente
      await register({ username, fullName, email, password });
      onLogin();
    } catch (err: any) {
      if      (err.code === "auth/email-already-in-use") setError("Este e-mail já está cadastrado.");
      else if (err.code === "auth/invalid-email")        setError("E-mail inválido.");
      else if (err.code === "auth/weak-password")        setError("Senha fraca. Use ao menos 8 caracteres.");
      else                                               setError(err.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-titulo">🤖 ATI</h1>
        <p className="auth-subtitulo">Criar nova conta</p>

        <form onSubmit={handleSubmit} className="auth-form">

          <div className="auth-grupo">
            <label htmlFor="username">Nome de usuário</label>
            <input
              id="username" name="username" type="text" placeholder="ex: joao.silva"
              value={username} onChange={(e) => setUsername(e.target.value)}
              required autoFocus
            />
            <span className="auth-dica">
              Sem espaços ou caracteres especiais (#, $, [ ]). Use letras, números e underline.
            </span>
          </div>

          <div className="auth-grupo">
            <label htmlFor="fullName">Nome completo</label>
            <input
              id="fullName" name="fullName" type="text" placeholder="João Silva"
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="auth-grupo">
            <label htmlFor="email">E-mail</label>
            <input
              id="email" name="email" type="email" placeholder="joao@exemplo.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-grupo">
            <label htmlFor="password">Senha</label>
            <input
              id="password" name="password" type="password" placeholder="mínimo 8 caracteres"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete="new-password"
            />
          </div>

          {error && <p className="auth-erro">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

        </form>

        <p className="auth-link">
          Já tem conta?{" "}
          <button onClick={onGoToLogin} className="auth-link-btn">Entrar</button>
        </p>
      </div>
    </div>
  );
}
