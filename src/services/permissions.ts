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
export function canAccess(role: Role, setor: Setor, section: Section): boolean {
  if (role === "admin") return true;

  const roleOk = ROLE_PERMISSIONS[section].includes(role);
  const setorOk = SETOR_PERMISSIONS[section].includes(setor);

  return roleOk && setorOk;
}

export function getAllowedSections(role: Role, setor: Setor): Section[] {
  return (Object.keys(SETOR_PERMISSIONS) as Section[]).filter((section) =>
    canAccess(role, setor, section),
  );
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

export const ROLE_LABEL: Record<Role, string> = {
  usuario: "Usuário",
  supervisor: "Supervisor",
  moderador: "Moderador",
  admin: "Admin",
};

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
