// =================================================================
// SGP — AUTENTICAÇÃO
// =================================================================

import { SGP_IP_35, SGP_IP_53, LOGIN_CACHE_TTL_MS } from './constants'

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

  // Fallback padrão
  try {
    const ip35 = await performLoginCheck(SGP_IP_35)
    if (ip35.isLoggedIn) return ip35
  } catch {
    console.warn('Extensão ATI: IP 35 falhou, tentando IP 53...')
  }

  try {
    const ip53 = await performLoginCheck(SGP_IP_53)
    if (ip53.isLoggedIn) return ip53
  } catch {
    console.warn('Extensão ATI: IP 53 falhou.')
  }

  return { isLoggedIn: false, baseUrl: SGP_IP_35 }
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
  // Obtém o SGP preferencial salvo pelo usuário (fallback para SGP_IP_53 se não existir)
  const result = await chrome.storage.local.get('ati_preferred_sgp')
  const defaultBaseUrl = result.ati_preferred_sgp || SGP_IP_53;
  
  // Realiza a verificação dupla
  const bothLogged = await doubleCheckSgpLogins(forceCheck);
  
  if (!bothLogged) {
    return { isLoggedIn: false, baseUrl: defaultBaseUrl };
  }
  
  return { isLoggedIn: true, baseUrl: defaultBaseUrl };
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

export async function redirectUserToSgpLogins(is35Ok: boolean, is53Ok: boolean) {
  try {
    const tabs = await chrome.tabs.query({});
    
    if (!is35Ok) {
      const has35Tab = tabs.some(t => t.url && (t.url.includes('201.158.20.35') || t.url.includes('sgp.atiinternet.com.br')));
      if (!has35Tab) {
        await chrome.tabs.create({ url: `${SGP_IP_35}/admin/` });
      }
    }
    
    if (!is53Ok) {
      const has53Tab = tabs.some(t => t.url && t.url.includes('201.158.20.53'));
      if (!has53Tab) {
        await chrome.tabs.create({ url: `${SGP_IP_53}/admin/` });
      }
    }
  } catch (err) {
    console.error('Erro ao redirecionar para logins do SGP:', err);
  }
}

export async function doubleCheckSgpLogins(forceCheck = false): Promise<boolean> {
  const is35Logged = await ensureSgpSession(SGP_IP_35, forceCheck).catch(() => false);
  const is53Logged = await ensureSgpSession(SGP_IP_53, forceCheck).catch(() => false);
  
  if (!is35Logged || !is53Logged) {
    await redirectUserToSgpLogins(is35Logged, is53Logged);
    return false;
  }
  return true;
}

export async function performDailySgpCheck() {
  try {
    const today = new Date().toLocaleDateString('pt-BR');
    const result = await chrome.storage.local.get('sgp_last_daily_check_date');
    
    if (result.sgp_last_daily_check_date === today) {
      console.log('Extensão ATI: Verificação diária de login do SGP já realizada hoje.');
      return;
    }
    
    console.log('Extensão ATI: Iniciando verificação diária de login nos dois SGPs...');
    const is35Logged = await ensureSgpSession(SGP_IP_35).catch(() => false);
    const is53Logged = await ensureSgpSession(SGP_IP_53).catch(() => false);
    
    if (!is35Logged || !is53Logged) {
      console.log(`Extensão ATI: Login pendente no início do dia. .35: ${is35Logged}, .53: ${is53Logged}. Abrindo abas de login...`);
      await redirectUserToSgpLogins(is35Logged, is53Logged);
    }
    
    await chrome.storage.local.set({ sgp_last_daily_check_date: today });
  } catch (err) {
    console.error('Erro na verificação diária do SGP:', err);
  }
}
