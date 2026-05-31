// services/permissions.ts

export type Role = "usuario" | "supervisor" | "moderador" | "admin";
export type Setor = "geral" | "ti" | "financeiro" | "suporte" | "comercial";
export type Section =
  | "home"
  | "respostas_rapidas"
  | "chat_interno"
  | "anotacoes"
  | "modelos_os"
  | "conversor"
  | "senhas"
  | "relatorios"
  | "admin";

// ---------------------------------------------------------------
// PERMISSÕES POR ROLE
// ---------------------------------------------------------------
const ROLE_PERMISSIONS: Record<Section, Role[]> = {
  home: ["usuario", "supervisor", "moderador", "admin"],
  chat_interno: ["usuario", "supervisor", "moderador", "admin"],
  anotacoes: ["usuario", "supervisor", "moderador", "admin"],
  respostas_rapidas: ["usuario", "supervisor", "moderador", "admin"],
  modelos_os: ["usuario", "supervisor", "moderador", "admin"],
  conversor: ["usuario", "supervisor", "moderador", "admin"],
  senhas: ["usuario", "supervisor", "moderador", "admin"],
  relatorios: ["supervisor", "moderador", "admin"],
  admin: ["admin"],
};

// ---------------------------------------------------------------
// PERMISSÕES POR SETOR
// "geral" só acessa home e chat — usuário recém-cadastrado
// fica travado até o admin atribuir um setor real
// ---------------------------------------------------------------
export const SETOR_PERMISSIONS: Record<Section, Setor[]> = {
  home: ["geral", "ti", "financeiro", "suporte", "comercial"],
  chat_interno: ["ti", "financeiro", "suporte", "comercial"],
  anotacoes: ["ti", "financeiro", "suporte", "comercial"],
  respostas_rapidas: ["ti", "financeiro", "suporte", "comercial"],
  modelos_os: ["ti", "suporte", "comercial", "financeiro"],
  conversor: ["ti", "suporte", "comercial"],
  senhas: ["ti", "suporte"],
  relatorios: ["ti", "financeiro", "suporte", "comercial"],
  admin: ["ti"],
};

// ---------------------------------------------------------------
// FUNÇÃO PRINCIPAL
// ---------------------------------------------------------------
export function getRolePermissions(section: Section): Role[] {
  switch (section) {
    case "home":
    case "chat_interno":
    case "anotacoes":
    case "respostas_rapidas":
    case "modelos_os":
    case "conversor":
    case "senhas":
      return ["usuario", "supervisor", "moderador", "admin"];
    case "relatorios":
      return ["supervisor", "moderador", "admin"];
    case "admin":
      return ["admin"];
    default:
      return [];
  }
}

export function getSetorPermissions(section: Section): Setor[] {
  switch (section) {
    case "home":
      return ["geral", "ti", "financeiro", "suporte", "comercial"];
    case "chat_interno":
    case "anotacoes":
    case "respostas_rapidas":
    case "relatorios":
      return ["ti", "financeiro", "suporte", "comercial"];
    case "modelos_os":
      return ["ti", "suporte", "comercial", "financeiro"];
    case "conversor":
      return ["ti", "suporte", "comercial"];
    case "senhas":
      return ["ti", "suporte"];
    case "admin":
      return ["ti"];
    default:
      return [];
  }
}

// ---------------------------------------------------------------
// FUNÇÃO PRINCIPAL
// ---------------------------------------------------------------
export function canAccess(role: Role, setor: Setor, section: Section): boolean {
  if (role === "admin") return true;

  const roleOk = getRolePermissions(section).includes(role);
  const setorOk = getSetorPermissions(section).includes(setor);

  return roleOk && setorOk;
}

export function getAllowedSections(role: Role, setor: Setor): Section[] {
  const allSections: Section[] = [
    "home",
    "respostas_rapidas",
    "chat_interno",
    "anotacoes",
    "modelos_os",
    "conversor",
    "senhas",
    "relatorios",
    "admin"
  ];
  return allSections.filter((section) => canAccess(role, setor, section));
}

// ---------------------------------------------------------------
// HELPERS SEMÂNTICOS
// ---------------------------------------------------------------
export const isAdmin = (role: Role) => role === "admin";
export const canViewOthersData = (role: Role) =>
  ["supervisor", "moderador", "admin"].includes(role);
export const canManageUsers = (role: Role) => role === "admin";
export const canEditOthersContent = (role: Role) =>
  ["moderador", "admin"].includes(role);

// Usuário recém-cadastrado, aguardando atribuição de setor
export const isPendente = (setor: Setor) => setor === "geral";

// ---------------------------------------------------------------
// RESUMO VISUAL (painel admin)
// ---------------------------------------------------------------
export const SETOR_LABEL: Record<Setor, string> = {
  geral: "Geral",
  ti: "TI",
  financeiro: "Financeiro",
  suporte: "Suporte",
  comercial: "Comercial",
};

export function getSetorLabel(setor: string): string {
  switch (setor) {
    case "geral": return "Geral";
    case "ti": return "TI";
    case "financeiro": return "Financeiro";
    case "suporte": return "Suporte";
    case "comercial": return "Comercial";
    default: return setor;
  }
}

export const ROLE_LABEL: Record<Role, string> = {
  usuario: "Usuário",
  supervisor: "Supervisor",
  moderador: "Moderador",
  admin: "Admin",
};

export function getRoleLabel(role: string): string {
  switch (role) {
    case "usuario": return "Usuário";
    case "supervisor": return "Supervisor";
    case "moderador": return "Moderador";
    case "admin": return "Admin";
    default: return role;
  }
}

// Label legível de cada seção
export const SECTION_LABEL: Record<Section, string> = {
  home: "Home",
  respostas_rapidas: "Respostas Rápidas",
  chat_interno: "Chat Interno",
  anotacoes: "Minhas Anotações",
  modelos_os: "Modelos O.S.",
  conversor: "Conversor",
  senhas: "Senhas",
  relatorios: "Relatórios",
  admin: "Admin",
};

export function getSectionLabel(section: string): string {
  switch (section) {
    case "home": return "Home";
    case "respostas_rapidas": return "Respostas Rápidas";
    case "chat_interno": return "Chat Interno";
    case "anotacoes": return "Minhas Anotações";
    case "modelos_os": return "Modelos O.S.";
    case "conversor": return "Conversor";
    case "senhas": return "Senhas";
    case "relatorios": return "Relatórios";
    case "admin": return "Admin";
    default: return section;
  }
}
