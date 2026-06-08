// components/Sidebar.tsx
import { useState } from "react";
import "./Sidebar.css";
import { Role, Setor, Section, canAccess } from "../../services/permissions";

export type { Section };

interface SidebarProps {
  role: Role;
  setor: Setor;
  activeSection: Section;
  onSelectSection: (section: Section) => void;
  onOpenUserModal: () => void;
  onOpenExtensionModal: () => void;
  onOpenSettings: () => void;
  theme: "dark" | "light";
  userName: string;
  avatarUrl?: string;
  hasUnreadChat: boolean;
}

interface NavItem {
  section: Section;
  icon: string;
  label: string;
}

interface NavGroup {
  id: string;
  label?: string;
  icon?: string;
  highlight?: boolean;
  items: NavItem[];
}
 

const NAV_ITEMS: NavGroup[] = [
  {
    id: "ferramentas",
    label: "Ferramentas",
    icon: "🛠️",
    items: [
      { section: "anotacoes", icon: "📋", label: "Anotações" },
      { section: "respostas_rapidas", icon: "🗨️", label: "Respostas Rápidas" },
      { section: "modelos_os", icon: "📝", label: "Modelos O.S." },
      { section: "conversor", icon: "📄", label: "Conversor" },
      { section: "senhas", icon: "🔑", label: "Senhas" },
    ],
  },
  {
    id: "controle",
    label: "Controle",
    icon: "⚙️",
    items: [
      { section: "relatorios", icon: "📊", label: "Relatórios" },
      { section: "admin", icon: "🛡️", label: "Admin" },
    ],
  },
];

export default function Sidebar({
  role,
  setor,
  activeSection,
  onSelectSection,
  onOpenUserModal,
  onOpenExtensionModal,
  onOpenSettings,
  theme,
  userName,
  avatarUrl,
  hasUnreadChat,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["ferramentas"]); // Ferramentas aberto por padrão
  const [debugMode, setDebugMode] = useState(() => {
    return localStorage.getItem("ati-debug-jefferson") === "true";
  });

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const isJefferson = userName.toLowerCase().includes("jefferson") || (role === "admin" && debugMode);
  const isHeli = userName.toLowerCase().includes("heli") || (role === "admin" && debugMode);

  const groups = NAV_ITEMS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(role, setor, item.section)),
  })).filter((group) => group.items.length > 0);

  if (isJefferson) {
    groups.push({
      id: "jefferson",
      label: "Área Secreta",
      icon: "🦇",
      items: [
        { section: "jefferson", icon: "🥤", label: "Goticas & Monster" }
      ]
    });
  }

  if (isHeli) {
    groups.push({
      id: "heli",
      label: "Área de RPG",
      icon: "🔮",
      items: [
        { section: "heli", icon: "🎲", label: "Ordem Paranormal" }
      ]
    });
  }

  return (
    <aside className={`sidebar ${isOpen ? "expanded" : ""}`}>
      <div className="sidebar-nav">
        <button
          className="toggle-sidebar"
          aria-label="Abrir ou fechar menu lateral"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          ☰
        </button>

        {canAccess(role, setor, "chat_interno") && (
          <button
            className={`sidebar-button chat-highlight ${activeSection === "chat_interno" ? "active" : ""}`}
            onClick={() => onSelectSection("chat_interno")}
            title="Chat Interno"
          >
            <span className="icon">
              💬
              {hasUnreadChat && <span className="notification-dot" />}
            </span>
            <span className="text">Chat Interno</span>
          </button>
        )}

        {groups.map((group) => {
          const isGroupOpen = openGroups.includes(group.id);
          return (
            <div
              key={group.id}
              className={`sidebar-group ${group.highlight ? "highlight" : ""} ${isGroupOpen ? "open" : ""}`}
            >
              <button
                className="sidebar-group-label"
                onClick={() => toggleGroup(group.id)}
                title={group.label}
              >
                <div className="group-label-content">
                  <span className="icon">{group.icon || "📁"}</span>
                  {group.label && (
                    <span className="group-text text">{group.label}</span>
                  )}
                </div>
                <span className={`chevron-icon text ${isGroupOpen ? "open" : ""}`}>
                  {isGroupOpen ? "▾" : "▹"}
                </span>
              </button>

              <div className="sidebar-group-items">
                {group.items.map((item) => (
                  <button
                    key={item.section}
                    className={`sidebar-button ${activeSection === item.section ? "active" : ""}`}
                    onClick={() => onSelectSection(item.section)}
                    title={item.label}
                  >
                    <span className="icon">
                      {item.icon}
                      {item.section === "chat_interno" && hasUnreadChat && (
                        <span className="notification-dot" />
                      )}
                    </span>
                    <span className="text">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <button 
          className="sidebar-button" 
          onClick={onOpenExtensionModal}
          title="Extensão"
        >
          <span className="icon">🌐</span>
          <span className="text">Extensão</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <button
          className="bottom-toggle profile-toggle"
          onClick={onOpenUserModal}
          title={userName}
        >
          <div className="sidebar-avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="sidebar-avatar-img"
              />
            ) : (
              <span className="sidebar-avatar-init">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text">{userName}</span>
        </button>
        {role === "admin" && (
          <button 
            className="bottom-toggle theme-toggle" 
            onClick={() => {
              const nextVal = !debugMode;
              setDebugMode(nextVal);
              localStorage.setItem("ati-debug-jefferson", nextVal ? "true" : "false");
            }}
            title={debugMode ? "Ocultar abas secretas" : "Exibir abas secretas"}
          >
            <span className="icon">{debugMode ? "👁️" : "👁️‍🗨️"}</span>
            <span className="text">{debugMode ? "Ocultar Secretas" : "Ver Secretas"}</span>
          </button>
        )}
        <button 
          className="bottom-toggle theme-toggle" 
          onClick={onOpenSettings}
          title={theme === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
        >
          <span className="icon">{theme === "dark" ? "☀️" : "🌙"}</span>
          <span className="text">
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </span>
        </button>
      </div>
    </aside>
  );
}
