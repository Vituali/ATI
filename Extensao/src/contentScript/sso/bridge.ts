const ALLOWED_ORIGINS = [
  'https://vituali.github.io',
  'https://site-ati-75d83.web.app',
  'https://site-ati-75d83.firebaseapp.com',
  'http://localhost:5173'
]

function isValidOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.some((allowed) => origin === allowed || origin.startsWith(allowed + '/'))
}

function currentAllowedOrigin(): string | null {
  return ALLOWED_ORIGINS.find((o) => window.location.origin.startsWith(o)) ?? null
}

console.log('[Extensão ATI] Ponte de SSO ativa e aguardando...')

function pingSite() {
  const origin = currentAllowedOrigin()
  if (origin) {
    window.postMessage({ type: 'ATI_EXTENSION_TO_SITE', action: 'BRIDGE_READY' }, origin)
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return
  if (!isValidOrigin(event.origin)) {
    console.warn(`[Extensão ATI] Bridge ignorou mensagem de origem não autorizada: ${event.origin}`)
    return
  }

  const { type, action, session } = event.data || {}

  if (type?.startsWith('ATI_')) {
    console.log(`[Extensão ATI] Bridge ouviu: type=${type}, action=${action}, origin=${event.origin}`)
  }

  if (type === 'ATI_SITE_TO_EXTENSION' && action === 'SSO_LOGIN') {
    console.log('[Extensão ATI] Recebido login do site, salvando no background...')
    chrome.runtime.sendMessage({ action: 'SSO_LOGIN', session }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Extensão ATI] Erro ao enviar login para background:', chrome.runtime.lastError)
        return
      }
      console.log('[Extensão ATI] Resposta do background:', response)
    })
  }

  if (type === 'ATI_SITE_TO_EXTENSION' && action === 'SSO_LOGOUT') {
    console.log('[Extensão ATI] Recebido logout do site, limpando no background...')
    chrome.runtime.sendMessage({ action: 'logout' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Extensão ATI] Erro ao enviar logout para background:', chrome.runtime.lastError)
        return
      }
      console.log('[Extensão ATI] Resposta do logout do background:', response)
    })
  }

  if (type === 'ATI_SITE_TO_EXTENSION' && action === 'GET_SSO_SESSION') {
    chrome.runtime.sendMessage({ action: 'GET_SSO_SESSION' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Extensão ATI] Erro ao buscar sessão do background:', chrome.runtime.lastError)
        return
      }
      console.log('[Extensão ATI] Enviando sessão atual para o site:', !!response?.session)
      const origin = currentAllowedOrigin()
      if (origin) {
        window.postMessage({ type: 'ATI_EXTENSION_TO_SITE', action: 'SSO_SESSION_DATA', session: response?.session }, origin)
      }
    })
  }
})

chrome.runtime.sendMessage({ action: 'GET_SSO_SESSION' }, (response) => {
  if (chrome.runtime.lastError) {
    console.warn('[Extensão ATI] Erro ao verificar sessão inicial:', chrome.runtime.lastError)
    pingSite()
    return
  }
  if (!response?.session) {
    console.log('[Extensão ATI] Nenhuma sessão no background. Solicitando ao site...')
    pingSite()
  } else {
    console.log('[Extensão ATI] Já existe uma sessão ativa no background.')
  }
})
