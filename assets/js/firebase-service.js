import { get, ref, set, push, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { db, auth } from './firebase-init.js';

// --- FUNÇÕES DE DADOS DO SGP ---
export async function getSgpOccurrenceTypes() {
    const snapshot = await get(ref(db, 'sgp_cache/occurrenceTypes'));
    return snapshot.exists() ? snapshot.val() : null;
}

// --- FUNÇÕES DE DADOS DOS ATENDENTES ---
export async function getAllAtendentes() {
    const snapshot = await get(ref(db, 'atendentes'));
    return snapshot.exists() ? snapshot.val() : {};
}

export async function getAtendenteByUsername(username) {
    if (!username) return null;
    const snapshot = await get(ref(db, `atendentes/${username}`));
    return snapshot.exists() ? snapshot.val() : null;
}

// --- FUNÇÕES DE DADOS DE TEMPLATES (O.S. E CHAT) ---
export async function getOsTemplates(atendente) {
    if (!atendente) return {};
    const snapshot = await get(ref(db, `modelos_os/${atendente}`));
    return snapshot.exists() ? snapshot.val() : {};
}

/**
 * Salva TODOS os modelos de O.S. de um usuário, substituindo os dados antigos.
 * Isso é usado para garantir a consistência dos dados após a migração de formato.
 */
export async function saveAllOsTemplates(atendente, templatesObject) {
    if (!atendente) throw new Error("Atendente não especificado.");
    await set(ref(db, `modelos_os/${atendente}`), templatesObject);
}

export async function getQuickReplies(atendente) {
    if (!atendente) return [];
    const snapshot = await get(ref(db, `respostas/${atendente}`));
    return snapshot.exists() ? snapshot.val() : [];
}

export async function saveQuickReplies(atendente, data) {
    if (!atendente) throw new Error("Atendente não especificado.");
    await set(ref(db, `respostas/${atendente}`), data);
}

// --- FUNÇÕES DE ADMINISTRAÇÃO ---
async function updateUserData(username, field, value) {
    if (!auth.currentUser) throw new Error("Ação não permitida.");
    await set(ref(db, `atendentes/${username}/${field}`), value);
}

export const updateUserRole = (username, newRole) => updateUserData(username, 'role', newRole);
export const updateUserStatus = (username, newStatus) => updateUserData(username, 'status', newStatus);

