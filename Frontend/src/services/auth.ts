import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged, User } from 'firebase/auth'
import { auth } from './firebase'
import { api } from './api'

export interface AtendenteData {
  uid: string
  email: string
  nomeCompleto: string
  role: string
  setor: string
  status: string
  sgpUsername?: string
}

export interface RegisterDetails {
  username: string
  fullName: string
  email: string
  password: string
}

export async function register(details: RegisterDetails): Promise<void> {
  const { username, fullName, email, password } = details
  const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, '_')

  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.uid === user.uid) {
        unsubscribe()
        resolve()
      }
    })
  })

  await updateProfile(user, { displayName: fullName })

  await api.post('/api/atendentes/register', {
    username: sanitizedUsername,
    uid: user.uid,
    email,
    nomeCompleto: fullName,
    role: 'usuario',
    setor: 'geral',
    status: 'ativo',
  })
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  return (await signInWithEmailAndPassword(auth, email, password)).user
}

export async function loginWithUsername(username: string, password: string): Promise<User> {
  try {
    const atendentes = await api.get('/api/atendentes')
    const atendentesList = atendentes as AtendenteData[]
    const found = atendentesList.find(
      (a: any) => a.username === username.trim().toLowerCase()
    )
    if (!found) throw new Error('Usuário não encontrado.')
    if (found.status === 'inativo') throw new Error('Conta inativa. Contate o administrador.')
    if (!found.email) throw new Error('Credenciais inválidas.')

    return loginWithEmail(found.email, password)
  } catch (err: any) {
    if (err.message === 'Usuário não encontrado.' || err.message === 'Conta inativa. Contate o administrador.') {
      throw err
    }
    throw new Error('Usuário não encontrado.')
  }
}

export async function login(usernameOrEmail: string, password: string): Promise<User> {
  return usernameOrEmail.includes('@') ? loginWithEmail(usernameOrEmail, password) : loginWithUsername(usernameOrEmail, password)
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

export async function performSSOLogin(session: any) {
  if (!session.email || !session.password) return
  if (auth.currentUser) return

  try {
    await signInWithEmailAndPassword(auth, session.email, session.password)
  } catch (error) {
    console.error('SSO: [ERRO] Falha no login automático:', error)
  }
}

const EXTENSION_ORIGINS = [
  'https://vituali.github.io',
  'https://site-ati-75d83.web.app',
  'https://site-ati-75d83.firebaseapp.com',
  'http://localhost:5173',
]

function isExtensionOrigin(origin: string): boolean {
  return EXTENSION_ORIGINS.some((allowed) => origin === allowed || origin.startsWith(allowed + '/'))
}

export async function syncWithExtension(user: User | null) {
  if (!user) {
    window.postMessage(
      { type: 'ATI_SITE_TO_EXTENSION', action: 'SSO_LOGOUT' },
      window.location.origin,
    )
    return
  }

  try {
    const atendentes = await api.get('/api/atendentes')
    const atendentesList = atendentes as any[]
    const found = atendentesList.find((a: any) => a.uid === user.uid)
    if (!found) return

    const idToken = await user.getIdToken(true)
    const refreshToken = (user as any).refreshToken || (user as any).stsTokenManager?.refreshToken

    const session = {
      uid: user.uid,
      username: found.username,
      nomeCompleto: found.nomeCompleto,
      role: found.role,
      setor: found.setor || 'geral',
      email: found.email,
      idToken,
      refreshToken: refreshToken || '',
      tokenExpiresAt: Date.now() + 55 * 60 * 1000,
      sgpUsername: found.sgpUsername,
    }

    window.postMessage(
      { type: 'ATI_SITE_TO_EXTENSION', action: 'SSO_LOGIN', session },
      window.location.origin,
    )
  } catch (error) {
    console.error('SSO: [ERRO] Erro durante sincronização:', error)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (!isExtensionOrigin(event.origin)) return

    const { type, action } = event.data || {}

    if (type === 'ATI_EXTENSION_TO_SITE') {
      if (action === 'BRIDGE_READY') {
        if (auth.currentUser) syncWithExtension(auth.currentUser)
      }
    }
  })
  ;[500, 2000, 5000].forEach((delay) => {
    setTimeout(() => {
      if (auth.currentUser) syncWithExtension(auth.currentUser)
      window.postMessage({ type: 'ATI_SITE_TO_EXTENSION', action: 'GET_SSO_SESSION' }, window.location.origin)
    }, delay)
  })
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (user) syncWithExtension(user)
    callback(user)
  })
}
