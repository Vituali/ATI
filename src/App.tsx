// App.tsx
import { useState, useEffect } from "react";
import { useUser, UserProfile } from "./hooks/useUser";
import { canAccess, Section } from "./services/permissions";
import { logout } from "./services/auth";

import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import OS from "./pages/OS";
import Conversor from "./pages/Conversor";
import Senhas from "./pages/Senhas";
import Admin from "./pages/Admin";
import ErrorPage from "./pages/ErrorPage";
import ChatInterno from "./pages/ChatInterno";
import { ref, onValue, off } from "firebase/database";
import { db } from "./services/firebase";
import "./App.css";

import LoadingOverlay from "./components/LoadingOverlay";
import UserPanel from "./components/UserPanel";
import ExtensionModal from "./components/ExtensionModal";

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

  // Notificações de Chat
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  function renderSection(section: Section, user: UserProfile) {
    switch (section) {
      case "home":
        return <Home user={user} onSelectSection={setCurrentSection} />;
      case "chat_interno":
        return <ChatInterno />;
      case "chat":
        return <Chat />;
      case "os":
        return <OS />;
      case "conversor":
        return <Conversor />;
      case "senhas":
        return <Senhas />;
      case "relatorios":
        return <div>Relatórios — em breve</div>;
      case "admin":
        return <Admin />;
    }
  }

  // Notificações em real-time (Observando todas as salas)
  useEffect(() => {
    if (!user) return;

    const q = ref(db, "chat/salas");
    const unsubscribe = onValue(q, (snap) => {
      if (!snap.exists()) return;

      let overallLatestMsg: any = null;

      // Encontra a mensagem mais recente entre todas as salas
      snap.forEach((roomSnap) => {
        const roomMsgs = roomSnap.child("mensagens");
        roomMsgs.forEach((msgSnap) => {
          const msg = msgSnap.val();
          if (!overallLatestMsg || msg.timestamp > overallLatestMsg.timestamp) {
            overallLatestMsg = msg;
          }
        });
      });

      if (overallLatestMsg && overallLatestMsg.autor !== user.username) {
        const lastSeen = Number(localStorage.getItem("lastSeenChat") || 0);
        if (overallLatestMsg.timestamp > lastSeen) {
          setHasUnreadChat(true);

          // Som de notificação
          if (currentSection !== "chat_interno") {
            const audio = new Audio(
              "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
            );
            audio.volume = 0.4;
            audio.play().catch(() => {});
          }
        }
      }
    });

    return () => off(q, "value", unsubscribe as any);
  }, [user, currentSection]);

  // Limpa notificação ao entrar no chat
  useEffect(() => {
    if (currentSection === "chat_interno") {
      setHasUnreadChat(false);
      localStorage.setItem("lastSeenChat", Date.now().toString());
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
          <main className="main-content">
            {renderSection(safeSection, user)}
          </main>
          <Footer />
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
    </>
  );
}
