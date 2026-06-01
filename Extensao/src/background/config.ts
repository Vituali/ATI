
// Configuração leve do Firebase para o Service Worker (sem dependências de DOM/Firebase SDK)
const rawDatabaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL ?? ''

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: rawDatabaseURL.endsWith('/') ? rawDatabaseURL : rawDatabaseURL + '/',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
