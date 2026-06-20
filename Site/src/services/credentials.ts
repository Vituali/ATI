import { ref, get } from 'firebase/database'
import { db } from './firebase'
import { auth } from './firebase'

interface Credencial {
  label: string
  valor: string
  link?: string
}

interface GrupoSenha {
  titulo: string
  icon: string
  credenciais: Credencial[]
}

let cachedData: { grupos: GrupoSenha[]; sites: Credencial[] } | null = null
let lastFetch = 0
const CACHE_TTL = 5 * 60 * 1000

export async function getCredentials(): Promise<{ grupos: GrupoSenha[]; sites: Credencial[] }> {
  const now = Date.now()
  if (cachedData && now - lastFetch < CACHE_TTL) {
    return cachedData
  }

  try {
    const snap = await get(ref(db, 'credenciais'))
    if (snap.exists()) {
      const data = snap.val()
      cachedData = {
        grupos: data.grupos ?? [],
        sites: data.sites ?? [],
      }
      lastFetch = now
      return cachedData
    }
  } catch (e) {
    console.warn('Erro ao buscar credenciais do Firebase, usando fallback vazio:', e)
  }

  return { grupos: [], sites: [] }
}

export async function isAdminUser(): Promise<boolean> {
  const user = auth.currentUser
  if (!user) return false
  try {
    const snap = await get(ref(db, 'atendentes'))
    if (!snap.exists()) return false
    let isAdmin = false
    snap.forEach((child) => {
      const data = child.val()
      if (data.uid === user.uid && data.role === 'admin') {
        isAdmin = true
      }
    })
    return isAdmin
  } catch {
    return false
  }
}
