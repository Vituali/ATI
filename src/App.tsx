// App.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useUser, UserProfile } from "./hooks/useUser";
import { canAccess, Section } from "./services/permissions";
import { logout } from "./services/auth";

import Sidebar from "./components/layout/Sidebar";
import Footer from "./components/layout/Footer";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Home from "./pages/app/Home";
import RespostasRapidas from "./pages/app/RespostasRapidas";
import ModelosOS from "./pages/app/ModelosOS";
import Conversor from "./pages/app/Conversor";
import Senhas from "./pages/app/Senhas";
import Admin from "./pages/app/Admin";
import ErrorPage from "./pages/errors/ErrorPage";
import ChatInterno from "./pages/app/ChatInterno";
import Anotacoes from "./pages/app/Anotacoes";
import { ref, onValue, off } from "firebase/database";
import { db } from "./services/firebase";
import "./App.css";

import LoadingOverlay from "./components/ui/LoadingOverlay";
import UserPanel from "./components/app/UserPanel";
import ExtensionModal from "./pages/app/Extension";
import ToastContainer from "./components/ui/Toast";

type AuthScreen = "login" | "register";

export default function App() {
  const { user, loading, error } = useUser();
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [currentSection, setCurrentSection] = useState<Section>("home");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("ati-theme") as "dark" | "light") || "dark";
  });
  const [userPanelAberto, setUserPanelAberto] = useState(false);
  const [extensaoModalAberto, setExtensaoModalAberto] = useState(false);
  const [bgUrl, setBgUrl] = useState(() => {
    return localStorage.getItem("ati-custom-bg") || "";
  });

  const lastSeenRef = useRef(Number(localStorage.getItem("lastSeenChat") || 0));

  // Notificações de Chat
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  const renderSection = useCallback((section: Section, user: UserProfile) => {
    switch (section) {
      case "home":
        return <Home user={user} onSelectSection={setCurrentSection} />;
      case "chat_interno":
        return <ChatInterno />;
      case "anotacoes":
        return <Anotacoes />;
      case "respostas_rapidas":
        return <RespostasRapidas />;
      case "modelos_os":
        return <ModelosOS />;
      case "conversor":
        return <Conversor />;
      case "senhas":
        return <Senhas />;
      case "relatorios":
        return <div>Relatórios — em breve</div>;
      case "admin":
        return <Admin />;
    }
  }, [setCurrentSection]);

  // Notificações em real-time (Escutando apenas o nó meta leve)
  useEffect(() => {
    if (!user || currentSection === "chat_interno") return;

    const q = ref(db, "chat/meta");
    const unsubscribe = onValue(q, (snap) => {
      if (!snap.exists()) return;

      let overallLatestMsg: any = null;

      // Encontra a mensagem mais recente entre todas as salas através do meta
      snap.forEach((roomMetaSnap) => {
        const meta = roomMetaSnap.child("ultimaMensagem").val();
        if (meta && (!overallLatestMsg || meta.timestamp > overallLatestMsg.timestamp)) {
          overallLatestMsg = meta;
        }
      });

      if (overallLatestMsg && overallLatestMsg.autor !== user.username) {
        if (overallLatestMsg.timestamp > lastSeenRef.current) {
          setHasUnreadChat(true);

          // Som de notificação
          const audio = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
          );
          audio.volume = 0.4;
          audio.play().catch(() => {});
        }
      }
    });

    return () => off(q, "value", unsubscribe as any);
  }, [user, currentSection]);

  // Limpa notificação ao entrar no chat
  useEffect(() => {
    if (currentSection === "chat_interno") {
      setHasUnreadChat(false);
      lastSeenRef.current = Date.now();
      localStorage.setItem("lastSeenChat", lastSeenRef.current.toString());
    }
  }, [currentSection]);

  // Document Title com badge
  useEffect(() => {
    const baseTitle = "ATI V2 — Auxiliar de Atendimento";
    if (hasUnreadChat) {
      document.title = `(1) 💬 Mensagem nova! | ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [hasUnreadChat]);

  // Altera a classe no body e salva no localStorage para persistir
  useEffect(() => {
    document.body.classList.toggle("light-theme", theme === "light");
    localStorage.setItem("ati-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleBgChange = (url: string) => {
    setBgUrl(url);
    if (url) {
      localStorage.setItem("ati-custom-bg", url);
    } else {
      localStorage.removeItem("ati-custom-bg");
    }
  };

  // Carregando sessão
  if (loading) {
    return <LoadingOverlay fullScreen message="Carregando Sistema" />;
  }

  // Erro de perfil → página de erro amigável
  if (error) {
    return <ErrorPage message={error} />;
  }

  // Não logado
  if (!user) {
    if (authScreen === "register") {
      return (
        <Register
          onLogin={() => {}}
          onGoToLogin={() => setAuthScreen("login")}
        />
      );
    }
    return (
      <Login
        onLogin={() => {}}
        onGoToRegister={() => setAuthScreen("register")}
      />
    );
  }

  // Se a seção não é permitida para role+setor, volta pra home
  const safeSection: Section = canAccess(user.role, user.setor, currentSection)
    ? currentSection
    : "home";

  return (
    <>
      {/* Plano de fundo customizado */}
      {bgUrl && (
        <div
          className="app-custom-bg"
          style={{ backgroundImage: `url(${bgUrl})` }}
        />
      )}

      <div className={`app-layout fade-in ${bgUrl ? "has-custom-bg" : ""}`}>
        <Sidebar
          role={user.role}
          setor={user.setor}
          activeSection={safeSection}
          onSelectSection={setCurrentSection}
          onOpenUserModal={() => setUserPanelAberto(true)}
          onOpenExtensionModal={() => setExtensaoModalAberto(true)}
          onOpenSettings={toggleTheme}
          theme={theme}
          userName={user.nomeCompleto.split(" ")[0]}
          avatarUrl={user.avatarUrl}
          hasUnreadChat={hasUnreadChat}
        />
        <div className="main-wrapper">
          <main className={`main-content ${safeSection === "chat_interno" ? "compact-padding" : ""}`}>
            {renderSection(safeSection, user)}
          </main>
          {safeSection !== "chat_interno" && <Footer />}
        </div>
      </div>

      <UserPanel
        user={user}
        aberto={userPanelAberto}
        onFechar={() => setUserPanelAberto(false)}
        onLogout={async () => {
          setUserPanelAberto(false);
          await logout();
        }}
        bgUrl={bgUrl}
        onBgChange={handleBgChange}
      />

      <ExtensionModal
        aberto={extensaoModalAberto}
        onFechar={() => setExtensaoModalAberto(false)}
      />

      <ToastContainer />
    </>
  );
}
