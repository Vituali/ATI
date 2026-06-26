// =================================================================
// SGP — AUTENTICAÇÃO
// =================================================================

import { LOGIN_CACHE_TTL_MS, SGP_DEFAULT_HOSTS } from './constants'
import { getSgpHosts, matchSgpKey } from './config'

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

export async function performSilentLogin(baseUrl: string): Promise<boolean> {
  try {
    console.log(`Extensão ATI: Tentando login silencioso em ${baseUrl}...`)

    // 1. Pega as credenciais
    const isSecondarySgp = matchSgpKey(baseUrl) === 'sgp_53'
    const storageKeys = isSecondarySgp ? ['sgp_credentials_alt', 'sgp_credentials'] : ['sgp_credentials']
    const result = await chrome.storage.local.get(storageKeys)

    let creds = result.sgp_credentials
    if (isSecondarySgp && result.sgp_credentials_alt?.login) {
      creds = result.sgp_credentials_alt
      console.log('Extensão ATI: Usando credenciais alternativas para login silencioso no IP alternativo')
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
  const hosts = await getSgpHosts()
  const defaultSgp53 = hosts.find(h => h.key === 'sgp_53')?.url ?? SGP_DEFAULT_HOSTS[1].url
  const result = await chrome.storage.local.get('ati_preferred_sgp')
  const defaultBaseUrl = result.ati_preferred_sgp || defaultSgp53

  const bothLogged = await doubleCheckSgpLogins(forceCheck)

  if (!bothLogged) {
    return { isLoggedIn: false, baseUrl: defaultBaseUrl }
  }

  return { isLoggedIn: true, baseUrl: defaultBaseUrl }
}

export async function ensureSgpSession(baseUrl: string, forceCheck = false): Promise<boolean> {
  const cacheKey = `sgp_session_cache_${baseUrl.replace(/[^a-zA-Z0-9]/g, '_')}`
  const result = await chrome.storage.local.get(cacheKey)
  const cache = result[cacheKey]

  if (!forceCheck && cache?.isLoggedIn) {
    const isExpired = Date.now() - cache.timestamp > LOGIN_CACHE_TTL_MS
    if (!isExpired) {
      return true
    }
  }

  // Se não estiver logado no cache, tenta verificar no site
  try {
    const status = await performLoginCheck(baseUrl)
    if (status.isLoggedIn) {
      await chrome.storage.local.set({ [cacheKey]: { isLoggedIn: true, timestamp: Date.now() } })
      return true
    }
  } catch {
    console.warn(`Extensão ATI: Checagem inicial de login falhou em ${baseUrl}, tentando login silencioso...`)
  }

  // Tenta o login silencioso antes de desistir
  const loginSuccess = await performSilentLogin(baseUrl)
  if (loginSuccess) {
    // Verifica de novo após o login
    try {
      const status = await performLoginCheck(baseUrl)
      if (status.isLoggedIn) {
        await chrome.storage.local.set({ [cacheKey]: { isLoggedIn: true, timestamp: Date.now() } })
        return true
      }
    } catch {}
  }

  await chrome.storage.local.set({ [cacheKey]: { isLoggedIn: false, timestamp: Date.now() } })
  return false
}

export async function redirectUserToSgpLogins(is35Ok: boolean, is53Ok: boolean, hosts?: import('./constants').SgpHost[]) {
  const h = hosts ?? await getSgpHosts()
  const h35 = h.find(host => host.key === 'sgp_35')
  const h53 = h.find(host => host.key === 'sgp_53')
  if (!h35 || !h53) return
  try {
    const tabs = await chrome.tabs.query({})

    if (!is35Ok) {
      const has35Tab = tabs.some((t) => t.url && (t.url.includes(extractIp(h35.url)) || t.url.includes('sgp.atiinternet.com.br')))
      if (!has35Tab) {
        await chrome.tabs.create({ url: `${h35.url}/admin/` })
      }
    }

    if (!is53Ok) {
      const has53Tab = tabs.some((t) => t.url && t.url.includes(extractIp(h53.url)))
      if (!has53Tab) {
        await chrome.tabs.create({ url: `${h53.url}/admin/` })
      }
    }
  } catch (err) {
    console.error('Erro ao redirecionar para logins do SGP:', err)
  }
}

function extractIp(url: string): string {
  const m = url.match(/https?:\/\/([\d.]+)/)
  return m ? m[1] : ''
}

export async function doubleCheckSgpLogins(forceCheck = false): Promise<boolean> {
  const hosts = await getSgpHosts()
  const h35 = hosts.find(h => h.key === 'sgp_35')?.url ?? SGP_DEFAULT_HOSTS[0].url
  const h53 = hosts.find(h => h.key === 'sgp_53')?.url ?? SGP_DEFAULT_HOSTS[1].url
  const is35Logged = await ensureSgpSession(h35, forceCheck).catch(() => false)
  const is53Logged = await ensureSgpSession(h53, forceCheck).catch(() => false)

  if (!is35Logged || !is53Logged) {
    await redirectUserToSgpLogins(is35Logged, is53Logged, hosts)
    return false
  }
  return true
}

export async function performDailySgpCheck() {
  try {
    const today = new Date().toLocaleDateString('pt-BR')
    const result = await chrome.storage.local.get('sgp_last_daily_check_date')

    if (result.sgp_last_daily_check_date === today) {
      console.log('Extensão ATI: Verificação diária de login do SGP já realizada hoje.')
      return
    }

    const hosts = await getSgpHosts()
    const h35 = hosts.find(h => h.key === 'sgp_35')?.url ?? SGP_DEFAULT_HOSTS[0].url
    const h53 = hosts.find(h => h.key === 'sgp_53')?.url ?? SGP_DEFAULT_HOSTS[1].url

    console.log('Extensão ATI: Iniciando verificação diária de login nos dois SGPs...')
    const is35Logged = await ensureSgpSession(h35).catch(() => false)
    const is53Logged = await ensureSgpSession(h53).catch(() => false)

    if (!is35Logged || !is53Logged) {
      console.log(`Extensão ATI: Login pendente no início do dia. .35: ${is35Logged}, .53: ${is53Logged}. Abrindo abas de login...`)
      await redirectUserToSgpLogins(is35Logged, is53Logged, hosts)
    }

    await chrome.storage.local.set({ sgp_last_daily_check_date: today })
  } catch (err) {
    console.error('Erro na verificação diária do SGP:', err)
  }
}
