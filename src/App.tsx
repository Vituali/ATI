// App.tsx
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { RespostasRapidas, ModelosOS, Conversor, Senhas, Admin, ChatInterno, Anotacoes } from "./pages/lazy";
import { Login, Register, Home, ErrorPage, ExtensionModal } from "./pages";
import { useUser, UserProfile } from "./hooks";
import { canAccess, Section, Setor, SETOR_LABEL, logout, db } from "./services";
import { Sidebar, Footer, LoadingOverlay, ToastContainer, UserPanel } from "./components";
import { ref, onValue } from "firebase/database";
import "./App.css";

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

  // Notificações de Chat (Rastreia quais salas têm mensagens novas)
  const [unreadRooms, setUnreadRooms] = useState<Setor[]>([]);

  const renderSection = useCallback(
    (section: Section, user: UserProfile) => {
      switch (section) {
        case "home":
          return <Home user={user} onSelectSection={setCurrentSection} />;
        case "chat_interno":
          return <ChatInterno unreadRooms={unreadRooms} />;
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
    },
    [setCurrentSection],
  );

  // Notificações em real-time (Escutando apenas o nó meta leve)
  useEffect(() => {
    if (!user || currentSection === "chat_interno") return;

    const q = ref(db, "chat/meta");
    const unsubscribe = onValue(q, (snap) => {
      if (!snap.exists()) return;

      const salasComNovasMsgs: Setor[] = [];
      // Percorre todos os setores no nó meta
      snap.forEach((roomMetaSnap) => {
        const meta = roomMetaSnap.child("ultimaMensagem").val();
        const room = roomMetaSnap.key as Setor;

        // Se a mensagem existir, não for minha, e for posterior ao meu último visto
        if (meta && meta.autor !== user.username && meta.timestamp > lastSeenRef.current) {
          salasComNovasMsgs.push(room);
        }
      });

      setUnreadRooms(salasComNovasMsgs);
    });

    return () => unsubscribe();
  }, [user, currentSection]);

  // Limpa notificação ao entrar no chat
  useEffect(() => {
    if (currentSection === "chat_interno") {
      setUnreadRooms([]);
      lastSeenRef.current = Date.now();
      localStorage.setItem("lastSeenChat", lastSeenRef.current.toString());
    }
  }, [currentSection]);

  // Document Title e Favicon com badge detalhado
  useEffect(() => {
    const baseTitle = "ATI — Auxiliar de Atendimento";
    const favicon = document.getElementById("favicon") as HTMLLinkElement;

    if (unreadRooms.length > 0) {
      // Exemplo: (1) 💬 FINANCEIRO! | ATI
      const nomesSalas = unreadRooms.map((s) => (SETOR_LABEL[s] || s).toUpperCase()).join(", ");
      document.title = `(${unreadRooms.length}) 💬 ${nomesSalas} | ${baseTitle}`;
      if (favicon) favicon.href = "./favicon-unread.svg";
    } else {
      document.title = baseTitle;
      if (favicon) favicon.href = "./favicon.svg";
    }
  }, [unreadRooms]);

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
      return <Register onLogin={() => {}} onGoToLogin={() => setAuthScreen("login")} />;
    }
    return <Login onLogin={() => {}} onGoToRegister={() => setAuthScreen("register")} />;
  }

  // Se a seção não é permitida para role+setor, volta pra home
  const safeSection: Section = canAccess(user.role, user.setor, currentSection) ? currentSection : "home";

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].toLowerCase();
    return cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".ogg");
  };

  return (
    <>
      {/* Plano de fundo customizado */}
      {bgUrl && (
        <div className="app-custom-bg-container">
          {isVideoUrl(bgUrl) ? (
            <video
              src={bgUrl}
              autoPlay
              loop
              muted
              playsInline
              // @ts-expect-error: referrerPolicy is valid for video but missing in React types
              referrerPolicy="no-referrer"
              className="app-custom-bg-content"
            />
          ) : (
            <img src={bgUrl} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" className="app-custom-bg-content image" />
          )}
        </div>
      )}

      <div className={`app-layout fade-in ${bgUrl ? "has-custom-bg" : ""}`}>
        <Sidebar role={user.role} setor={user.setor} activeSection={safeSection} onSelectSection={setCurrentSection} onOpenUserModal={() => setUserPanelAberto(true)} onOpenExtensionModal={() => setExtensaoModalAberto(true)} onOpenSettings={toggleTheme} theme={theme} userName={user.nomeCompleto.split(" ")[0]} avatarUrl={user.avatarUrl} hasUnreadChat={unreadRooms.length > 0} />
        <div className="main-wrapper">
          <main className={`main-content ${safeSection === "chat_interno" ? "compact-padding" : ""}`}>
            <Suspense fallback={<LoadingOverlay message="Carregando seção..." />}>{renderSection(safeSection, user)}</Suspense>
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

      <ExtensionModal aberto={extensaoModalAberto} onFechar={() => setExtensaoModalAberto(false)} />

      <ToastContainer />
    </>
  );
}
