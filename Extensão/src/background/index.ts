// =================================================================
// BACKGROUND SERVICE WORKER — ENTRY POINT
// =================================================================

import { handleFirebaseLogin, getOsTemplates, getQuickReplies, getOccurrenceTypes, refreshIdToken } from './firebase'
import { handleOpenInSgp, getSgpFormParams, createOccurrenceVisually, refreshSgpOnlineStatuses } from './sgp/occurrence'
import { getSgpStatus } from './sgp/auth'
import { deleteSgpFormCache } from './sgp/cache'
import { deleteCpfCacheEntry, deleteCpfCacheByUid } from './sgp/cpfCache'
import { setupChatNotifications } from './notifications'
import type { ExtensionRequest } from './types'

const getTs = () => `[${new Date().toLocaleTimeString('pt-BR')}]`;

// Configuração local para evitar imports que dependem de 'window'
const fbConfig = {
  databaseURL: (import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '').endsWith('/') 
    ? (import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '') 
    : (import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '') + '/'
};

console.log(`${getTs()} Extensão ATI: Background iniciado.`)

// Inicializar monitoramento de notificações e versão
setupChatNotifications();
checkExtensionVersion();

chrome.runtime.onMessage.addListener((request: ExtensionRequest, _sender, sendResponse) => {
  if (request.action === 'firebaseLogin') {
    handleFirebaseLogin(request.email, request.password)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === 'openInSgp') {
    handleOpenInSgp(request.clientData, request.cachedContract, request.forceClientId, request.uid, request.forceShowModal)
      .then((res) => sendResponse(res))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === 'getSgpFormParams') {
    getSgpFormParams(request.clientData, request.chatId, request.idToken, request.uid)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, message: error.message }))
    return true
  }

  if (request.action === 'createOccurrenceVisually') {
    createOccurrenceVisually(request.data)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === 'clearSgpCache') {
    deleteSgpFormCache(request.cacheKey)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === 'clearCpfCache') {
    deleteCpfCacheEntry(request.cpf)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === 'clearCpfCacheByUid') {
    deleteCpfCacheByUid(request.uid)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === 'getOsTemplates') {
    getOsTemplates(request.username, request.idToken)
      .then((templates) => sendResponse({ success: true, templates }))
      .catch((error) => sendResponse({ success: false, templates: [], error: error.message }))
    return true
  }

  if (request.action === 'getQuickReplies') {
    getQuickReplies(request.username, request.idToken)
      .then((replies) => sendResponse({ success: true, replies }))
      .catch((error) => sendResponse({ success: false, replies: [], error: error.message }))
    return true
  }

  if (request.action === 'refreshSgpOnlineStatuses') {
    refreshSgpOnlineStatuses(request.clientData, request.chatId)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === 'getGlobalOccurrenceTypes') {
    getSgpStatus()
      .then(({ baseUrl }) => getOccurrenceTypes(baseUrl, request.idToken))
      .then((types) => sendResponse({ success: true, types }))
      .catch((error) => sendResponse({ success: false, types: [], error: error.message }))
    return true
  }

  if (request.action === 'refreshToken') {
    refreshIdToken(request.refreshToken)
      .then((result) => sendResponse({ success: !!result, ...result }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === 'firebaseFetch') {
    console.log(`${getTs()} Extensão ATI: [Chat] Fetching:`, request.url)
    fetch(request.url)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          console.error('Extensão ATI: [Chat] Fetch Error:', data)
          return sendResponse({ success: false, error: data.error || 'Erro na requisição' })
        }
        sendResponse({ success: true, data })
      })
      .catch(error => {
        console.error('Extensão ATI: [Chat] Fetch Network Error:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.action === 'firebasePost') {
    console.log(`${getTs()} Extensão ATI: [Chat] Posting to:`, request.url)
    fetch(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.payload),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          console.error(`${getTs()} Extensão ATI: [Chat] Post Error:`, data)
          return sendResponse({ success: false, error: data.error || 'Erro ao postar' })
        }
        console.log(`${getTs()} Extensão ATI: [Chat] Post Success`)
        sendResponse({ success: true, data })
      })
      .catch(error => {
        console.error('Extensão ATI: [Chat] Post Network Error:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (request.action === 'firebasePatch') {
    fetch(request.url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.payload),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) return sendResponse({ success: false, error: data.error || 'Erro ao atualizar' })
        sendResponse({ success: true, data })
      })
      .catch(error => sendResponse({ success: false, error: error.message }))
    return true
  }

  // Sincronização de Login (SSO) via Ponte (Content Script)
  if (request.action === 'SSO_LOGIN' && request.session) {
    chrome.storage.local.get(['ati_user_session']).then((result) => {
      const existing = result.ati_user_session;
      const newSession = { ...request.session };
      
      // Se já temos a senha gravada (de um login manual), mantemos ela
      if (existing?.password && !newSession.password) {
        newSession.password = existing.password;
      }

      chrome.storage.local.set({ ati_user_session: newSession })
        .then(() => {
          console.log(`${getTs()} Extensão ATI: Sessão sincronizada (Senha preservada: ${!!newSession.password})`);
          sendResponse({ success: true });
          
          chrome.notifications.create('sso-login', {
            type: 'basic',
            iconUrl: 'img/logo-128.png',
            title: 'Sessão Sincronizada',
            message: `Sua conta (${newSession.username}) está ativa em todos os apps ATI!`,
            priority: 0
          });
        });
    });
    return true;
  }

  if (request.action === 'GET_SSO_SESSION') {
    chrome.storage.local.get(['ati_user_session'])
      .then((result) => sendResponse({ success: true, session: result.ati_user_session || null }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === 'refreshUserSession') {
    chrome.storage.local.get(['ati_user_session']).then(async (result) => {
      const session = result.ati_user_session
      if (!session || !session.idToken || !session.uid) {
        sendResponse({ success: false, error: 'Sem sessão ativa' })
        return
      }
      try {
        const dbResponse = await fetch(`${fbConfig.databaseURL}atendentes.json?auth=${session.idToken}`)
        if (!dbResponse.ok) throw new Error('Falha ao buscar dados do Firebase')
        const atendentes = await dbResponse.json()
        if (atendentes) {
          let foundUsername: string | null = null
          let foundData: any = null

          for (const [username, data] of Object.entries(atendentes)) {
            if ((data as any).uid === session.uid) {
              foundUsername = username
              foundData = data
              break
            }
          }

          if (foundUsername && foundData) {
            const updatedSession = {
              ...session,
              nomeCompleto: foundData.nomeCompleto || session.nomeCompleto,
              sgpUsername: foundData.sgpUsername || undefined,
              role: foundData.role || session.role,
              setor: foundData.setor || session.setor,
              avatarUrl: foundData.avatarUrl || session.avatarUrl,
            }
            await chrome.storage.local.set({ ati_user_session: updatedSession })
            console.log(`Extensão ATI: Sessão sincronizada do Firebase para ${session.username}`)
            sendResponse({ success: true, session: updatedSession })
            return
          }
        }
        sendResponse({ success: false, error: 'Usuário não cadastrado no Firebase' })
      } catch (error: any) {
        console.error('Extensão ATI: Erro ao atualizar sessão.', error)
        sendResponse({ success: false, error: error.message })
      }
    })
    return true
  }

  if (request.action === 'clearSessionCaches') {
    chrome.storage.session.clear()
      .then(() => {
        console.log('Extensão ATI: Caches de sessão limpos com sucesso.')
        sendResponse({ success: true })
      })
      .catch((err) => {
        console.error('Extensão ATI: Erro ao limpar caches de sessão.', err)
        sendResponse({ success: false, error: err.message })
      })
    return true
  }

  if (request.action === 'logout') {
    Promise.all([
      chrome.storage.local.remove('ati_user_session'),
      chrome.storage.session.clear()
    ])
      .then(() => {
        console.log('Extensão ATI: Sessão local e caches limpos por logout remoto.')
        sendResponse({ success: true })
      })
      .catch((err) => {
        console.error('Extensão ATI: Erro ao efetuar logout remoto.', err)
        sendResponse({ success: false, error: err.message })
      })
    return true
  }
})

// Sincronização de Login (SSO) do Site para a Extensão
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log(`${getTs()} Extensão ATI: Mensagem externa recebida de ${sender.url}:`, request.action);

  if (request.action === 'SSO_LOGIN' && request.session) {
    chrome.storage.local.set({ ati_user_session: request.session })
      .then(() => {
        console.log(`${getTs()} Extensão ATI: Sessão sincronizada via SSO iniciada.`);
        sendResponse({ success: true });
        
        // Opcional: Notifica o usuário
        chrome.notifications.create('sso-login', {
          type: 'basic',
          iconUrl: 'img/logo-128.png',
          title: 'Sessão Sincronizada',
          message: `Bem-vindo de volta, ${request.session.nomeCompleto}!`,
          priority: 0
        });
      })
      .catch((err) => {
        console.error(`${getTs()} Extensão ATI: Erro ao salvar sessão SSO:`, err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (request.action === 'GET_SSO_SESSION') {
    chrome.storage.local.get(['ati_user_session'])
      .then((result) => {
        sendResponse({ success: true, session: result.ati_user_session || null });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// =================================================================
// VERIFICAÇÃO DE VERSÃO E AUTO-UPDATE
// =================================================================

async function checkExtensionVersion() {
  try {
    const result = await chrome.storage.local.get(['ati_user_session']);
    const session = result.ati_user_session;
    if (!session || !session.idToken) return;

    const currentVersion = chrome.runtime.getManifest().version;
    const url = `${fbConfig.databaseURL}config/extension.json?auth=${session.idToken}`;
    const res = await fetch(url);
    if (!res.ok) return;

    const config = await res.json();
    if (!config || !config.minVersion) return;

    console.log(`${getTs()} Extensão ATI: Versão Local: ${currentVersion} | Mínima: ${config.minVersion}`);

    if (isVersionLower(currentVersion, config.minVersion)) {
      console.warn(`${getTs()} Extensão ATI: ATUALIZAÇÃO REQUERIDA!`);
      
      // 1. Salva no storage para o Popup/ContentScript mostrarem aviso
      await chrome.storage.local.set({ ati_update_required: true, ati_latest_version: config.minVersion });

      // 2. Tenta forçar o update no Google Chrome
      if (chrome.runtime.requestUpdateCheck) {
        chrome.runtime.requestUpdateCheck((status) => {
          console.log(`${getTs()} Extensão ATI: Status do update check: ${status}`);
          
          // Notificação de sistema para o usuário
          chrome.notifications.create('ati-update-alert', {
            type: 'basic',
            iconUrl: 'img/logo-128.png',
            title: '✨ Nova Atualização Disponível!',
            message: `A versão ${config.minVersion} da Extensão ATI já está disponível com novas funcionalidades e correções.`,
            priority: 1
          });
        });
      }
    } else {
      await chrome.storage.local.set({ ati_update_required: false });
    }
  } catch (err) {
    console.error('Erro ao verificar versão:', err);
  }
}

// Compara versões (ex: "2.1.0" vs "2.2.0")
function isVersionLower(current: string, min: string) {
  const c = current.split('.').map(Number);
  const m = min.split('.').map(Number);
  for (let i = 0; i < Math.max(c.length, m.length); i++) {
    const v1 = c[i] || 0;
    const v2 = m[i] || 0;
    if (v1 < v2) return true;
    if (v1 > v2) return false;
  }
  return false;
}

// Ouvir quando o update estiver baixado para aplicar imediatamente
chrome.runtime.onUpdateAvailable?.addListener((details) => {
  console.log(`${getTs()} Extensão ATI: Versão ${details.version} disponível e baixada. Reiniciando...`);
  chrome.runtime.reload();
});
