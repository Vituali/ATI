// services/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { auth, db } from "./firebase";

export interface AtendenteData {
  uid: string;
  email: string;
  nomeCompleto: string;
  role: "usuario" | "admin";
  setor: string;
  status: "ativo" | "inativo";
  sgpUsername?: string;
}

export interface RegisterDetails {
  username: string;
  fullName: string;
  email: string;
  password: string;
  // setor removido do cadastro — novo usuário sempre começa como "geral"
  // o admin atribui o setor correto depois pelo painel
}

export async function register(details: RegisterDetails): Promise<void> {
  const { username, fullName, email, password } = details;
  const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, "_");

  if (/[.$#[\]/]/.test(sanitizedUsername)) {
    throw new Error("Nome de usuário inválido. Evite pontos, #, $, [ ou ].");
  }

  const usernameSnap = await get(ref(db, `atendentes/${sanitizedUsername}`));
  if (usernameSnap.exists())
    throw new Error("Este nome de usuário já está em uso.");

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  // Aguarda o auth state propagar antes de escrever no banco
  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.uid === user.uid) {
        unsubscribe();
        resolve();
      }
    });
  });

  await updateProfile(user, { displayName: fullName });

  // Novo usuário sempre entra com setor "geral" e role "usuario"
  // O admin define o setor real pelo painel de administração
  await set(ref(db, `atendentes/${sanitizedUsername}`), {
    uid: user.uid,
    email,
    nomeCompleto: fullName,
    role: "usuario",
    setor: "geral", // ← sempre geral no cadastro
    status: "ativo",
  });
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<User> {
  return (await signInWithEmailAndPassword(auth, email, password)).user;
}

export async function loginWithUsername(
  username: string,
  password: string,
): Promise<User> {
  const snap = await get(
    ref(db, `atendentes/${username.trim().toLowerCase()}`),
  );
  if (!snap.exists()) throw new Error("Usuário não encontrado.");

  const data = snap.val() as AtendenteData;
  if (!data.email) throw new Error("Credenciais inválidas.");
  if (data.status === "inativo")
    throw new Error("Conta inativa. Contate o administrador.");

  return loginWithEmail(data.email, password);
}

export async function login(
  usernameOrEmail: string,
  password: string,
): Promise<User> {
  return usernameOrEmail.includes("@")
    ? loginWithEmail(usernameOrEmail, password)
    : loginWithUsername(usernameOrEmail, password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
