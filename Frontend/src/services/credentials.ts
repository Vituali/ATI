import { api } from './api'

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
    const data: any = await api.get('/api/config/credenciais')
    const valor = data?.valor || data
    cachedData = {
      grupos: valor.grupos ?? [],
      sites: valor.sites ?? [],
    }
    lastFetch = now
    return cachedData
  } catch {
    if (cachedData) return cachedData
    return { grupos: [], sites: [] }
  }
}

export async function isAdminUser(): Promise<boolean> {
  try {
    const me = await api.get('/api/atendentes/me') as any
    return me.role === 'admin'
  } catch {
    return false
  }
}
