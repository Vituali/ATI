// =================================================================
// CACHE PERSISTENTE (chrome.storage.local)
// =================================================================

import { SgpStatusCache, SgpData } from './types'

const CACHE_KEYS = {
  sgpStatus: 'sgp_status_cache',
  sgpData: 'sgp_data_cache',
} as const

// Tempo de expiração do cache de login: 2 horas
const LOGIN_CACHE_TTL_MS = 2 * 60 * 60 * 1000

// --- Cache de status de login ---

export async function getLoginCache(): Promise<SgpStatusCache | null> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEYS.sgpStatus)
    const cache: SgpStatusCache | undefined = result[CACHE_KEYS.sgpStatus]

    if (!cache) return null

    const isExpired = Date.now() - cache.timestamp > LOGIN_CACHE_TTL_MS
    if (isExpired) {
      console.log('Extensão ATI: Cache de login expirado, será renovado.')
      await clearLoginCache()
      return null
    }

    return cache
  } catch (error) {
    console.error('Extensão ATI: Erro ao ler cache de login.', error)
    return null
  }
}

export async function setLoginCache(status: SgpStatusCache): Promise<void> {
  try {
    await chrome.storage.local.set({
      [CACHE_KEYS.sgpStatus]: { ...status, timestamp: Date.now() },
    })
  } catch (error) {
    console.error('Extensão ATI: Erro ao salvar cache de login.', error)
  }
}

export async function clearLoginCache(): Promise<void> {
  try {
    await chrome.storage.local.remove(CACHE_KEYS.sgpStatus)
  } catch (error) {
    console.error('Extensão ATI: Erro ao limpar cache de login.', error)
  }
}

// --- Cache de dados do cliente (por chave) ---

export async function getSgpDataCache(key: string): Promise<SgpData | null> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEYS.sgpData)
    const allCache: Record<string, SgpData> = result[CACHE_KEYS.sgpData] ?? {}
    return allCache[key] ?? null
  } catch (error) {
    console.error('Extensão ATI: Erro ao ler cache de dados SGP.', error)
    return null
  }
}

export async function setSgpDataCache(key: string, data: SgpData): Promise<void> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEYS.sgpData)
    const allCache: Record<string, SgpData> = result[CACHE_KEYS.sgpData] ?? {}
    allCache[key] = data
    await chrome.storage.local.set({ [CACHE_KEYS.sgpData]: allCache })
  } catch (error) {
    console.error('Extensão ATI: Erro ao salvar cache de dados SGP.', error)
  }
}

export async function clearSgpDataCache(): Promise<void> {
  try {
    await chrome.storage.local.remove(CACHE_KEYS.sgpData)
    console.log('Extensão ATI: Cache de dados SGP limpo.')
  } catch (error) {
    console.error('Extensão ATI: Erro ao limpar cache de dados SGP.', error)
  }
}
