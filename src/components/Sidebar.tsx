// components/Sidebar.tsx
import { useState } from "react";
import "./Sidebar.css";
import { Role, Setor, Section, canAccess } from "../services/permissions";

export type { Section };

interface SidebarProps {
  role: Role;
  setor: Setor;
  onSelectSection: (section: Section) => void;
  onOpenUserModal: () => void;
  onOpenSettings: () => void;
  theme: "dark" | "light";
}

interface NavItem {
  section: Section;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { section: "chat", icon: "🗨️", label: "Chat" },
  { section: "os", icon: "📝", label: "Modelos O.S." },
  { section: "conversor", icon: "📄", label: "Conversor" },
  { section: "senhas", icon: "🔑", label: "Senhas" },
  { section: "relatorios", icon: "📊", label: "Relatórios" },
  { section: "admin", icon: "🛡️", label: "Admin" },
];

export default function Sidebar({
  role,
  setor,
  onSelectSection,
  onOpenUserModal,
  onOpenSettings,
  theme,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("home");

  function handleSelectSection(section: Section) {
    setActiveSection(section);
    onSelectSection(section);
  }

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
            onClick={() => handleSelectSection(item.section)}
          >
            <span className="icon">{item.icon}</span>
            <span className="text">{item.label}</span>
          </button>
        ))}

        <a
          href="https://chromewebstore.google.com/detail/ati-auxiliar-de-atendimen/mlgmmjacfbnkolflbankfiackpcnmckl"
          className="sidebar-button"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="icon">🚀</span>
          <span className="text">Extensão</span>
        </a>
      </div>

      <div className="sidebar-footer">
        <button className="bottom-toggle" onClick={onOpenUserModal}>
          <span className="icon">👤</span>
          <span className="text">Perfil</span>
        </button>
        <button className="bottom-toggle theme-toggle" onClick={onOpenSettings}>
          <span className="icon">{theme === "dark" ? "☀️" : "🌙"}</span>
          <span className="text">{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
        </button>
      </div>
    </aside>
  );
}
