// components/Sidebar.tsx
import { useState } from "react";
import "./Sidebar.css";
import { Role, Setor, Section, canAccess } from "../services/permissions";

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

const NAV_ITEMS: NavItem[] = [
  { section: "chat_interno", icon: "💬", label: "Chat Interno" },
  { section: "chat", icon: "🗨️", label: "Respostas Rápidas" },
  { section: "os", icon: "📝", label: "Modelos O.S." },
  { section: "conversor", icon: "📄", label: "Conversor" },
  { section: "senhas", icon: "🔑", label: "Senhas" },
  { section: "relatorios", icon: "📊", label: "Relatórios" },
  { section: "admin", icon: "🛡️", label: "Admin" },
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

  // Filtra os itens com base no cruzamento de role + setor
  const visibleItems = NAV_ITEMS.filter((item) =>
    canAccess(role, setor, item.section),
  );

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

        {visibleItems.map((item) => (
          <button
            key={item.section}
            className={`sidebar-button ${activeSection === item.section ? "active" : ""}`}
            onClick={() => onSelectSection(item.section)}
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

        <button className="sidebar-button" onClick={onOpenExtensionModal}>
          <span className="icon">🚀</span>
          <span className="text">Extensão</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <button
          className="bottom-toggle profile-toggle"
          onClick={onOpenUserModal}
        >
          <div className="sidebar-avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
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
        <button className="bottom-toggle theme-toggle" onClick={onOpenSettings}>
          <span className="icon">{theme === "dark" ? "☀️" : "🌙"}</span>
          <span className="text">
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </span>
        </button>
      </div>
    </aside>
  );
}
