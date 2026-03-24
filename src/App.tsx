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
import "./App.css";

import LoadingOverlay from "./components/LoadingOverlay";
import UserPanel from "./components/UserPanel";

type AuthScreen = "login" | "register";

export default function App() {
  const { user, loading, error } = useUser();
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [currentSection, setCurrentSection] = useState<Section>("home");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [userPanelAberto, setUserPanelAberto] = useState(false);

  function renderSection(section: Section, user: UserProfile) {
    switch (section) {
      case "home":
        return <Home user={user} onSelectSection={setCurrentSection} />;
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

  // Altera a classe no body para refletir o tema
  useEffect(() => {
    document.body.classList.toggle("light-theme", theme === "light");
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
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
    <div className="app-layout fade-in">
      <Sidebar
        role={user.role}
        setor={user.setor}
        activeSection={safeSection}
        onSelectSection={setCurrentSection}
        onOpenUserModal={() => setUserPanelAberto(true)}
        onOpenSettings={toggleTheme}
        theme={theme}
      />
      <div className="main-wrapper">
        <main className="main-content">{renderSection(safeSection, user)}</main>
        <Footer />
      </div>

      <UserPanel
        user={user}
        aberto={userPanelAberto}
        onFechar={() => setUserPanelAberto(false)}
        onLogout={async () => { setUserPanelAberto(false); await logout(); }}
      />
    </div>
  );
}
