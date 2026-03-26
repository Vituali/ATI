// components/UserPanel.tsx
// ---------------------------------------------------------------
// Painel de perfil do usuário logado.
// Permite editar: nome completo, username, email, sgpUsername e senha.
// Username e Email exigem reautenticação pois são operações sensíveis.
// ---------------------------------------------------------------

import { useState } from "react";
import {
  updatePassword,
  updateProfile,
  updateEmail,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { ref, update, get, set, remove } from "firebase/database";
import { auth, db } from "../../services/firebase";
import Modal from "../ui/Modal";
import { UserProfile } from "../../hooks/useUser";
import { ROLE_LABEL, SETOR_LABEL } from "../../services/permissions";
import "./UserPanel.css";

interface UserPanelProps {
  user: UserProfile;
  aberto: boolean;
  onFechar: () => void;
  onLogout: () => void;
  bgUrl: string;
  onBgChange: (url: string) => void;
}

type Aba = "perfil" | "conta" | "senha" | "personalizar";
type Feedback = { msg: string; tipo: "ok" | "erro" } | null;

export default function UserPanel({
  user,
  aberto,
  onFechar,
  onLogout,
  bgUrl,
  onBgChange,
}: UserPanelProps) {
  const [aba, setAba] = useState<Aba>("perfil");
  const [tempBg, setTempBg] = useState(bgUrl);

  // --- ABA PERFIL: Nome + SGP Username ---
  const [nome, setNome] = useState(user.nomeCompleto);
  const [sgpUsername, setSgpUsername] = useState(user.sgpUsername ?? "");
  const [avatarUrlForm, setAvatarUrlForm] = useState(user.avatarUrl ?? "");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [feedbackPerfil, setFeedbackPerfil] = useState<Feedback>(null);

  // --- ABA CONTA: Username + Email (requer senha atual) ---
  const [novoUsername, setNovoUsername] = useState(user.username);
  const [novoEmail, setNovoEmail] = useState(user.email);
  const [senhaConfirm, setSenhaConfirm] = useState("");
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [feedbackConta, setFeedbackConta] = useState<Feedback>(null);
  const [mostrarSenhaConfirm, setMostrarSenhaConfirm] = useState(false);

  // --- ABA SENHA ---
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [feedbackSenha, setFeedbackSenha] = useState<Feedback>(null);
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  // --- Helpers ---
  function showFeedback(
    set: React.Dispatch<React.SetStateAction<Feedback>>,
    msg: string,
    tipo: "ok" | "erro",
  ) {
    set({ msg, tipo });
    setTimeout(() => set(null), 4000);
  }

  // --- SALVAR PERFIL (Nome + SGP) ---
  async function handleSalvarPerfil() {
    const nomeTrimmed = nome.trim();
    const sgpTrimmed = sgpUsername.trim();
    if (!nomeTrimmed) return;

    setSalvandoPerfil(true);
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: nomeTrimmed });
      }
      await update(ref(db, `atendentes/${user.username}`), {
        nomeCompleto: nomeTrimmed,
        sgpUsername: sgpTrimmed || null,
        avatarUrl: avatarUrlForm.trim() || null,
      });
      showFeedback(setFeedbackPerfil, "Perfil atualizado com sucesso!", "ok");
    } catch (e: any) {
      showFeedback(setFeedbackPerfil, "Erro: " + e.message, "erro");
    } finally {
      setSalvandoPerfil(false);
    }
  }

  // --- SALVAR CONTA (Username + Email) ---
  async function handleSalvarConta() {
    const usernameTrimmed = novoUsername
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const emailTrimmed = novoEmail.trim();

    if (!usernameTrimmed || !emailTrimmed || !senhaConfirm) {
      showFeedback(
        setFeedbackConta,
        "Preencha todos os campos, incluindo a senha de confirmação.",
        "erro",
      );
      return;
    }
    if (/[.$#[\]/]/.test(usernameTrimmed)) {
      showFeedback(
        setFeedbackConta,
        "Username inválido. Evite pontos, #, $, [ ou ].",
        "erro",
      );
      return;
    }

    const usernameChanged = usernameTrimmed !== user.username;
    const emailChanged = emailTrimmed !== user.email;

    if (!usernameChanged && !emailChanged) {
      showFeedback(setFeedbackConta, "Nenhuma alteração detectada.", "erro");
      return;
    }

    setSalvandoConta(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !firebaseUser.email)
        throw new Error("Usuário não autenticado.");

      // Reautenticar sempre
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        senhaConfirm,
      );
      await reauthenticateWithCredential(firebaseUser, credential);

      // 0) Verificar se o e-mail já existe no banco de dados (para outro usuário)
      if (emailChanged) {
        const atendentesSnap = await get(ref(db, "atendentes"));
        if (atendentesSnap.exists()) {
          let emailExiste = false;
          atendentesSnap.forEach((child) => {
            if (child.key !== user.username && child.child("email").val() === emailTrimmed) {
              emailExiste = true;
            }
          });
          if (emailExiste) {
            showFeedback(setFeedbackConta, "Este e-mail já está sendo usado por outro atendente.", "erro");
            setSenhaConfirm("");
            setSalvandoConta(false);
            return;
          }
        }
      }

      // 1) Mudar E-mail no Firebase Auth (e no DB)
      let emailPendente = false;
      if (emailChanged) {
        try {
          // Prioriza o método de verificação, que é o padrão atual do Firebase e mais seguro
          await verifyBeforeUpdateEmail(firebaseUser, emailTrimmed);
          emailPendente = true;
          showFeedback(setFeedbackConta, "📨 Link enviado! A troca será concluída assim que você confirmar no novo e-mail (Cheque o Spam).", "ok");
        } catch (e: any) {
          // Fallback para updateEmail se as regras de negócio permitirem (raro hoje em dia)
          try {
            await updateEmail(firebaseUser, emailTrimmed);
            // Se logrou êxito direto, atualiza no banco agora
            await update(ref(db, `atendentes/${user.username}`), { email: emailTrimmed });
          } catch (updateErr: any) {
            console.error("Erro na troca de email:", updateErr);
            throw updateErr;
          }
        }
      }

      // 2) Migrar Username (chave do banco)
      if (usernameChanged) {
        // Verifica se já existe
        const checkSnap = await get(ref(db, `atendentes/${usernameTrimmed}`));
        if (checkSnap.exists()) {
          showFeedback(
            setFeedbackConta,
            "Este username já está em uso.",
            "erro",
          );
          return;
        }

        // Lê os dados atuais do usuário
        const currentSnap = await get(ref(db, `atendentes/${user.username}`));
        const currentData = currentSnap.val();

        // Migra dados associados ao username antigo
        const [respostasSnap, catOrdemSnap, modelosSnap] = await Promise.all([
          get(ref(db, `respostas/${user.username}`)),
          get(ref(db, `categorias_ordem/${user.username}`)),
          get(ref(db, `modelos_os/${user.username}`)),
        ]);

        // 1) Primeiro cria o novo registro de atendente (chave principal de permissão)
        // Se o email está pendente de verificação, mantemos o email antigo no banco para não quebrar o login via username
        await set(ref(db, `atendentes/${usernameTrimmed}`), {
          ...currentData,
          email: emailPendente ? user.email : (emailChanged ? emailTrimmed : currentData.email),
          username: usernameTrimmed,
          migradoEm: Date.now(),
        });

        // Delay para propagação de regras do Firebase RTDB (ajuda a evitar Permission Denied imediato)
        await new Promise((resolve) => setTimeout(resolve, 800));

        // 2) Tenta migrar dados secundários um a um
        const migrarNo = async (pathRaiz: string, snap: any) => {
          if (!snap.exists()) return;
          try {
            await set(ref(db, `${pathRaiz}/${usernameTrimmed}`), snap.val());
            await remove(ref(db, `${pathRaiz}/${user.username}`));
          } catch (error) {
            console.error(`Erro ao migrar ${pathRaiz}:`, error);
          }
        };

        await Promise.all([
          migrarNo("respostas", respostasSnap),
          migrarNo("categorias_ordem", catOrdemSnap),
          migrarNo("modelos_os", modelosSnap),
          migrarNo("anotacoes", await get(ref(db, `anotacoes/${user.username}`))),
        ]);

        // 3) Remove o registro de atendente antigo por último
        await remove(ref(db, `atendentes/${user.username}`));
      }

      setSenhaConfirm("");
      
      let msgSucesso = "Conta atualizada com sucesso!";
      if (usernameChanged) msgSucesso = "Username alterado! Prepare-se para o logout.";
      if (emailPendente) msgSucesso = `📨 ${msgSucesso} IMPORTANTE: Link enviado ao novo e-mail. A troca só valerá após confirmar (cheque o SPAM).`;
      else if (emailChanged) msgSucesso = "E-mail e conta atualizados! Prepare-se para o logout.";

      showFeedback(setFeedbackConta, msgSucesso, "ok");

      // Se mudou username (imediato) ou email (se foi imediato, sem pendência), faz logout
      const logoutNecessario = usernameChanged || (emailChanged && !emailPendente);

      if (logoutNecessario) {
        setTimeout(() => onLogout(), 3500);
      }
    } catch (e: any) {
      console.error("Erro completo ao salvar conta:", e);
      const msg =
        e.code === "auth/wrong-password" || e.code === "auth/invalid-credential"
          ? "Senha de confirmação incorreta."
          : e.code === "auth/email-already-in-use"
            ? "Este e-mail já está em uso."
            : e.code === "auth/invalid-email"
              ? "E-mail inválido."
              : e.code === "auth/too-many-requests"
                ? "Muitas tentativas. Aguarde e tente novamente."
              : e.code === "auth/operation-not-allowed" || e.code.includes("verification")
                ? "Ação exigida: Um e-mail de confirmação foi enviado ao novo endereço."
                : "Erro: " + e.message;
      showFeedback(setFeedbackConta, msg, "erro");
    } finally {
      setSalvandoConta(false);
    }
  }

  // --- SALVAR SENHA ---
  async function handleSalvarSenha() {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      showFeedback(setFeedbackSenha, "Preencha todos os campos.", "erro");
      return;
    }
    if (novaSenha.length < 8) {
      showFeedback(
        setFeedbackSenha,
        "A nova senha deve ter no mínimo 8 caracteres.",
        "erro",
      );
      return;
    }
    if (novaSenha !== confirmarSenha) {
      showFeedback(setFeedbackSenha, "As senhas não coincidem.", "erro");
      return;
    }

    setSalvandoSenha(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !firebaseUser.email)
        throw new Error("Usuário não autenticado.");

      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        senhaAtual,
      );
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, novaSenha);

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      showFeedback(setFeedbackSenha, "Senha alterada com sucesso!", "ok");
    } catch (e: any) {
      const msg =
        e.code === "auth/wrong-password" || e.code === "auth/invalid-credential"
          ? "Senha atual incorreta."
          : e.code === "auth/too-many-requests"
            ? "Muitas tentativas. Aguarde e tente novamente."
            : "Erro: " + e.message;
      showFeedback(setFeedbackSenha, msg, "erro");
    } finally {
      setSalvandoSenha(false);
    }
  }

  const perfilAlterado =
    nome.trim() !== user.nomeCompleto ||
    sgpUsername.trim() !== (user.sgpUsername ?? "") ||
    avatarUrlForm.trim() !== (user.avatarUrl ?? "");

  const contaAlterada =
    novoUsername.trim().toLowerCase() !== user.username ||
    novoEmail.trim() !== user.email;

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="👤 Meu Perfil"
      largura="480px"
    >
      {/* Cabeçalho com avatar e info base */}
      <div className="up-header">
        <div className="up-avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" crossOrigin="anonymous" referrerPolicy="no-referrer" className="up-avatar-img" />
          ) : (
            user.nomeCompleto.charAt(0).toUpperCase()
          )}
        </div>
        <div className="up-header-info">
          <span className="up-nome">{user.nomeCompleto}</span>
          <span className="up-username">@{user.username}</span>
          <div className="up-badges">
            <span className="up-badge role">{ROLE_LABEL[user.role]}</span>
            <span className="up-badge setor">{SETOR_LABEL[user.setor]}</span>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="up-tabs">
        <button
          className={`up-tab ${aba === "perfil" ? "ativo" : ""}`}
          onClick={() => setAba("perfil")}
        >
          ✏️ Perfil
        </button>
        <button
          className={`up-tab ${aba === "conta" ? "ativo" : ""}`}
          onClick={() => setAba("conta")}
        >
          🔑 Conta
        </button>
        <button
          className={`up-tab ${aba === "senha" ? "ativo" : ""}`}
          onClick={() => setAba("senha")}
        >
          🔒 Senha
        </button>
        <button
          className={`up-tab ${aba === "personalizar" ? "ativo" : ""}`}
          onClick={() => setAba("personalizar")}
        >
          🎨 Estilo
        </button>
      </div>

      {/* ABA: PERFIL — Nome + SGP Username */}
      {aba === "perfil" && (
        <div className="up-section">
          <div className="up-grupo">
            <label htmlFor="up-nome-input">Nome completo</label>
            <input
              id="up-nome-input"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="up-grupo">
            <label htmlFor="up-sgp-input">
              Usuário SGP
              <span className="up-label-dica"> (login SGP)</span>
            </label>
            <input
              id="up-sgp-input"
              type="text"
              value={sgpUsername}
              onChange={(e) => setSgpUsername(e.target.value)}
              placeholder="Deixe vazio se igual ao username"
            />
          </div>

          {feedbackPerfil && (
            <div className={`up-feedback ${feedbackPerfil.tipo}`}>
              {feedbackPerfil.tipo === "ok" ? "✅" : "❌"} {feedbackPerfil.msg}
            </div>
          )}

          <button
            className="up-btn-salvar"
            onClick={handleSalvarPerfil}
            disabled={!perfilAlterado || salvandoPerfil}
          >
            {salvandoPerfil ? "Salvando..." : "💾 Salvar Perfil"}
          </button>
        </div>
      )}

      {/* ABA: CONTA — Username + Email */}
      {aba === "conta" && (
        <div className="up-section">
          <div className="up-aviso-conta">
            ⚠️ Alterar username ou e-mail requer confirmação de senha e causará
            logout automático.
          </div>

          <div className="up-grupo">
            <label htmlFor="up-username-input">Username</label>
            <input
              id="up-username-input"
              type="text"
              value={novoUsername}
              onChange={(e) => setNovoUsername(e.target.value)}
              placeholder="novo.username"
              autoComplete="username"
            />
          </div>

          <div className="up-grupo">
            <label htmlFor="up-email-input">E-mail</label>
            <input
              id="up-email-input"
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="email@exemplo.com"
              autoComplete="email"
            />
          </div>

          <div className="up-grupo">
            <label htmlFor="up-senha-confirm">
              Senha atual <span className="up-label-obrig">*obrigatória</span>
            </label>
            <div className="up-senha-wrapper">
              <input
                id="up-senha-confirm"
                type={mostrarSenhaConfirm ? "text" : "password"}
                value={senhaConfirm}
                onChange={(e) => setSenhaConfirm(e.target.value)}
                placeholder="Confirme sua senha atual"
                autoComplete="current-password"
              />
              <button
                className="up-olho"
                type="button"
                onClick={() => setMostrarSenhaConfirm((v) => !v)}
              >
                {mostrarSenhaConfirm ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {feedbackConta && (
            <div className={`up-feedback ${feedbackConta.tipo}`}>
              {feedbackConta.tipo === "ok" ? "✅" : "❌"} {feedbackConta.msg}
            </div>
          )}

          <button
            className="up-btn-salvar"
            onClick={handleSalvarConta}
            disabled={!contaAlterada || !senhaConfirm || salvandoConta}
          >
            {salvandoConta ? "Salvando..." : "💾 Salvar Conta"}
          </button>
        </div>
      )}

      {/* ABA: SENHA */}
      {aba === "senha" && (
        <div className="up-section">
          <div className="up-grupo">
            <label htmlFor="up-senha-atual">Senha atual</label>
            <div className="up-senha-wrapper">
              <input
                id="up-senha-atual"
                type={mostrarSenhaAtual ? "text" : "password"}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                className="up-olho"
                type="button"
                onClick={() => setMostrarSenhaAtual((v) => !v)}
              >
                {mostrarSenhaAtual ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="up-grupo">
            <label htmlFor="up-nova-senha">Nova senha</label>
            <div className="up-senha-wrapper">
              <input
                id="up-nova-senha"
                type={mostrarNovaSenha ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
              <button
                className="up-olho"
                type="button"
                onClick={() => setMostrarNovaSenha((v) => !v)}
              >
                {mostrarNovaSenha ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="up-grupo">
            <label htmlFor="up-confirmar-senha">Confirmar nova senha</label>
            <div className="up-senha-wrapper">
              <input
                id="up-confirmar-senha"
                type={mostrarConfirmarSenha ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
              <button
                className="up-olho"
                type="button"
                onClick={() => setMostrarConfirmarSenha((v) => !v)}
              >
                {mostrarConfirmarSenha ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {feedbackSenha && (
            <div className={`up-feedback ${feedbackSenha.tipo}`}>
              {feedbackSenha.tipo === "ok" ? "✅" : "❌"} {feedbackSenha.msg}
            </div>
          )}

          <button
            className="up-btn-salvar"
            onClick={handleSalvarSenha}
            disabled={salvandoSenha}
          >
            {salvandoSenha ? "Alterando..." : "🔒 Alterar Senha"}
          </button>
        </div>
      )}

      {/* ABA: PERSONALIZAR — Fundo customizado */}
      {aba === "personalizar" && (
        <div className="up-section">
          <div className="up-aviso-custom">
            ✨ Dê um toque pessoal à sua área de trabalho! Use links diretos de
            imagens, GIFs ou vídeos.
            <div className="up-bg-links">
              <a href="https://tenor.com" target="_blank" rel="noreferrer">
                🎬 Tenor
              </a>
              <a href="https://giphy.com" target="_blank" rel="noreferrer">
                👾 Giphy
              </a>
              <a
                href="https://motionbgs.com"
                target="_blank"
                rel="noreferrer"
                className="up-link-destaque"
              >
                🌈 MotionBGs
              </a>
            </div>
          </div>

          <div className="up-grupo">
            <label htmlFor="up-bg-input">
              URL do plano de fundo (Imagem ou GIF)
            </label>
            <div className="up-bg-wrapper">
              <input
                id="up-bg-input"
                type="text"
                value={tempBg}
                onChange={(e) => setTempBg(e.target.value)}
                placeholder="https://exemplo.com/imagem.gif"
              />
              {tempBg && (
                <button
                  className="up-bg-clear"
                  onClick={() => {
                    setTempBg("");
                    onBgChange("");
                  }}
                  title="Remover fundo"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="up-bg-preview-wrap">
            <p className="up-label-dica">Preview</p>
            <div className="up-bg-preview">
              {tempBg ? (
                (() => {
                  const cleanUrl = tempBg.split("?")[0].toLowerCase();
                  const isVideo =
                    cleanUrl.endsWith(".mp4") ||
                    cleanUrl.endsWith(".webm") ||
                    cleanUrl.endsWith(".ogg");

                  return isVideo ? (
                    <video
                      src={tempBg}
                      autoPlay
                      loop
                      muted
                      playsInline
                      // @ts-expect-error: referrerPolicy is valid for video but missing in React types
                      referrerPolicy="no-referrer"
                      className="up-bg-video-preview"
                    />
                  ) : (
                    <img
                      src={tempBg}
                      alt=""
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className="up-bg-image-preview"
                    />
                  );
                })()
              ) : (
                <span>Sem fundo</span>
              )}
            </div>
          </div>

          <div className="up-grupo" style={{ marginTop: "1rem" }}>
            <label htmlFor="up-avatar-input">
              URL da Foto de Perfil (Avatar)
            </label>
            <input
              id="up-avatar-input"
              type="text"
              value={avatarUrlForm}
              onChange={(e) => setAvatarUrlForm(e.target.value)}
              placeholder="https://exemplo.com/foto.jpg"
            />
          </div>

          <button
            className="up-btn-salvar"
            onClick={async () => {
              await handleSalvarPerfil();
              onBgChange(tempBg.trim());
            }}
            disabled={
              (!perfilAlterado && tempBg.trim() === bgUrl) || salvandoPerfil
            }
          >
            {salvandoPerfil ? "Salvando Estilo..." : "💾 Salvar Estilo"}
          </button>
        </div>
      )}

      {/* Rodapé — Logout */}
      <div className="up-footer">
        <button className="up-btn-logout" onClick={onLogout}>
          🚪 Sair da conta
        </button>
      </div>
    </Modal>
  );
}
