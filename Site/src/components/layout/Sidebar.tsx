// components/Sidebar.tsx
import { useState } from 'react'
import './Sidebar.css'
import { Role, Setor, Section, canAccess } from '../../services/permissions'
import {
  Wrench,
  Sliders,
  ClipboardList,
  MessageSquare,
  FileText,
  RefreshCw,
  Key,
  BarChart3,
  Shield,
  MessageCircle,
  Globe,
  Sun,
  Moon,
  Skull,
  CupSoda,
  Dices,
  Folder,
  BookOpen,
  Home,
  User,
  Menu,
  ChevronDown,
  ChevronRight,
  Download
} from 'lucide-react'

export type { Section }

interface SidebarProps {
  role: Role
  setor: Setor
  customAllowedSections?: Section[]
  activeSection: Section
  onSelectSection: (section: Section) => void
  onOpenUserModal: () => void
  onOpenExtensionModal: () => void
  onOpenInstallModal: () => void
  onOpenSettings: () => void
  theme: 'dark' | 'light'
  userName: string
  avatarUrl?: string
  hasUnreadChat: boolean
  isOpen: boolean
  onToggle: () => void
}

interface NavItem {
  section: Section
  icon: React.ReactNode
  label: string
}

interface NavGroup {
  id: string
  label?: string
  icon?: React.ReactNode
  highlight?: boolean
  items: NavItem[]
}

const NAV_ITEMS: NavGroup[] = [
  {
    id: 'operacao',
    label: 'Operação',
    icon: <Wrench size={20} strokeWidth={2.2} />,
    items: [
      { section: 'respostas_rapidas', icon: <MessageSquare size={20} strokeWidth={2.2} />, label: 'Respostas Rápidas' },
      { section: 'modelos_os', icon: <FileText size={20} strokeWidth={2.2} />, label: 'Modelos O.S.' },
      { section: 'conversor', icon: <RefreshCw size={20} strokeWidth={2.2} />, label: 'Conversor' },
      { section: 'senhas', icon: <Key size={20} strokeWidth={2.2} />, label: 'Senhas' },
    ],
  },
  {
    id: 'meu_espaco',
    label: 'Meu Espaço',
    icon: <User size={20} strokeWidth={2.2} />,
    items: [
      { section: 'anotacoes', icon: <ClipboardList size={20} strokeWidth={2.2} />, label: 'Anotações' },
      { section: 'biblioteca', icon: <BookOpen size={20} strokeWidth={2.2} />, label: 'Minha Biblioteca' },
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão',
    icon: <Sliders size={20} strokeWidth={2.2} />,
    items: [
      { section: 'relatorios', icon: <BarChart3 size={20} strokeWidth={2.2} />, label: 'Relatórios' },
      { section: 'admin', icon: <Shield size={20} strokeWidth={2.2} />, label: 'Admin' },
    ],
  },
  {
    id: 'secretos',
    label: 'Secretos',
    icon: <Skull size={20} strokeWidth={2.2} />,
    items: [
      { section: 'jefferson', icon: <CupSoda size={20} strokeWidth={2.2} />, label: 'Goticas & Monster' },
      { section: 'heli', icon: <Dices size={20} strokeWidth={2.2} />, label: 'Ordem Paranormal' },
    ],
  },
]

export default function Sidebar({ role, setor, customAllowedSections, activeSection, onSelectSection, onOpenUserModal, onOpenExtensionModal, onOpenInstallModal, onOpenSettings, theme, userName, avatarUrl, hasUnreadChat, isOpen, onToggle }: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem('ati-sidebar-open-groups')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return ['operacao', 'meu_espaco']
      }
    }
    return ['operacao', 'meu_espaco']
  })

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const nextVal = prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
      localStorage.setItem('ati-sidebar-open-groups', JSON.stringify(nextVal))
      return nextVal
    })
  }

  const groups = NAV_ITEMS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(role, setor, item.section, customAllowedSections)),
  })).filter((group) => group.items.length > 0)

  return (
    <aside className={`sidebar ${isOpen ? 'expanded' : ''}`}>
      <div className="sidebar-nav">
        <button className="toggle-sidebar" aria-label="Abrir ou fechar menu lateral" onClick={onToggle}>
          <Menu size={22} />
        </button>

        {canAccess(role, setor, 'home', customAllowedSections) && (
          <button className={`sidebar-button ${activeSection === 'home' ? 'active' : ''}`} onClick={() => onSelectSection('home')} title="Home">
            <span className="icon">
              <Home size={20} strokeWidth={2.2} />
            </span>
            <span className="text">Home</span>
          </button>
        )}

        {canAccess(role, setor, 'chat_interno', customAllowedSections) && (
          <button className={`sidebar-button chat-highlight ${activeSection === 'chat_interno' ? 'active' : ''}`} onClick={() => onSelectSection('chat_interno')} title="Chat Interno">
            <span className="icon">
              <MessageCircle size={20} strokeWidth={2.2} />
              {hasUnreadChat && <span className="notification-dot" />}
            </span>
            <span className="text">Chat Interno</span>
          </button>
        )}

        {groups.map((group) => {
          const isGroupOpen = openGroups.includes(group.id)
          return (
            <div key={group.id} className={`sidebar-group ${group.highlight ? 'highlight' : ''} ${isGroupOpen ? 'open' : ''}`}>
              <button className="sidebar-group-label" onClick={() => toggleGroup(group.id)} title={group.label}>
                <div className="group-label-content">
                  <span className="icon">{group.icon || <Folder size={20} strokeWidth={2.2} />}</span>
                  {group.label && <span className="group-text text">{group.label}</span>}
                </div>
                <span className={`chevron-icon text ${isGroupOpen ? 'open' : ''}`}>{isGroupOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
              </button>

              <div className="sidebar-group-items">
                {group.items.map((item) => (
                  <button key={item.section} className={`sidebar-button ${activeSection === item.section ? 'active' : ''}`} onClick={() => onSelectSection(item.section)} title={item.label}>
                    <span className="icon">
                      {item.icon}
                      {item.section === 'chat_interno' && hasUnreadChat && <span className="notification-dot" />}
                    </span>
                    <span className="text">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        <button className="sidebar-button" onClick={onOpenExtensionModal} title="Extensão">
          <span className="icon"><Globe size={20} strokeWidth={2.2} /></span>
          <span className="text">Extensão</span>
        </button>

        <button className="sidebar-button install-sidebar-btn" onClick={onOpenInstallModal} title="Instalar Aplicativo">
          <span className="icon"><Download size={20} strokeWidth={2.2} /></span>
          <span className="text">Instalar App</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <button className="bottom-toggle profile-toggle" onClick={onOpenUserModal} title={userName}>
          <div className="sidebar-avatar">{avatarUrl ? <img src={avatarUrl} alt="" className="sidebar-avatar-img" /> : <span className="sidebar-avatar-init">{userName.charAt(0).toUpperCase()}</span>}</div>
          <span className="text">{userName}</span>
        </button>
        <button className="bottom-toggle theme-toggle" onClick={onOpenSettings} title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}>
          <span className="icon">{theme === 'dark' ? <Sun size={20} strokeWidth={2.2} /> : <Moon size={20} strokeWidth={2.2} />}</span>
          <span className="text">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
        </button>
      </div>
    </aside>
  )
}
