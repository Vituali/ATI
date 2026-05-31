// =================================================================
// AUTENTICAÇÃO E STATUS DO SGP
// =================================================================

import { SgpStatus } from './types'
import { getLoginCache, setLoginCache, clearLoginCache } from './cache'

const SGP_URLS = {
  ip: 'http://201.158.20.35:8000',
  ipNew: 'http://201.158.20.53:8000',
} as const

// Verifica se está logado tentando acessar /admin/
// Se redirecionar para /accounts/login/, não está logado
async function performLoginCheck(baseUrl: string): Promise<SgpStatus> {
  try {
    const response = await fetch(`${baseUrl}/admin/`, {
      credentials: 'include',
      signal: AbortSignal.timeout(4000),
    })

    const isLoggedIn = !response.url.includes('/accounts/login')
    console.log(`Extensão ATI: Login check em ${baseUrl} — logado: ${isLoggedIn}`)
    return { isLoggedIn, baseUrl }
  } catch (error) {
    console.error(`Extensão ATI: Falha ao verificar login em ${baseUrl}.`, error)
    throw error
  }
}

// Tenta DNS primeiro, fallback para IP direto
async function checkSgpStatus(): Promise<SgpStatus> {
  console.log('Extensão ATI: Verificando status do SGP...')

  // Lê a preferência salva pelo usuário
  const { ati_preferred_sgp } = await chrome.storage.local.get('ati_preferred_sgp')

  if (ati_preferred_sgp) {
    console.log(`Extensão ATI: Usando SGP preferido (content script): ${ati_preferred_sgp}`)
    try {
      const prefStatus = await performLoginCheck(ati_preferred_sgp)
      return prefStatus
    } catch {
      console.warn(`Extensão ATI: SGP preferido falhou (${ati_preferred_sgp}), retornando como offline.`)
      return { isLoggedIn: false, baseUrl: ati_preferred_sgp }
    }
  }

  // Fallback caso não haja preferência salva
  try {
    const ipStatus = await performLoginCheck(SGP_URLS.ip)
    if (ipStatus.isLoggedIn) return ipStatus
  } catch {
    console.warn('Extensão ATI: IP 35 falhou, tentando IP 53...')
  }

  try {
    const ipNewStatus = await performLoginCheck(SGP_URLS.ipNew)
    if (ipNewStatus.isLoggedIn) return ipNewStatus
  } catch {
    console.error('Extensão ATI: IP 53 também falhou.')
  }

  return { isLoggedIn: false, baseUrl: SGP_URLS.ip }
}

// Verifica status com cache de 2 horas
// Se o cache existe mas a sessão expirou, renova
export async function getSgpStatus(): Promise<SgpStatus> {
  const cached = await getLoginCache()

  if (cached?.isLoggedIn) {
    console.log('Extensão ATI: Usando cache de login, verificando sessão...')
    try {
      const verified = await performLoginCheck(cached.baseUrl)
      if (verified.isLoggedIn) {
        console.log('Extensão ATI: Sessão ainda ativa.')
        return verified
      }
      console.warn('Extensão ATI: Sessão expirou, renovando cache...')
      await clearLoginCache()
    } catch {
      console.warn('Extensão ATI: Falha ao verificar sessão do cache.')
      await clearLoginCache()
    }
  }

  const status = await checkSgpStatus()
  await setLoginCache({ ...status, timestamp: Date.now() })
  return status
}
