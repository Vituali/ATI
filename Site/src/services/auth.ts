// services/auth.ts
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged, User } from 'firebase/auth'
import { ref, set, get } from 'firebase/database'
import { auth, db } from './firebase'

export interface AtendenteData {
  uid: string
  email: string
  nomeCompleto: string
  role: 'usuario' | 'admin'
  setor: string
  status: 'ativo' | 'inativo'
  sgpUsername?: string
}

export interface RegisterDetails {
  username: string
  fullName: string
  email: string
  password: string
  // setor removido do cadastro — novo usuário sempre começa como "geral"
  // o admin atribui o setor correto depois pelo painel
}

export async function register(details: RegisterDetails): Promise<void> {
  const { username, fullName, email, password } = details
  const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, '_')

  if (/[.$#[\]/]/.test(sanitizedUsername)) {
    throw new Error('Nome de usuário inválido. Evite pontos, #, $, [ ou ].')
  }

  const usernameSnap = await get(ref(db, `atendentes/${sanitizedUsername}`))
  if (usernameSnap.exists()) throw new Error('Este nome de usuário já está em uso.')

  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  // Aguarda o auth state propagar antes de escrever no banco
  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.uid === user.uid) {
        unsubscribe()
        resolve()
      }
    })
  })

  await updateProfile(user, { displayName: fullName })

  // Novo usuário sempre entra com setor "geral" e role "usuario"
  // O admin define o setor real pelo painel de administração
  await set(ref(db, `atendentes/${sanitizedUsername}`), {
    uid: user.uid,
    email,
    nomeCompleto: fullName,
    role: 'usuario',
    setor: 'geral', // ← sempre geral no cadastro
    status: 'ativo',
  })

  // Popula índice uid → username+role para verificação em regras do RTDB
  await set(ref(db, `uid_index/${user.uid}`), {
    username: sanitizedUsername,
    role: 'usuario',
  })
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  return (await signInWithEmailAndPassword(auth, email, password)).user
}

export async function loginWithUsername(username: string, password: string): Promise<User> {
  const snap = await get(ref(db, `atendentes/${username.trim().toLowerCase()}`))
  if (!snap.exists()) throw new Error('Usuário não encontrado.')

  const data = snap.val() as AtendenteData
  if (!data.email) throw new Error('Credenciais inválidas.')
  if (data.status === 'inativo') throw new Error('Conta inativa. Contate o administrador.')

  return loginWithEmail(data.email, password)
}

export async function login(usernameOrEmail: string, password: string): Promise<User> {
  return usernameOrEmail.includes('@') ? loginWithEmail(usernameOrEmail, password) : loginWithUsername(usernameOrEmail, password)
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

// Realiza o login no site usando dados da extensão (SSO Reverso)
export async function performSSOLogin(session: any) {
  if (!session.email || !session.password) {
    console.warn('SSO: [ATENCAO] Sensão da extensão incompleta para login automático.')
    return
  }

  if (auth.currentUser) return // Já logado

  try {
    console.log('SSO: [INICIO] Tentando login automático com dados da extensão...')
    await signInWithEmailAndPassword(auth, session.email, session.password)
    console.log('SSO: [OK] Login automático realizado com sucesso!')
  } catch (error) {
    console.error('SSO: [ERRO] Falha no login automático:', error)
  }
}

const EXTENSION_ORIGINS = ['https://vituali.github.io', 'https://site-ati-75d83.web.app', 'https://site-ati-75d83.firebaseapp.com', 'http://localhost:5173']

function isExtensionOrigin(origin: string): boolean {
  return EXTENSION_ORIGINS.some((allowed) => origin === allowed || origin.startsWith(allowed + '/'))
}

export async function syncWithExtension(user: User | null) {
  if (!user) {
    window.postMessage(
      {
        type: 'ATI_SITE_TO_EXTENSION',
        action: 'SSO_LOGOUT',
      },
      window.location.origin,
    )
    console.log('SSO: [VERMELHO] Mensagem de logout enviada para a ponte.')
    return
  }

  try {
    console.log('SSO: [BUSCA] Buscando perfil para sincronizar...')

    const atendentesSnap = await get(ref(db, 'atendentes'))
    if (!atendentesSnap.exists()) return

    const atendentes = atendentesSnap.val()
    let foundUsername = ''
    let foundData: AtendenteData | null = null

    for (const [username, data] of Object.entries(atendentes) as [string, any][]) {
      if (data.uid === user.uid) {
        foundUsername = username
        foundData = data as AtendenteData
        break
      }
    }

    if (!foundData) {
      console.warn('SSO: [ATENCAO] Perfil não encontrado no banco para este UID.')
      return
    }

    const idToken = await user.getIdToken(true)
    const refreshToken = user.refreshToken || (user as any).stsTokenManager?.refreshToken

    const session = {
      uid: user.uid,
      username: foundUsername,
      nomeCompleto: foundData.nomeCompleto,
      role: foundData.role,
      setor: foundData.setor || 'geral',
      email: foundData.email,
      idToken,
      refreshToken: refreshToken || '',
      tokenExpiresAt: Date.now() + 55 * 60 * 1000,
      sgpUsername: foundData.sgpUsername,
    }

    window.postMessage(
      {
        type: 'ATI_SITE_TO_EXTENSION',
        action: 'SSO_LOGIN',
        session,
      },
      window.location.origin,
    )

    console.log('SSO: [VERDE] Mensagem de login enviada para a ponte.')
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
        console.log('SSO: [LARANJA] Ponte da extensão avisou que está pronta.')
        if (auth.currentUser) syncWithExtension(auth.currentUser)
      }
    }
  })
  ;[500, 2000, 5000].forEach((delay) => {
    setTimeout(() => {
      if (auth.currentUser) {
        syncWithExtension(auth.currentUser)
      }
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
