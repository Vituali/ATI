// =================================================================
// BACKGROUND SERVICE WORKER - COOKIE PROXY FOR SGP IFRAME (DEBUGGABLE)
// =================================================================

const SGP_TARGETS = [
  { url: 'http://201.158.20.53:8000', domain: '201.158.20.53', filter: '*201.158.20.53*', pattern: 'http://201.158.20.53:8000/*' },
  { url: 'http://201.158.20.35:8000', domain: '201.158.20.35', filter: '*201.158.20.35*', pattern: 'http://201.158.20.35:8000/*' },
  { url: 'https://sgp.atiinternet.com.br', domain: 'sgp.atiinternet.com.br', filter: '*sgp.atiinternet.com.br*', pattern: 'https://sgp.atiinternet.com.br/*' }
];

// Atualiza as regras do declarativeNetRequest (DNR)
async function updateSgpCookieRules() {
  const rules = [];
  let ruleId = 10001;

  for (const target of SGP_TARGETS) {
    try {
      // 1. Busca cookies associados a URL
      const cookies = await chrome.cookies.getAll({ url: target.url });
      if (cookies.length === 0) {
        console.log(`[Proxy] Sem cookies salvos para: ${target.url}`);
        continue;
      }

      // 2. Formata no padrão: "nome=valor; nome2=valor2"
      const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      console.log(`[Proxy] Injetando cookies em ${target.url}:`, cookieStr);

      // 3. Adiciona a regra de injeção de cabeçalho
      rules.push({
        id: ruleId++,
        priority: 999,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              header: 'Cookie',
              operation: 'set',
              value: cookieStr
            }
          ]
        },
        condition: {
          urlFilter: target.filter, // Ex: *201.158.20.53*
          resourceTypes: [
            'main_frame',
            'sub_frame',
            'xmlhttprequest',
            'script',
            'image',
            'stylesheet'
          ]
        }
      });
    } catch (err) {
      console.error(`[Proxy] Erro ao obter cookies para ${target.url}:`, err);
    }
  }

  // 4. Grava as regras na sessão
  try {
    const existingRules = await chrome.declarativeNetRequest.getSessionRules();
    const ruleIdsToRemove = existingRules
      .filter(r => r.id >= 10001 && r.id <= 10010)
      .map(r => r.id);

    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: rules
    });

    console.log(`[Proxy] Regras ativas para ${rules.length} alvos.`);
  } catch (err) {
    console.error('[Proxy] Erro ao aplicar regras no DNR:', err);
  }
}

// =================================================================
// COMUNICAÇÃO DE DEPURAÇÃO COM TESTE.HTML
// =================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getDebugInfo') {
    (async () => {
      const debugData = [];
      for (const target of SGP_TARGETS) {
        try {
          const cookies = await chrome.cookies.getAll({ url: target.url });
          debugData.push({
            url: target.url,
            domain: target.domain,
            cookies: cookies.map(c => ({ name: c.name, value: c.value }))
          });
        } catch (err) {
          debugData.push({ url: target.url, domain: target.domain, error: err.message });
        }
      }
      const rules = await chrome.declarativeNetRequest.getSessionRules();
      sendResponse({ targets: debugData, rules });
    })();
    return true; // async response
  }

  if (request.action === 'forceInjectCookies') {
    (async () => {
      try {
        const { targetUrl, domain, cookies } = request;
        
        for (const [name, value] of Object.entries(cookies)) {
          if (!value) continue;
          
          await chrome.cookies.set({
            url: targetUrl,
            name: name,
            value: value,
            domain: domain,
            path: '/',
            sameSite: 'no_restriction',
            secure: targetUrl.startsWith('https')
          });
        }
        
        await updateSgpCookieRules();
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // async response
  }
});

// =================================================================
// MONITORAMENTO DE MUDANÇAS DE COOKIES
// =================================================================
chrome.cookies.onChanged.addListener((changeInfo) => {
  const domain = changeInfo.cookie.domain.replace(/^\./, '');
  const matched = SGP_TARGETS.some(t => t.domain === domain);
  if (matched) {
    console.log(`[Proxy] Cookies de ${domain} alterados. Atualizando regras do proxy...`);
    updateSgpCookieRules();
  }
});

// =================================================================
// CAPTURA ATIVA DE SET-COOKIE
// =================================================================
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const setCookieHeaders = details.responseHeaders.filter(
      h => h.name.toLowerCase() === 'set-cookie'
    );

    if (setCookieHeaders.length > 0) {
      const url = new URL(details.url);
      const domain = url.hostname;

      for (const header of setCookieHeaders) {
        const parts = header.value.split(';');
        const [nameValue] = parts;
        const eqIdx = nameValue.indexOf('=');
        if (eqIdx === -1) continue;

        const name = nameValue.substring(0, eqIdx).trim();
        const value = nameValue.substring(eqIdx + 1).trim();

        chrome.cookies.set({
          url: details.url,
          name: name,
          value: value,
          domain: domain,
          path: '/',
          sameSite: 'no_restriction',
          secure: details.url.startsWith('https')
        })
        .then(() => {
          console.log(`[Proxy] Cookie salvo de resposta: ${name} em ${domain}`);
        })
        .catch((err) => {
          console.error(`[Proxy] Erro ao gravar cookie de resposta: ${name}`, err);
        });
      }
    }
  },
  { urls: SGP_TARGETS.map(t => t.pattern) },
  ['responseHeaders']
);

// =================================================================
// INICIALIZAÇÃO
// =================================================================
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('teste.html')
  });
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Proxy] Inicializado.');
  updateSgpCookieRules();
});

chrome.runtime.onStartup.addListener(() => {
  updateSgpCookieRules();
});

// Inicialização imediata
updateSgpCookieRules();
