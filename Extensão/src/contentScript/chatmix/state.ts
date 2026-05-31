// =================================================================
// ESTADO GLOBAL E SELETORES DO CHATMIX
// =================================================================

import { ClientData } from '../sgp/types'

// --- Debug Mode ---
// true  = logs completos no console
// false = apenas logs essenciais
export const DEBUG_MODE = true

export function log(...args: unknown[]): void {
  if (DEBUG_MODE) {
    console.log('Extensão ATI:', ...args)
  }
}

export function logWarn(...args: unknown[]): void {
  console.warn('Extensão ATI:', ...args)
}

export function logError(...args: unknown[]): void {
  console.error('Extensão ATI:', ...args)
}

// --- Estado da sessão atual ---
export let currentChatId: string | null = null
export let identificationLock = false
export let lastExtractedData: { chatId: string | null; data: ClientData | null } = {
  chatId: null,
  data: null,
}

export function setCurrentChatId(id: string | null) {
  currentChatId = id
}

export function setIdentificationLock(value: boolean) {
  identificationLock = value
}

export function setLastExtractedData(chatId: string | null, data: ClientData | null) {
  lastExtractedData = { chatId, data }
}

// --- Seletores do DOM do ChatMix ---
export const SELECTORS = {
  // Sidebar
  sidebar: '.chat_sidebar',

  // Textarea de envio de mensagem
  textarea: 'textarea.chat_textarea',

  // Corpo das mensagens
  chatBody: 'div#attendanceMessages',
  messageParagraph: 'p.mensagem',

  // Header do painel direito (nome e telefone do cliente)
  rightPanelHeader: 'div.h-full.overflow-y-scroll header',
  clientName: 'div.h-full.overflow-y-scroll header h2',
  clientPhone: 'div.h-full.overflow-y-scroll header span.text-sm.truncate',

  // Identificação do cliente
  clientPanelHeader: 'div[data-v-6cea75da] h1.text-base',
  unidentifiedInput: 'input#informe-o-cpf-cnpj',
  clientTabLink: 'a[href*="#cliente"]',

  // Toolbar do chat (botões superiores)
  copyChatBtn: '.border-l-2 button:first-child',
  toolbarContainer: '.border-l-2.h-full.align-middle.items-center',
} as const
