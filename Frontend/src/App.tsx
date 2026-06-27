// App.tsx
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { RespostasRapidas, ModelosOS, Conversor, Senhas, Admin, ChatInterno, Anotacoes, Relatorios, Jefferson, HeliRPG, Biblioteca } from './pages/lazy'
import { Login, Register, Home, ErrorPage, ExtensionModal } from './pages'
import { useUser, UserProfile } from './hooks'
import { canAccess, Section, Setor, getSectionLabel, logout, auth, syncWithExtension, performSSOLogin } from './services'
import { Sidebar, Footer, LoadingOverlay, ToastContainer, UserPanel, BugReportModal, ErrorBoundary, InstallModal } from './components'
import { MessageSquare, ClipboardList, Key, FileEdit, RefreshCw, MessageCircle, Sparkles } from 'lucide-react'
import { api } from './services/api'
import './App.css'
import { useRegisterSW } from 'virtual:pwa-register/react'

const isVideoUrl = (url: string) => {
  if (!url) return false
  const cleanUrl = url.split('?')[0].toLowerCase()
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.ogg')
}

type AuthScreen = 'login' | 'register'

export default function App() {
  const { user, loading, error } = useUser()

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA: Service Worker registrado!')
      if (r) {
        setInterval(() => {
          r.update()
        }, 3600000) // 1 hora
      }
    },
    onRegisterError(error) {
      console.error('PWA: Erro ao registrar SW:', error)
    },
  })

  const [params] = useState(() => new URLSearchParams(window.location.search))
  const isEmbed = params.get('mode') === 'embed'

  const [authScreen, setAuthScreen] = useState<AuthScreen>('login')
  const getInitialSection = (): Section => {
    const path = window.location.pathname.replace(/^\/ati\/?/, '').replace(/\/$/, '')
    const validSections: Section[] = ['home', 'respostas_rapidas', 'chat_interno', 'anotacoes', 'modelos_os', 'conversor', 'senhas', 'relatorios', 'admin', 'jefferson', 'heli', 'biblioteca']
    if (path && validSections.includes(path as Section)) return path as Section
    return (localStorage.getItem('ati-active-section') as Section) || 'home'
  }

  const [currentSection, setCurrentSection] = useState<Section>(getInitialSection)
  const [embedSection, setEmbedSection] = useState<Section>(() => {
    const sec = params.get('section') as Section
    if (sec && ['chat_interno', 'modelos_os', 'senhas', 'anotacoes', 'conversor', 'respostas_rapidas'].includes(sec)) {
      return sec
    }
    return (localStorage.getItem('ati-active-embed-section') as Section) || 'chat_interno'
  })
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return localStorage.getItem('ati-sidebar-expanded') === 'true'
  })

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev
      localStorage.setItem('ati-sidebar-expanded', next ? 'true' : 'false')
      return next
    })
  }

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ati-theme') as 'dark' | 'light') || 'dark'
  })
  const [userPanelAberto, setUserPanelAberto] = useState(false)
  const [extensaoModalAberto, setExtensaoModalAberto] = useState(false)
  const [bugModalAberto, setBugModalAberto] = useState(false)
  const [installModalAberto, setInstallModalAberto] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallToast, setShowInstallToast] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      const hasSeenToast = localStorage.getItem('ati-pwa-install-toast-seen') === 'true'
      if (!hasSeenToast) {
        setShowInstallToast(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`PWA: Escolha de instalação do usuário: ${outcome}`)
    setDeferredPrompt(null)
    setShowInstallToast(false)
  }

  const [localBg, setLocalBg] = useState(() => localStorage.getItem('ati-custom-bg') || '')
  const bgUrl = user?.customBg !== undefined ? user.customBg : localBg

  const handleBgChange = useCallback((url: string) => {
    setLocalBg(url)
    if (url) localStorage.setItem('ati-custom-bg', url)
    else localStorage.removeItem('ati-custom-bg')
  }, [])

  const lastSeenRef = useRef(Number(localStorage.getItem('lastSeenChat') || 0))

  // Notificações de Chat (Rastreia quais salas têm mensagens novas)
  const [unreadRooms, setUnreadRooms] = useState<Setor[]>([])

  const renderSection = useCallback(
    (section: Section, user: UserProfile) => {
      switch (section) {
        case 'home':
          return <Home user={user} onSelectSection={setCurrentSection} />
        case 'chat_interno':
          return <ChatInterno unreadRooms={unreadRooms} />
        case 'anotacoes':
          return <Anotacoes />
        case 'respostas_rapidas':
          return <RespostasRapidas />
        case 'modelos_os':
          return <ModelosOS />
        case 'conversor':
          return <Conversor />
        case 'senhas':
          return <Senhas />
        case 'relatorios':
          return <Relatorios />
        case 'admin':
          return <Admin />
        case 'jefferson':
          return <Jefferson />
        case 'heli':
          return <HeliRPG />
        case 'biblioteca':
          return <Biblioteca />
      }
    },
    [setCurrentSection, unreadRooms],
  )

  // Notificações em tempo real (polling) + limpa ao entrar no chat
  useEffect(() => {
    if (!user) return

    if (currentSection === 'chat_interno') {
      setUnreadRooms([])
      lastSeenRef.current = Date.now()
      localStorage.setItem('lastSeenChat', lastSeenRef.current.toString())
      return
    }

    const checkUnread = async () => {
      try {
        const salas: any[] = await api.get('/api/chat/salas')
        const salasComNovasMsgs: Setor[] = []

        for (const sala of salas) {
          const meta = sala.ultimaMensagem
          if (meta && meta.autor !== user.username && meta.timestamp > lastSeenRef.current) {
            salasComNovasMsgs.push(sala.id as Setor)
          }
        }

        setUnreadRooms(salasComNovasMsgs)
      } catch { /* silencioso */ }
    }

    checkUnread()
    const interval = setInterval(checkUnread, 8000)
    return () => clearInterval(interval)
  }, [user, currentSection])

  // Document Title, Favicon e Badge PWA — dinâmico por seção + notificações
  useEffect(() => {
    const sectionLabel = getSectionLabel(currentSection)
    const favicon = document.getElementById('favicon') as HTMLLinkElement
    const baseUrl = import.meta.env.BASE_URL || '/ati/'

    if (unreadRooms.length > 0) {
      document.title = `ATI - ${sectionLabel} (${unreadRooms.length})`
      if (favicon) favicon.href = `${baseUrl}favicon-unread.svg`

      if ('setAppBadge' in navigator) {
        ;(navigator as any).setAppBadge(unreadRooms.length).catch(() => {})
      }
    } else {
      document.title = `ATI - ${sectionLabel}`
      if (favicon) favicon.href = `${baseUrl}favicon.svg`

      if ('clearAppBadge' in navigator) {
        ;(navigator as any).clearAppBadge().catch(() => {})
      }
    }
  }, [unreadRooms, currentSection])

  // Altera a classe no body e salva no localStorage para persistir
  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light')
    localStorage.setItem('ati-theme', theme)
  }, [theme])

  // Salva a aba/seção ativa para persistir ao recarregar a página
  useEffect(() => {
    localStorage.setItem('ati-active-section', currentSection)
  }, [currentSection])

  // Sincroniza a URL com a seção atual
  const isFirstRender = useRef(true)

  useEffect(() => {
    const path = currentSection === 'home' ? '/ati/' : `/ati/${currentSection}`
    if (window.location.pathname !== path) {
      if (isFirstRender.current) {
        isFirstRender.current = false
        window.history.replaceState({ section: currentSection }, '', path)
      } else {
        window.history.pushState({ section: currentSection }, '', path)
      }
    } else {
      isFirstRender.current = false
    }
  }, [currentSection])

  // Navegação pelo histórico (botão voltar/avançar do navegador)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/ati\/?/, '').replace(/\/$/, '')
      const validSections: Section[] = ['home', 'respostas_rapidas', 'chat_interno', 'anotacoes', 'modelos_os', 'conversor', 'senhas', 'relatorios', 'admin', 'jefferson', 'heli', 'biblioteca']
      const section = path && validSections.includes(path as Section) ? (path as Section) : 'home'
      setCurrentSection(section)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    localStorage.setItem('ati-active-embed-section', embedSection)
  }, [embedSection])

  // Inicializa/atualiza a aba embed via URL (requer setState pois URL é externo ao React)
  useEffect(() => {
    if (!isEmbed) return
    const sec = new URLSearchParams(window.location.search).get('section') as Section
    if (sec && ['chat_interno', 'modelos_os', 'senhas', 'anotacoes', 'conversor', 'respostas_rapidas'].includes(sec)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmbedSection(sec)
    }
  }, [isEmbed])

  // SSO: Ouvinte de Mensagens da Extensão
  useEffect(() => {
    const handleExtensionMessages = (event: MessageEvent) => {
      const { type, action, session } = event.data || {}

      if (type === 'ATI_EXTENSION_TO_SITE') {
        // 1. Se a ponte estiver pronta, o site envia o login se já tiver
        if (action === 'BRIDGE_READY') {
          console.log('SSO: [LARANJA] Ponte detectada. Sincronizando...')
          if (auth.currentUser) syncWithExtension(auth.currentUser)
        }

        // 2. Se a extensão mandou a sessão e o site está deslogado, tenta login reverso
        if (action === 'SSO_SESSION_DATA' && session) {
          console.log('SSO: [AZUL] Dados recebidos da extensão. Verificando auto-login...')
          if (!auth.currentUser) {
            performSSOLogin(session)
          }
        }
      }
    }

    window.addEventListener('message', handleExtensionMessages)
    return () => window.removeEventListener('message', handleExtensionMessages)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  // Carregando sessão
  if (loading) {
    return <LoadingOverlay fullScreen message="Carregando Sistema" />
  }

  // Erro de perfil → página de erro amigável
  if (error) {
    return <ErrorPage message={error} />
  }

  // Se estiver em modo Embed (para a extensão), prioridade total após o carregamento
  if (isEmbed) {
    // Se não estiver logado, mostra a tela de login normal, mas dentro do 'layout-embed'
    if (!user) {
      if (authScreen === 'register') {
        return (
          <div className="layout-embed">
            <Register onLogin={() => {}} onGoToLogin={() => setAuthScreen('login')} />
          </div>
        )
      }
      return (
        <div className="layout-embed">
          <Login onLogin={() => {}} onGoToRegister={() => setAuthScreen('register')} />
        </div>
      )
    }

    const availableTabs = [
      { id: 'chat_interno' as Section, label: 'Chat', icon: <MessageSquare size={20} /> },
      { id: 'modelos_os' as Section, label: 'O.S.', icon: <ClipboardList size={20} /> },
      { id: 'senhas' as Section, label: 'Senhas', icon: <Key size={20} /> },
      { id: 'anotacoes' as Section, label: 'Notas', icon: <FileEdit size={20} /> },
      { id: 'conversor' as Section, label: 'Conversor', icon: <RefreshCw size={20} /> },
      { id: 'respostas_rapidas' as Section, label: 'Respostas', icon: <MessageCircle size={20} /> },
    ].filter((tab) => canAccess(user.role, user.setor, tab.id, user.customAllowedSections))

    const activeEmbedSection = availableTabs.some((t) => t.id === embedSection) ? embedSection : availableTabs[0]?.id || 'chat_interno'

    return (
      <>
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

        <div className={`layout-embed fade-in ${bgUrl ? 'has-custom-bg' : ''}`}>
          <div className="embed-panel-container">
            <div className="embed-section-content" style={{ padding: activeEmbedSection === 'chat_interno' ? 0 : '12px 10px' }}>
              <ErrorBoundary key={activeEmbedSection}>
                <Suspense fallback={<LoadingOverlay message="Carregando..." />}>{renderSection(activeEmbedSection, user)}</Suspense>
              </ErrorBoundary>
            </div>
          </div>
          <ToastContainer />
        </div>
      </>
    )
  }

  // == FLUXO NORMAL DO SITE (Não-Embed) ==

  // Não logado
  if (!user) {
    if (authScreen === 'register') {
      return <Register onLogin={() => {}} onGoToLogin={() => setAuthScreen('login')} />
    }
    return <Login onLogin={() => {}} onGoToRegister={() => setAuthScreen('register')} />
  }

  // Se a seção não é permitida para role+setor, volta pra home
  const safeSection: Section = canAccess(user.role, user.setor, currentSection, user.customAllowedSections) ? currentSection : 'home'

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

      <div className={`app-layout fade-in ${bgUrl ? 'has-custom-bg' : ''}`}>
        <Sidebar role={user.role} setor={user.setor} customAllowedSections={user.customAllowedSections} activeSection={safeSection} onSelectSection={(section) => { setCurrentSection(section); if (window.innerWidth <= 768) setSidebarOpen(false) }} onOpenUserModal={() => setUserPanelAberto(true)} onOpenExtensionModal={() => setExtensaoModalAberto(true)} onOpenInstallModal={() => setInstallModalAberto(true)} onOpenSettings={toggleTheme} theme={theme} userName={user.nomeCompleto.split(' ')[0]} avatarUrl={user.avatarUrl} hasUnreadChat={unreadRooms.length > 0} isOpen={sidebarOpen} onToggle={toggleSidebar} />
        {/* Mobile overlay when sidebar is open */}
        {sidebarOpen && <div className="mobile-sidebar-overlay" onClick={toggleSidebar} />}
        {/* Mobile hamburger button */}
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Abrir menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="main-wrapper">
          <main className={`main-content ${safeSection === 'chat_interno' ? 'compact-padding' : ''}`}>
            <ErrorBoundary key={safeSection}>
              <Suspense fallback={<LoadingOverlay message="Carregando seção..." />}>{renderSection(safeSection, user)}</Suspense>
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </div>

      <UserPanel
        user={user}
        aberto={userPanelAberto}
        onFechar={() => setUserPanelAberto(false)}
        onLogout={async () => {
          setUserPanelAberto(false)
          await logout()
        }}
        bgUrl={bgUrl}
        onBgChange={handleBgChange}
      />

      <ExtensionModal aberto={extensaoModalAberto} onFechar={() => setExtensaoModalAberto(false)} />

      <InstallModal aberto={installModalAberto} onFechar={() => setInstallModalAberto(false)} deferredPrompt={deferredPrompt} onInstallClick={handleInstallClick} />

      <ToastContainer />

      {needRefresh && (
        <div className="pwa-toast-container">
          <div className="pwa-toast-content">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span className="pwa-toast-icon"><Sparkles size={20} strokeWidth={2} /></span>
              <div className="pwa-toast-message">
                <strong>Nova Versão Disponível!</strong>
                <p>O sistema foi atualizado para otimizar seus atendimentos.</p>
              </div>
            </div>
            <div className="pwa-toast-actions">
              <button className="pwa-btn-reload" onClick={() => updateServiceWorker(true)}>
                Atualizar Agora
              </button>
              <button className="pwa-btn-close" onClick={() => setNeedRefresh(false)}>
                Depois
              </button>
            </div>
          </div>
        </div>
      )}

      {showInstallToast && (
        <div className="pwa-toast-container pwa-toast-install">
          <div className="pwa-toast-content">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span className="pwa-toast-icon"><Sparkles size={20} strokeWidth={2} /></span>
              <div className="pwa-toast-message">
                <strong>Instalar Aplicativo!</strong>
                <p>Instale o ATI no seu dispositivo para acesso rápido e modo offline.</p>
              </div>
            </div>
            <div className="pwa-toast-actions">
              <button className="pwa-btn-reload" onClick={() => { setInstallModalAberto(true); setShowInstallToast(false); localStorage.setItem('ati-pwa-install-toast-seen', 'true'); }}>
                Instalar
              </button>
              <button className="pwa-btn-close" onClick={() => { setShowInstallToast(false); localStorage.setItem('ati-pwa-install-toast-seen', 'true'); }}>
                Depois
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão flutuante para reportar bug */}
      <button className="btn-report-bug" title="Reportar um bug" onClick={() => setBugModalAberto(true)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
          <path d="M4.355.522a.5.5 0 0 1 .623.333l.291.956A4.979 4.979 0 0 1 8 1c1.007 0 1.946.298 2.731.811l.29-.956a.5.5 0 1 1 .957.29l-.41 1.352A4.985 4.985 0 0 1 13 6h.5a.5.5 0 0 0 .5-.5V5a.5.5 0 0 1 1 0v.5A1.5 1.5 0 0 1 13.5 7H13v1h1.5a.5.5 0 0 1 0 1H13v1h.5a1.5 1.5 0 0 1 1.5 1.5v.5a.5.5 0 1 1-1 0v-.5a.5.5 0 0 0-.5-.5H13a5 5 0 0 1-10 0h-.5a.5.5 0 0 0-.5.5v.5a.5.5 0 1 1-1 0v-.5A1.5 1.5 0 0 1 2.5 10H3V9H1.5a.5.5 0 0 1 0-1H3V7h-.5A1.5 1.5 0 0 1 1 5.5V5a.5.5 0 0 1 1 0v.5a.5.5 0 0 0 .5.5H3c0-1.36.547-2.601 1.432-3.522l-.41-1.352a.5.5 0 0 1 .333-.623zM4 7v4a4 4 0 0 0 3.5 3.97V7H4zm4.5 0v7.97A4 4 0 0 0 12 11V7H8.5zM5.44 3.91l-1.026-.84A3.998 3.998 0 0 0 4 6h1c0-.77.228-1.488.618-2.09zM10.56 3.91c.39.602.618 1.32.618 2.09h1a3.998 3.998 0 0 0-.414-2.93l-1.026.84z" />
        </svg>
      </button>

      <BugReportModal aberto={bugModalAberto} onFechar={() => setBugModalAberto(false)} user={user} />
    </>
  )
}
