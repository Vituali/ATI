// =================================================================
// SGP — AUTENTICAÇÃO
// =================================================================

import { SGP_DNS, SGP_IP_35, SGP_IP_53, LOGIN_CACHE_TTL_MS } from './constants'

export async function performLoginCheck(baseUrl: string): Promise<{ isLoggedIn: boolean; baseUrl: string }> {
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

export async function updateSgpStatusCache(status: { isLoggedIn: boolean; baseUrl: string }): Promise<void> {
  await chrome.storage.local.set({
    sgp_status_cache: { ...status, timestamp: Date.now() },
  })
}

async function checkSgpStatus(): Promise<{ isLoggedIn: boolean; baseUrl: string }> {
  console.log('Extensão ATI: Verificando status do SGP...')

  // Verifica se há uma preferência manual
  const { ati_preferred_sgp } = await chrome.storage.local.get('ati_preferred_sgp')

  if (ati_preferred_sgp) {
    console.log(`Extensão ATI: Usando SGP preferido: ${ati_preferred_sgp}`)
    try {
      const pref = await performLoginCheck(ati_preferred_sgp)
      return pref
    } catch {
      console.warn(`Extensão ATI: SGP preferido falhou (${ati_preferred_sgp}), retornando como offline.`)
      return { isLoggedIn: false, baseUrl: ati_preferred_sgp }
    }
  }

  // Fallback padrão se não houver preferência
  try {
    const dns = await performLoginCheck(SGP_DNS)
    if (dns.isLoggedIn) return dns
  } catch {
    console.warn('Extensão ATI: DNS falhou, tentando IPs...')
  }

  const ips = [SGP_IP_53, SGP_IP_35]
  for (const ipUrl of ips) {
    try {
      const ip = await performLoginCheck(ipUrl)
      if (ip.isLoggedIn) return ip
    } catch {
      console.warn(`Extensão ATI: IP ${ipUrl} falhou.`)
    }
  }

  return { isLoggedIn: false, baseUrl: SGP_DNS }
}

export async function performSilentLogin(baseUrl: string): Promise<boolean> {
  try {
    console.log(`Extensão ATI: Tentando login silencioso em ${baseUrl}...`)

    // 1. Pega as credenciais
    const isSpecialIp = baseUrl.includes('201.158.20.53')
    const storageKeys = isSpecialIp ? ['sgp_credentials_alt', 'sgp_credentials'] : ['sgp_credentials']
    const result = await chrome.storage.local.get(storageKeys)

    let creds = result.sgp_credentials
    if (isSpecialIp && result.sgp_credentials_alt?.login) {
      creds = result.sgp_credentials_alt
      console.log('Extensão ATI: Usando credenciais alternativas para login silencioso no IP 53')
    }

    if (!creds?.login || !creds?.pass) {
      console.warn('Extensão ATI: Credenciais não encontradas para login silencioso.')
      return false
    }

    // 2. Primeiro GET para pegar o CSRF Token
    const loginPageUrl = `${baseUrl}/accounts/login/`
    const getResponse = await fetch(loginPageUrl, { credentials: 'include' })

    // Se fomos redirecionados para o admin, já estamos logados!
    if (getResponse.url.includes('/admin/')) {
      console.log('Extensão ATI: Já logado (redirecionado para admin).')
      await updateSgpStatusCache({ isLoggedIn: true, baseUrl })
      return true
    }

    const html = await getResponse.text()

    // Tenta extrair o CSRF Token com regex mais flexível
    // 1. Padrão: name="csrfmiddlewaretoken" value="TOKEN"
    // 2. Invertido: value="TOKEN" name="csrfmiddlewaretoken"
    const genericCsrfMatch = html.match(/name=['"]csrfmiddlewaretoken['"]\s+value=['"]?([^"'\s>]+)['"]?/i) || html.match(/value=['"]?([^"'\s>]+)['"]?\s+name=['"]csrfmiddlewaretoken['"]/i)

    const csrfToken = genericCsrfMatch ? genericCsrfMatch[1] : ''

    if (!csrfToken) {
      console.error(`Extensão ATI: Não foi possível encontrar o CSRF Token em ${getResponse.url}. Status: ${getResponse.status}`, 'Início do HTML:', html.substring(0, 200))
      // Se não achou o token mas estamos na página de login, pode ser um erro do SGP
      // ou o usuário já estar logado mas o Django não redirecionou (raro).
      return false
    }

    // 3. Faz o POST com os dados
    const formData = new URLSearchParams()
    formData.append('username', creds.login)
    formData.append('password', creds.pass)
    formData.append('csrfmiddlewaretoken', csrfToken)
    formData.append('next', '/admin/')

    const postResponse = await fetch(loginPageUrl, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: loginPageUrl,
      },
      redirect: 'manual', // Importante para detectar o redirecionamento de sucesso
    })

    // No Django, um login com sucesso geralmente retorna um 302 Redirect
    // Se o status for 200 e ainda estivermos na página de login, deu erro.
    const success = postResponse.status === 302 || postResponse.status === 301 || (postResponse.status === 200 && !postResponse.url.includes('/accounts/login')) || postResponse.type === 'opaqueredirect'

    console.log(`Extensão ATI: Resultado do login silencioso: ${success ? 'Sucesso' : 'Falha'}`)

    if (!success) {
      console.warn(`Extensão ATI: Falha detalhada no login. Status: ${postResponse.status}, URL: ${postResponse.url}, Type: ${postResponse.type}, Redirected: ${postResponse.redirected}`)
    } else {
      await updateSgpStatusCache({ isLoggedIn: true, baseUrl })
    }

    return success
  } catch (error) {
    console.error('Extensão ATI: Erro no login silencioso.', error)
    return false
  }
}

export async function getSgpStatus(forceCheck = false): Promise<{ isLoggedIn: boolean; baseUrl: string }> {
  const result = await chrome.storage.local.get('sgp_status_cache')
  const cache = result.sgp_status_cache

  if (!forceCheck && cache?.isLoggedIn) {
    const isExpired = Date.now() - cache.timestamp > LOGIN_CACHE_TTL_MS
    if (!isExpired) {
      return { isLoggedIn: cache.isLoggedIn, baseUrl: cache.baseUrl }
    }
  }

  // Se não estiver logado no cache, tenta verificar no site
  let status = await checkSgpStatus()

  // Se não estiver logado, tenta o login silencioso antes de desistir
  if (!status.isLoggedIn) {
    const loginSuccess = await performSilentLogin(status.baseUrl)
    if (loginSuccess) {
      status = await checkSgpStatus() // Verifica de novo após o login
    }
  }

  if (status.isLoggedIn) {
    await updateSgpStatusCache(status)
  }

  return status
}
