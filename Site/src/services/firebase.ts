// services/firebase.ts
// ---------------------------------------------------------------
// Único lugar do projeto que conhece as chaves do Firebase.
// Todos os outros arquivos importam `auth` e `db` daqui —
// assim, se um dia trocar o Firebase, mexe só aqui.
// ---------------------------------------------------------------

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Cole aqui as chaves do seu projeto no Firebase Console
// (Configurações do projeto > Seus apps > SDK)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inicializa o app — deve ser chamado só uma vez em toda a aplicação
const app = initializeApp(firebaseConfig);

// Exporta as instâncias prontas para uso nos outros arquivos
export const auth = getAuth(app);
export const db = getDatabase(app);
