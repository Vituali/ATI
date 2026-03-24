// hooks/useUser.ts
import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db } from "../services/firebase";
import { Role, Setor } from "../services/permissions";

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  nomeCompleto: string;
  role: Role;
  setor: Setor;
  status: "ativo" | "inativo";
  sgpUsername?: string;
  avatarUrl?: string;
}

interface UseUserReturn {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

async function fetchProfileWithRetry(
  uid: string,
  tentativas = 5,
  delay = 800,
): Promise<UserProfile> {
  for (let i = 0; i < tentativas; i++) {
    const snap = await get(ref(db, "atendentes"));

    if (snap.exists()) {
      let found: UserProfile | null = null;

      snap.forEach((child) => {
        const data = child.val();
        if (data.uid === uid) {
          found = {
            uid: data.uid,
            email: data.email,
            username: child.key!,
            nomeCompleto: data.nomeCompleto,
            role: (data.role ?? "usuario") as Role,
            setor: (data.setor ?? "geral") as Setor, // fallback geral
            status: data.status ?? "ativo",
            sgpUsername: data.sgpUsername ?? undefined,
            avatarUrl: data.avatarUrl ?? undefined,
          };
        }
      });

      if (found) return found;
    }

    if (i < tentativas - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Perfil não encontrado. Tente fazer login novamente.");
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          const profile = await fetchProfileWithRetry(firebaseUser.uid);

          if (profile.status === "inativo") {
            await auth.signOut();
            throw new Error("Sua conta está inativa. Contate o administrador.");
          }

          setUser(profile);
          setError(null);
        } catch (err: any) {
          setError(err.message || "Erro ao carregar perfil.");
          setUser(null);
        } finally {
          setLoading(false);
        }
      },
    );

    return () => unsubscribe();
  }, []);

  return { user, loading, error };
}
