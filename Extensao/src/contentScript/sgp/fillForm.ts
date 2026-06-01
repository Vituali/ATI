// =================================================================
// CONTENT SCRIPT — SGP
// Usa postMessage para passar dados ao sgpFill.js sem scripts inline
// =================================================================

console.log('Extensão ATI: SGP content script carregado.')

const isOccurrencePage = window.location.pathname.includes('/ocorrencia/add/')

if (isOccurrencePage) {
  const requestId = new URLSearchParams(window.location.search).get('ati_req_id')
  const storageKey = requestId ? `pendingSgpData_${requestId}` : 'pendingSgpData'

  chrome.storage.local.get([storageKey, 'ati_user_session'], (result) => {
    const data = result[storageKey]
    const session = result.ati_user_session
    const username = (session?.sgpUsername ?? session?.username)?.toLowerCase() ?? ''

    if (!data) {
      console.log('Extensão ATI: Sem dados pendentes para esta requisição.')
      return
    }

    console.log(`Extensão ATI: Dados pendentes encontrados (${storageKey}), carregando sgpFill.js...`)
    chrome.storage.local.remove(storageKey)

    // Injeta o script externo primeiro
    const script = document.createElement('script')
    script.src = chrome.runtime.getURL('src/contentScript/sgp/sgpFill.js')

    // Quando carregar, envia os dados via postMessage
    script.onload = () => {
      window.postMessage(
        {
          type: 'ATI_SGP_FILL',
          data,
          username,
          fullname: session?.nomeCompleto?.toLowerCase() ?? '',
        },
        window.location.origin,
      )
      script.remove()
    }

    document.documentElement.appendChild(script)
  })
}
