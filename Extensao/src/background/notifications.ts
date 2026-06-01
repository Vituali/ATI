
// =================================================================
// LÓGICA DE NOTIFICAÇÕES DO CHAT INTERNO
// =================================================================

import { firebaseConfig } from './config'
import { refreshIdToken } from './firebase'

const CHECK_INTERVAL_MINUTES = 1;
const getTs = () => `[${new Date().toLocaleTimeString('pt-BR')}]`;

export function setupChatNotifications() {
  // Criar alarme para checagem periódica
  chrome.alarms.create('checkChatMeta', { periodInMinutes: CHECK_INTERVAL_MINUTES });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkChatMeta') {
      checkNewMessages();
    }
  });

  // Checagem inicial
  checkNewMessages();
}

async function checkNewMessages() {
  try {
    // Diagnóstico: Verificar se temos permissão real no navegador
    if (chrome.notifications && chrome.notifications.getPermissionLevel) {
        chrome.notifications.getPermissionLevel((level) => {
            if (level !== 'granted') {
                console.warn(`${getTs()} Extensão ATI: [Notif] PERMISSÃO NEGADA PELO CHROME:`, level);
            }
        });
    }

    const result = await chrome.storage.local.get(['ati_user_session', 'ati_notif_rooms', 'ati_last_seen_meta']);
    let session = result.ati_user_session;
    if (!session || !session.idToken) return;

    // Verificar se o token expirou (margem de 1 minuto)
    const now = Date.now();
    if (session.tokenExpiresAt && now > (session.tokenExpiresAt - 60000)) {
      if (!session.refreshToken) {
        console.warn(`${getTs()} Extensão ATI: [Notif] Token expirado, mas sem refreshToken para renovar.`);
        return;
      }
      
      console.log(`${getTs()} Extensão ATI: [Notif] Token expirado. Renovando...`);
      const res = await refreshIdToken(session.refreshToken);
      if (res) {
        session = { ...session, ...res };
        await chrome.storage.local.set({ ati_user_session: session });
      } else {
        console.error(`${getTs()} Extensão ATI: [Notif] Falha ao renovar token.`);
        return;
      }
    }

    let allowedRooms = ['geral', 'ti', 'financeiro', 'suporte', 'comercial'];
    const isPrivileged = ['supervisor', 'moderador', 'admin'].includes(session.role);
    if (!isPrivileged) {
      allowedRooms = ['geral'];
      if (session.setor && session.setor !== 'geral') {
        allowedRooms.push(session.setor);
      }
    }
    const roomsToNotify = (result.ati_notif_rooms || ['geral', 'ti', 'financeiro', 'suporte', 'comercial'])
      .filter((r: string) => allowedRooms.includes(r));
    const lastSeen = result.ati_last_seen_meta || {};

    const baseUrl = firebaseConfig.databaseURL;
    const url = `${baseUrl}chat/meta.json?auth=${session.idToken}`;

    const res = await fetch(url);
    if (!res.ok) {
        console.error(`${getTs()} Extensão ATI: [Notif] Erro ao buscar meta:`, res.status);
        return;
    }

    const meta = await res.json();
    if (!meta) return;

    console.log(`${getTs()} Extensão ATI: [Notif] Eu sou @${session.username}. Checando salas: ${roomsToNotify.join(', ')}`);
    
    let hasNew = false;
    const newLastSeen = { ...lastSeen };

    for (const room of roomsToNotify) {
      const data = meta[room]?.ultimaMensagem;
      if (!data) {
          console.log(`${getTs()} Extensão ATI: [Notif] Sala #${room} sem meta.`);
          continue;
      }

      const roomLastSeenTs = lastSeen[room] || 0;
      console.log(`${getTs()} Extensão ATI: [Notif] #${room} -> Última: ${data.timestamp} (@${data.autor}) | Visto: ${roomLastSeenTs}`);

      // Se a mensagem for nova e não for do próprio usuário
      if (data.timestamp > roomLastSeenTs && data.autor !== session.username) {
        console.log(`${getTs()} Extensão ATI: [Notif] Nova mensagem detectada em #${room} por @${data.autor}`);
        showChatNotification(room, data.autor);
        hasNew = true;
      }
      
      newLastSeen[room] = data.timestamp;
    }

    if (hasNew) {
      await chrome.storage.local.set({ ati_last_seen_meta: newLastSeen });
    } else {
        // Mesmo se não houver novas para notificar, atualizamos o "visto" para não notificar mensagens antigas no futuro
        await chrome.storage.local.set({ ati_last_seen_meta: newLastSeen });
    }

  } catch (error) {
    console.error('Extensão ATI: Erro ao checar notificações:', error);
  }
}

function showChatNotification(room: string, autor: string) {
  if (!chrome.notifications) return;

  const roomName = room.toUpperCase();
  
  // Adicionar Badge no ícone da extensão (bolinha vermelha com '!')
  if (chrome.action) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }

  const notificationId = `chat-${room}-${Date.now()}`;
  
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'img/logo-128.png', // Tentar caminho relativo simples
    title: `Mensagem em #${roomName}`,
    message: `@${autor} enviou uma nova mensagem.`,
    priority: 2,
    eventTime: Date.now()
  }, (id) => {
    if (chrome.runtime.lastError) {
        console.error('Extensão ATI: [Notif] Erro ao criar notificação:', chrome.runtime.lastError);
    } else {
        console.log('Extensão ATI: [Notif] Notificação exibida com ID:', id);
    }
  });
}

// Limpar o badge quando o usuário abrir a aba do Chatmix ou interagir
if (chrome.notifications && chrome.notifications.onClicked) {
  chrome.notifications.onClicked.addListener((id) => {
      // Limpar badge
      if (chrome.action) chrome.action.setBadgeText({ text: '' });
      
      chrome.tabs.query({ url: '*://*.chatmix.com.br/*' }, (tabs) => {
          if (tabs.length > 0) {
              chrome.tabs.update(tabs[0].id!, { active: true });
          } else {
              chrome.tabs.create({ url: 'https://www.chatmix.com.br/' });
          }
      });
  });
}
