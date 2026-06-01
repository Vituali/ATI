// =================================================================
// FIREBASE — CONFIGURAÇÃO E INICIALIZAÇÃO
// =================================================================
// A firebaseConfig é pública por design (chave do cliente, não admin)
// A segurança real está nas Rules do Firebase Realtime Database

import { initializeApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getDatabase, Database } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyB5wO0x-7NFmh6waMKzWzRew4ezfYOmYBI',
  authDomain: 'site-ati-75d83.firebaseapp.com',
  databaseURL: 'https://site-ati-75d83-default-rtdb.firebaseio.com/',
  projectId: 'site-ati-75d83',
  storageBucket: 'site-ati-75d83.appspot.com',
  messagingSenderId: '467986581951',
  appId: '1:467986581951:web:046a778a0c9b6967d5790a',
}

let app: FirebaseApp
let auth: Auth
let db: Database

export function getFirebaseApp(): FirebaseApp {
  if (!app) app = initializeApp(firebaseConfig)
  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(getFirebaseApp())
  return auth
}

export function getFirebaseDb(): Database {
  if (!db) db = getDatabase(getFirebaseApp())
  return db
}
