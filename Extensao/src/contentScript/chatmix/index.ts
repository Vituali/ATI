// =================================================================
// ENTRY POINT — CHATMIX CONTENT SCRIPT
// =================================================================

import './style.css'
import { SELECTORS, log, logError, currentChatId, setCurrentChatId, lastExtractedData } from './state'
import { getClientData } from './getClientData'
import { formatPhoneNumber } from './helpers'
import { setCachedContract, smartOpenSGP } from '../sgp/actions'
import { getSession, ensureFreshToken, UserSession } from './auth/session'
import { showOSModal } from './os/osModal'
import { collectTextFromMessages, safeSendMessage } from './helpers'
import { buildAIPrompt } from './buildAIPrompt'
import { injectLoginBanner } from './auth/loginModal'
import { injectQuickReply, injectQuickReplyLoading, removeQuickReply } from './quickReply'
import { showToast } from './helpers'
import { showSgpSelectionModal } from '../sgp/sgpSelectionModal'
import '../sgp/sgpSelectionModal.css'
import type { GetOsTemplatesRequest, OpenInSgpRequest, GetQuickRepliesRequest, ClearSgpCacheRequest, ClearCpfCacheRequest, ClearCpfCacheByUidRequest } from '../../background/types'
import { injectFloatingChat } from '../chatInterno'
// Sessão atual em memória
let currentSession: UserSession | null = null

// =================================================================
// INJEÇÃO DOS BOTÕES
// =================================================================

function injectButtons(): void {
  if (document.getElementById('actionsContainerV2')) return

  const sidebar = document.querySelector(SELECTORS.sidebar)
  if (!sidebar) return

  const container = document.createElement('div')
  container.id = 'actionsContainerV2'
  const buttons = [
    { id: 'ati-copy-contact', text: '👤 Contato' },
    { id: 'ati-copy-prompt', text: '🤖 Chat' },
    { id: 'ati-copy-cpf', text: '📄 CPF' },
    { id: 'ati-open-os', text: '📝 O.S' },
    { id: 'ati-refresh', text: '🔄 Atualizar' },
    { id: 'ati-open-sgp', text: '↗️ SGP' },
  ]

  buttons.forEach(({ id, text }) => {
    const btn = document.createElement('button')
    btn.className = 'action-btn'
    btn.id = id
    btn.textContent = text
    container.appendChild(btn)
  })

  sidebar.appendChild(container)
  log('Botões injetados na sidebar.')
}

// =================================================================
// FEEDBACK VISUAL DOS BOTÕES
// =================================================================

async function execAction(btn: HTMLButtonElement, action: () => Promise<void>): Promise<void> {
  const originalText = btn.textContent || ''
  btn.textContent = ''
  const spinner = document.createElement('span')
  spinner.className = 'spinner'
  btn.appendChild(spinner)
  btn.disabled = true

  try {
    await action()
    btn.textContent = '✅'
    btn.classList.add('action-btn--success')
  } catch (error: any) {
    logError('Erro na ação do botão:', error)
    showToast(`Extensão ATI: Erro na ação do botão: ${error.message || error}`, 'error')
    btn.textContent = '❌'
    btn.classList.add('action-btn--error')
  } finally {
    await new Promise((r) => setTimeout(r, 1200))
    btn.textContent = originalText
    btn.classList.remove('action-btn--success', 'action-btn--error')
    btn.disabled = false
  }
}

// =================================================================
// AÇÕES DOS BOTÕES
// =================================================================

const actions: Record<string, () => Promise<void>> = {
  'ati-copy-contact': async () => {
    const data = await getClientData()
    const text = `${formatPhoneNumber(data.phoneNumber)} ${data.firstName} |`.trim()
    await navigator.clipboard.writeText(text)
    log(`Contato copiado: ${text}`)
  },

  'ati-copy-prompt': async () => {
    const data = await getClientData()
    const prompt = buildAIPrompt(data.firstName ?? data.fullName ?? 'Cliente')
    if (!prompt) throw new Error('Não foi possível extrair mensagens do chat.')
    await navigator.clipboard.writeText(prompt)
    log('Prompt de IA copiado.')
  },

  'ati-copy-cpf': async () => {
    const data = await getClientData()
    if (!data.cpfCnpj) throw new Error('CPF/CNPJ não encontrado nas mensagens.')
    await navigator.clipboard.writeText(data.cpfCnpj)
    log(`CPF copiado: ${data.cpfCnpj}`)
  },

  'ati-open-os': async () => {
    const data = await getClientData()
    log(`OS check — isIdentified: ${data.isIdentified}, phone: ${data.phoneNumber}, cpf: ${data.cpfCnpj}`)

    if (!data.isIdentified && !data.phoneNumber && !data.cpfCnpj) {
      throw new Error('Sem dados do cliente para abrir O.S.')
    }
    const session = await ensureFreshToken()
    if (!session) throw new Error('Sessão expirada. Faça login novamente.')

    // Busca templates do Firebase e atualiza o perfil em background
    const [templatesRes] = await Promise.all([
      safeSendMessage<GetOsTemplatesRequest>({
        action: 'getOsTemplates',
        username: session.username,
        idToken: session.idToken,
      }),
      safeSendMessage({ action: 'refreshUserSession' }).catch(() => null)
    ])

    const templates = templatesRes?.templates ?? []

    await showOSModal(templates, () => collectTextFromMessages(), data)
  },

  'ati-refresh': async () => {
    setCachedContract(null)
    try {
      // 1. Limpa todos os caches de sessão (templates, quick replies, tipos de ocorrência)
      await safeSendMessage({ action: 'clearSessionCaches' })
      log('Todos os caches de sessão limpos.')

      // 2. Sincroniza a sessão de usuário do Firebase
      const syncRes = (await safeSendMessage({ action: 'refreshUserSession' })) as { success: boolean; session: UserSession } | null
      if (syncRes?.success && syncRes.session) {
        currentSession = syncRes.session
        log('Sessão de usuário sincronizada com o Firebase.')

        // 3. Força a recarga das respostas rápidas diretamente na tela do ChatMix
        await loadQuickReplies(syncRes.session)
      }
    } catch (e) {
      logError('Erro ao sincronizar sistema:', e)
    }

    const data = await getClientData()
    log('Dados atualizados:', data)
    showToast('✨ Todo o sistema atualizado com sucesso!', 'success')
  },

  'ati-open-sgp': async () => {
    const data = await getClientData()
    if (!data.isIdentified && !data.cpfCnpj && !data.phoneNumber) {
      safeSendMessage<OpenInSgpRequest>({
        action: 'openInSgp',
        clientData: data,
        cachedContract: null,
        uid: currentChatId ?? undefined,
      })
      return
    }
    await smartOpenSGP(data, currentChatId ?? undefined)
  },
}

// =================================================================
// LISTENERS
// =================================================================

function injectListeners(): void {
  Object.entries(actions).forEach(([id, action]) => {
    const btn = document.getElementById(id) as HTMLButtonElement | null
    if (!btn) {
      logError(`Botão não encontrado para listener: ${id}`)
      return
    }

    if (btn.dataset.listenerAdded === 'true') {
      return // Evita duplicar o listener se já foi adicionado
    }

    btn.dataset.listenerAdded = 'true'

    // Lógica para detecção de clique longo (SGP button)
    let pressTimer: ReturnType<typeof setTimeout> | null = null
    let isLongPress = false

    if (id === 'ati-open-sgp') {
      const handleLongPress = async () => {
        isLongPress = true
        log('Clique longo detectado no botão SGP, forçando exibição do leque de cadastros...')
        const data = await getClientData()
        if (!data.isIdentified && !data.cpfCnpj && !data.phoneNumber) {
          showToast('Extensão ATI: Sem dados do cliente para realizar busca.', 'error')
          return
        }
        await execAction(btn, async () => {
          await smartOpenSGP(data, currentChatId ?? undefined, true)
        })
      }

      btn.addEventListener('mousedown', () => {
        isLongPress = false
        pressTimer = setTimeout(handleLongPress, 500)
      })

      btn.addEventListener('mouseup', () => {
        if (pressTimer) {
          clearTimeout(pressTimer)
          pressTimer = null
        }
      })

      btn.addEventListener('mouseleave', () => {
        if (pressTimer) {
          clearTimeout(pressTimer)
          pressTimer = null
        }
      })
    }

    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      if (isLongPress) {
        isLongPress = false
        return
      }
      await execAction(e.currentTarget as HTMLButtonElement, action)
    })
  })
  log('Listeners injetados.')
}

// =================================================================
// CONTROLE DE TROCA DE ATENDIMENTO
// =================================================================

function checkSessionChange(): void {
  const url = window.location.href
  const routeMatch = url.match(/\/v2\/chat\/[^/]+\/(\d+)/)
  const newUid = routeMatch ? routeMatch[1] : null

  if (newUid && newUid !== currentChatId) {
    log(`Atendimento trocado: ${currentChatId} → ${newUid}`)

    // Nível 2 — Limpa entradas do cache CPF associadas ao UID anterior
    if (currentChatId) {
      safeSendMessage<ClearSgpCacheRequest>({
        action: 'clearSgpCache',
        cacheKey: currentChatId,
      })
    }
    setCurrentChatId(newUid)
    setCachedContract(null)
  }
}

// =================================================================
// CONTROLE DE TEMA (MODERNO VS CLÁSSICO)
// =================================================================

function initTheme(): void {
  chrome.storage.local.get(['ati_theme_version'], (result) => {
    if (result.ati_theme_version === 'legacy') {
      document.documentElement.classList.add('ati-theme-legacy')
    } else {
      document.documentElement.classList.remove('ati-theme-legacy')
    }
  })

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.ati_theme_version) {
      if (changes.ati_theme_version.newValue === 'legacy') {
        document.documentElement.classList.add('ati-theme-legacy')
      } else {
        document.documentElement.classList.remove('ati-theme-legacy')
      }
    }
  })
}

function initFontSize(): void {
  function applyFontSize(factor: number) {
    let styleEl = document.getElementById('ati-font-zoom')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'ati-font-zoom'
      document.head.appendChild(styleEl)
    }

    // Calcula tamanhos com base no padrão do Tailwind e elementos personalizados
    const textSmFontSize = 0.875 * factor
    const textSmLineHeight = 1.25 * factor
    const textBaseFontSize = 1 * factor
    const textBaseLineHeight = 1.5 * factor

    styleEl.textContent = `
      .text-sm {
        font-size: ${textSmFontSize}rem !important;
        line-height: ${textSmLineHeight}rem !important;
      }
      .text-base {
        font-size: ${textBaseFontSize}rem !important;
        line-height: ${textBaseLineHeight}rem !important;
      }
      .action-btn {
        font-size: ${15 * factor}px !important;
      }
      .ati-qr-tab {
        font-size: ${16 * factor}px !important;
      }
      .ati-qr-btn {
        font-size: ${14 * factor}px !important;
      }
      /* Modal elements */
      .ati-os-modal {
        font-size: ${14 * factor}px !important;
      }
      .ati-os-modal-header {
        font-size: ${15 * factor}px !important;
      }
      .modal-category-title {
        font-size: ${11 * factor}px !important;
      }
      .template-btn {
        font-size: ${12 * factor}px !important;
      }
      label.template-btn.contract-item {
        font-size: ${14 * factor}px !important;
      }
      .modal-textarea {
        font-size: ${13 * factor}px !important;
      }
      .main-btn {
        font-size: ${13 * factor}px !important;
      }
    `
  }

  chrome.storage.local.get(['ati_font_size'], (result) => {
    applyFontSize(result.ati_font_size ?? 1)
  })

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.ati_font_size) {
      applyFontSize(changes.ati_font_size.newValue ?? 1)
    }
  })
}

initTheme()
initFontSize()

// =================================================================
// INIT COM VERIFICAÇÃO DE LOGIN
// =================================================================

async function init(): Promise<void> {
  const sidebar = document.querySelector(SELECTORS.sidebar)
  if (!sidebar) return

  checkSessionChange()

  const session = await getSession()

  if (!session) {
    log('Usuário não logado — exibindo banner de login.')
    injectLoginBanner((newSession) => {
      currentSession = newSession
      log(`Login realizado: ${newSession.username} (${newSession.role})`)
      injectButtons()
      injectListeners()
      injectFloatingChat(newSession)
      updateChatTimeWarnings()
    })
    return
  }

  currentSession = session
  log(`Sessão ativa: ${session.username} (${session.role})`)

  // Verifica se há novas atualizações da extensão de forma assíncrona
  safeSendMessage({ action: 'checkVersion' }).catch(() => null)

  injectButtons()
  injectListeners()
  injectFloatingChat(session)
  loadQuickReplies(session)
  updateChatTimeWarnings()
}

// =================================================================
// QUICK REPLY — Carrega e injeta
// =================================================================

// Flag to prevent multiple concurrent fetch requests triggered by MutationObserver
let isLoadingQuickReplies = false

async function loadQuickReplies(session: UserSession, attempt = 0): Promise<void> {
  const textarea = document.querySelector(SELECTORS.textarea)

  if (!textarea) {
    if (attempt < 10) {
      // Tenta novamente em 500ms por até 5 segundos
      setTimeout(() => loadQuickReplies(session, attempt + 1), 500)
    } else {
      log('Textarea não encontrado após 10 tentativas.')
    }
    return
  }

  if (isLoadingQuickReplies) return
  isLoadingQuickReplies = true

  injectQuickReplyLoading()
  try {
    // Garante token válido antes de buscar (renova se necessário)
    const freshSession = await ensureFreshToken()
    if (!freshSession) {
      log('Sessão expirada ao carregar quick replies. Exibindo banner de login.')
      removeQuickReply()
      currentSession = null
      injectLoginBanner((newSession) => {
        currentSession = newSession
        injectButtons()
        injectListeners()
        loadQuickReplies(newSession)
      })
      return
    }
    currentSession = freshSession

    const response = await safeSendMessage<GetQuickRepliesRequest>({
      action: 'getQuickReplies',
      username: freshSession.username,
      idToken: freshSession.idToken,
    })
    const replies = [...(response?.replies ?? [])]
    replies.push({
      title: '📞 Validar Contatos (SGP)',
      text: 'VALIDAR_CONTATOS_DYNAMIC',
      category: 'quick_reply',
      subCategory: 'Cadastro',
    })
    injectQuickReply(replies, response?.categoriesOrder)
  } catch (error: any) {
    logError('Erro ao carregar quick replies:', error)
    showToast(`Extensão ATI: Erro ao carregar quick replies: ${error.message || error}`, 'error')
    removeQuickReply()
  } finally {
    isLoadingQuickReplies = false
  }
}

// =================================================================
// ENCERRAR ATENDIMENTO — Limpa cache SGP ao encerrar
// =================================================================

function watchEncerrarBtn(): void {
  const btn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === 'Encerrar atendimento')

  if (btn && !btn.dataset.atiCacheWatcher) {
    btn.dataset.atiCacheWatcher = 'true'
    btn.addEventListener('click', () => {
      const chatId = currentChatId
      if (chatId) {
        safeSendMessage<ClearSgpCacheRequest>({
          action: 'clearSgpCache',
          cacheKey: chatId,
        })
        log(`Cache SGP limpo ao encerrar atendimento ${chatId}`)
      }

      const cpf = lastExtractedData.data?.cpfCnpj
      if (cpf) {
        safeSendMessage<ClearCpfCacheRequest>({
          action: 'clearCpfCache',
          cpf,
        })
        log(`Cache CPF limpo ao encerrar atendimento — CPF: ${cpf}`)
      }
    })
  }
}

// =================================================================
// OCULTAR NOTIFICAÇÕES "EM ESPERA"
// =================================================================

let hideWaitingNotifications = false
chrome.storage.local.get('hideWaitingNotifications', (data) => {
  hideWaitingNotifications = !!data.hideWaitingNotifications
  if (hideWaitingNotifications) {
    checkAndHideWaitingNotifications()
  }
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.hideWaitingNotifications) {
    hideWaitingNotifications = !!changes.hideWaitingNotifications.newValue
    if (hideWaitingNotifications) {
      checkAndHideWaitingNotifications()
    }
  }
})

function checkAndHideWaitingNotifications(): void {
  if (!hideWaitingNotifications) return

  const notifications = document.querySelectorAll('.vue-notification-wrapper')
  notifications.forEach((notif) => {
    const title = notif.querySelector('.notification_title')
    if (title && title.textContent?.includes('Atendimentos em espera')) {
      const htmlElement = notif as HTMLElement
      if (htmlElement.style.display !== 'none') {
        htmlElement.style.display = 'none'
        log('Notificação de atendimentos em espera ocultada com sucesso.')
      }
    }
  })
}

// =================================================================
// VERIFICAÇÃO DE CHATS COM MAIS DE 1 HORA
// =================================================================

function isChatOlderThanOneHour(timeText: string): boolean {
  timeText = timeText.trim().toLowerCase()
  if (!timeText) return false

  // Formato: "17h39" ou "17:39" ou "09h05"
  const timeRegex = /^(\d{1,2})[h:](\d{2})$/
  const match = timeText.match(timeRegex)
  if (match) {
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const chatMinutes = hours * 60 + minutes
      
      let diff = currentMinutes - chatMinutes
      if (diff < 0) {
        // Virada de dia (meia-noite). Assumimos que passou de 1 hora se a diferença real é maior
        // ou se simplesmente cruzou a noite
        const diffCrossed = (currentMinutes + 1440) - chatMinutes
        return diffCrossed >= 60
      }
      return diff >= 60
    }
  }

  // Se for tempo relativo em minutos/segundos: "5 min", "45m", "30s"
  if (/^\d+\s*(min|m|s|seg)$/.test(timeText)) {
    return false
  }

  // Se tiver barra de data ("05/06") ou palavras que indicam dias passados
  if (timeText.includes('/') || timeText.includes('ontem') || timeText.includes('atrás') || timeText.includes('dia')) {
    return true
  }

  // Se for do tipo "1h", "2h", "1 hora", "3 horas"
  const hourMatch = timeText.match(/^(\d+)\s*(h|hora|horas)/)
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10)
    return hours >= 1
  }

  return false
}

function updateChatTimeWarnings(): void {
  const items = document.querySelectorAll('.attendance_item')
  items.forEach((item) => {
    const timeEl = item.querySelector('time') as HTMLElement | null
    if (!timeEl) return

    // Obtém texto bruto atual
    const currentRawText = timeEl.textContent || ''
    
    // Verifica se o aviso já está presente
    const warningSpan = timeEl.querySelector('.ati-time-warning')
    
    // Se o span de aviso não está no DOM, o texto atual é a hora limpa que veio do app.
    // Atualizamos nosso dataset com este valor limpo.
    if (!warningSpan) {
      timeEl.classList.remove('ati-time-overdue')
      const cleanTime = currentRawText.replace(/⚠️/g, '').trim()
      if (cleanTime) {
        timeEl.dataset.atiOriginalTime = cleanTime
      }
    }

    const timeText = timeEl.dataset.atiOriginalTime || ''
    if (!timeText) return

    const isOld = isChatOlderThanOneHour(timeText)
    const hasWarningClass = timeEl.classList.contains('ati-time-overdue')

    if (isOld) {
      if (!hasWarningClass || !warningSpan) {
        timeEl.classList.add('ati-time-overdue')
        if (!warningSpan) {
          // Esvazia e reconstrói de forma limpa para evitar duplicações
          timeEl.textContent = ''
          
          const newWarningSpan = document.createElement('span')
          newWarningSpan.className = 'ati-time-warning'
          newWarningSpan.innerHTML = '⚠️'
          timeEl.appendChild(newWarningSpan)
          
          const textNode = document.createTextNode(timeText)
          timeEl.appendChild(textNode)
        }
      }
    } else {
      if (hasWarningClass || warningSpan) {
        timeEl.classList.remove('ati-time-overdue')
        if (warningSpan) {
          warningSpan.remove()
        }
        timeEl.textContent = timeText
      }
    }
  })
}


// =================================================================
// OBSERVER
// =================================================================

let observerTimer: ReturnType<typeof setTimeout> | null = null
const observer = new MutationObserver((mutations) => {
  // Ignora se todas as mutações forem originadas por elementos criados pela própria extensão
  const onlySelfMutations = mutations.every((m) => {
    const target = m.target.nodeType === Node.ELEMENT_NODE 
      ? (m.target as HTMLElement) 
      : m.target.parentElement
    if (!target) return true
    return (
      target.closest?.('#ati-floating-chat-root') ||
      target.closest?.('#actionsContainerV2') ||
      target.closest?.('#ati-login-banner') ||
      target.closest?.('#ati-quick-reply-container') ||
      target.closest?.('.ati-time-warning') ||
      target.closest?.('.ati-time-overdue')
    )
  })

  if (onlySelfMutations) return

  if (observerTimer) clearTimeout(observerTimer)
  observerTimer = setTimeout(() => {
    checkAndHideWaitingNotifications()

    const sidebar = document.querySelector(SELECTORS.sidebar)
    const hasButtons = document.getElementById('actionsContainerV2')
    const hasBanner = document.getElementById('ati-login-banner')
    const hasQuickReply = document.getElementById('ati-quick-reply-container')
    const hasTextarea = document.querySelector(SELECTORS.textarea)

    checkSessionChange()
    watchEncerrarBtn()
    updateChatTimeWarnings()

    if (sidebar && !hasButtons && !hasBanner) {
      log('Sidebar sem conteúdo, reinjetando...')
      init()
      return
    }

    // Reinjetar quick reply se textarea existe mas container sumiu
    if (hasTextarea && !hasQuickReply && currentSession) {
      log('Quick reply sumiu, reinjetando...')
      loadQuickReplies(currentSession)
    }
  }, 150)
})

const targetContainer = document.getElementById('app') || document.body
observer.observe(targetContainer, { childList: true, subtree: true })
init()

// Executa a verificação de tempos dos chats periodicamente a cada 30 segundos
setInterval(updateChatTimeWarnings, 30000)

