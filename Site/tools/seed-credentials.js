// seed-credentials.js
// Script para popular as credenciais no Firebase Realtime Database.
// Execute: node tools/seed-credentials.js
//
// ATENÇÃO: Este script contém senhas reais. NÃO COMMITE este arquivo
// com as senhas preenchidas. Execute localmente e remova as senhas antes do commit.

import readline from 'readline'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// 1. Sobrescrever o fetch global IMEDIATAMENTE (antes de importar o Firebase)
const originalFetch = globalThis.fetch
globalThis.fetch = function (url, options = {}) {
  let headers = options.headers
  if (headers instanceof Headers) {
    if (!headers.has('Referer')) {
      headers.set('Referer', 'https://site-ati-75d83.firebaseapp.com')
    }
  } else if (Array.isArray(headers)) {
    const hasReferer = headers.some(([key]) => key.toLowerCase() === 'referer')
    if (!hasReferer) {
      headers = [...headers, ['Referer', 'https://site-ati-75d83.firebaseapp.com']]
    }
  } else {
    headers = headers ? { ...headers } : {}
    const hasReferer = Object.keys(headers).some(key => key.toLowerCase() === 'referer')
    if (!hasReferer) {
      headers['Referer'] = 'https://site-ati-75d83.firebaseapp.com'
    }
  }
  return originalFetch(url, { ...options, headers })
}

// 2. Importar o Firebase dinamicamente para garantir que ele capture a versão modificada do fetch
const { initializeApp } = await import('firebase/app')
const { getDatabase, ref, set } = await import('firebase/database')
const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth')

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = resolve(__dirname, '..', '..', '.env')
  try {
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      process.env[key] = val
    }
  } catch {
    console.warn('Arquivo .env não encontrado em', envPath)
  }
}

loadEnv()

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getDatabase(app)

const credentialsData = {
  grupos: [
    {
      titulo: 'ALCL OLT NOKIA',
      icon: '🔴',
      credenciais: [
        { label: 'LOGIN', valor: 'ATI-GPON' },
        { label: 'SENHA', valor: '@adminATI26422001' },
      ],
    },
    {
      titulo: 'ALCL OLT FIBER',
      icon: '🟠',
      credenciais: [
        { label: 'LOGIN', valor: 'AdminGPON' },
        { label: 'SENHA', valor: 'adminati2001' },
        { label: 'LOGIN (fábrica)', valor: 'AdminGPON' },
        { label: 'SENHA (fábrica)', valor: 'ALC#FGU' },
      ],
    },
    {
      titulo: 'NBEL',
      icon: '🟡',
      credenciais: [
        { label: 'ENDEREÇO', valor: 'IP/login.cgi' },
        { label: 'LOGIN', valor: 'atiinternet' },
        { label: 'SENHA', valor: '@dminati2001' },
        { label: 'LOGIN (alt)', valor: 'telecomadmin' },
        { label: 'SENHA (alt)', valor: 'admintelecom' },
      ],
    },
    {
      titulo: 'HUAWEI & TP LINK',
      icon: '🔵',
      credenciais: [
        { label: 'IP HUAWEI', valor: '192.168.3.1' },
        { label: 'IP TP LINK', valor: '192.168.0.1' },
        { label: 'SENHA', valor: 'atiadmin258963' },
        { label: 'SENHA (alt)', valor: 'ATIADMIN258963' },
      ],
    },
    {
      titulo: 'URA',
      icon: '📞',
      credenciais: [
        { label: 'ACESSO', valor: 'http://201.158.20.39:8022/login', link: 'http://201.158.20.39:8022/login' },
        { label: 'LOGIN', valor: 'christian' },
        { label: 'SENHA', valor: '@Ati26422001!10547580770' },
      ],
    },
  ],
  sites: [
    { label: 'Autentique', valor: 'https://painel.autentique.com.br/documentos/todos', link: 'https://painel.autentique.com.br/documentos/todos' },
    { label: 'ACS', valor: 'http://201.158.20.46:3000/', link: 'http://201.158.20.46:3000/' },
    { label: 'Curso', valor: 'https://atiinternet.cademi.com.br/area/vitrine', link: 'https://atiinternet.cademi.com.br/area/vitrine' },
    { label: 'SGP interno', valor: 'http://201.158.20.35:8000/', link: 'http://201.158.20.35:8000/' },
    { label: 'SGP externo', valor: 'https://sgp.atiinternet.com.br/admin/', link: 'https://sgp.atiinternet.com.br/admin/' },
  ],
}

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close()
    resolve(ans)
  }))
}

async function seed() {
  let adminEmail = process.env.VITE_SEED_EMAIL
  let adminPassword = process.env.VITE_SEED_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.log('\n--- Autenticação de Administrador Firebase ---')
    console.log('Por favor, informe suas credenciais de administrador.')
    if (!adminEmail) {
      adminEmail = await askQuestion('E-mail: ')
    }
    if (!adminPassword) {
      adminPassword = await askQuestion('Senha: ')
    }
  }

  if (!adminEmail || !adminPassword) {
    console.error('E-mail e senha de administrador são obrigatórios.')
    process.exit(1)
  }

  console.log('Autenticando como admin...')
  await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword)
  console.log('Autenticado com sucesso!')

  console.log('Enviando credenciais para o Firebase...')
  console.log('Projeto:', firebaseConfig.projectId)
  await set(ref(db, 'credenciais'), credentialsData)
  console.log('Credenciais enviadas com sucesso para /credenciais')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Erro ao enviar credenciais:', err)
  process.exit(1)
})
