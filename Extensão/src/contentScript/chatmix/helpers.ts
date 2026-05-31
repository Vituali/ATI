// =================================================================
// FUNÇÕES UTILITÁRIAS
// =================================================================

import { SELECTORS, log } from './state'

// --- Validação de CPF ---
export function isValidCPF(cpf: string): boolean {
  if (typeof cpf !== 'string') return false
  cpf = cpf.replace(/[^\d]/g, '')
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i)
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cpf.substring(9, 10))) return false

  sum = 0
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i)
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === parseInt(cpf.substring(10, 11))
}

// --- Validação de CNPJ ---
export function isValidCNPJ(cnpj: string): boolean {
  if (typeof cnpj !== 'string') return false
  cnpj = cnpj.replace(/[^\d]/g, '')
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false

  let length = cnpj.length - 2
  let numbers = cnpj.substring(0, length)
  const digits = cnpj.substring(length)
  let sum = 0
  let pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result != Number(digits.charAt(0))) return false

  length += 1
  numbers = cnpj.substring(0, length)
  sum = 0
  pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return result == Number(digits.charAt(1))
}

// --- Busca CPF/CNPJ em lista de textos ---
export function findCPF(allTexts: string[]): string | null {
  const cpfCnpjRegex = /\b(\d{11}|\d{14})\b/g
  const blacklist = ['código de barras', 'boleto', 'fatura', 'pix', 'linha digitável']
  const validMatches: string[] = []

  for (const text of allTexts) {
    if (blacklist.some((keyword) => text.toLowerCase().includes(keyword))) continue

    const cleanText = text.replace(/[.\-\/]/g, '')
    const potentialMatches = cleanText.match(cpfCnpjRegex)

    if (potentialMatches) {
      for (const match of potentialMatches) {
        if (match.length === 11 && isValidCPF(match)) validMatches.push(match)
        else if (match.length === 14 && isValidCNPJ(match)) validMatches.push(match)
      }
    }
  }

  return validMatches.length > 0 ? validMatches[validMatches.length - 1] : null
}

// --- Coleta textos das mensagens do chat ---
// Otimizado: chats curtos pega tudo, longos pega início (bot) + fim (atual)
export function collectTextFromMessages(): string[] {
  const chatBody = document.querySelector(SELECTORS.chatBody)
  if (!chatBody) return []

  const allMessages = Array.from(chatBody.querySelectorAll(SELECTORS.messageParagraph))

  if (allMessages.length <= 100) {
    return allMessages.map((p) => p.textContent?.trim() ?? '')
  }

  const start = allMessages.slice(0, 50)
  const end = allMessages.slice(-50)
  return [...start, ...end].map((p) => p.textContent?.trim() ?? '')
}

// --- Formata número de telefone ---
export function formatPhoneNumber(phone: string): string {
  if (!phone) return ''
  let str = phone.replace(/\D/g, '')

  if (str.startsWith('55') && str.length >= 12) str = str.substring(2)

  if (str.length >= 10) {
    const ddd = str.substring(0, 2)
    const rest = str.substring(2)

    if (rest.length === 9) return `${ddd} ${rest.substring(0, 5)}-${rest.substring(5)}`
    if (rest.length === 8) return `${ddd} ${rest.substring(0, 4)}-${rest.substring(4)}`
  }

  return phone
}

// --- Seta valor em input controlado pelo Vue/React ---
export function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = element instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    log(`Valor setado no input: ${value}`)
  }
}

let contextInvalidatedAlertShown = false

function handleInvalidatedContext() {
  if (contextInvalidatedAlertShown) return
  contextInvalidatedAlertShown = true

  const notification = document.createElement('div')
  notification.id = 'ati-update-notification'
  notification.className = 'ati-update-notification'

  notification.innerHTML = `
    <span class="ati-notification-icon">⚠️</span>
    <div class="ati-notification-content">
      <div class="ati-notification-title">Extensão Atualizada!</div>
      <div class="ati-notification-subtitle">Clique para recarregar a aba e continuar.</div>
    </div>
  `

  notification.onclick = () => window.location.reload()
  document.body.appendChild(notification)

  // Auto-remove após 5 segundos
  setTimeout(() => {
    notification.classList.add('ati-notification-hidden')
    setTimeout(() => {
      notification.remove()
      contextInvalidatedAlertShown = false
    }, 400)
  }, 5000)
}

/**
 * Exibe uma notificação do tipo Toast na interface.
 */
export function showToast(message: string, type: 'error' | 'success' | 'info' = 'error', duration = 5000) {
  let container = document.getElementById('ati-toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'ati-toast-container'
    document.body.appendChild(container)
  }

  const toast = document.createElement('div')
  toast.className = `ati-toast ati-toast--${type}`

  const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'

  toast.innerHTML = `
    <span class="ati-toast-icon">${icon}</span>
    <div class="ati-toast-content">${message}</div>
  `

  container.appendChild(toast)

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('ati-toast-hidden')
    setTimeout(() => {
      toast.remove()
      if (container && container.childNodes.length === 0) {
        container.remove()
      }
    }, 300)
  }, duration)
}

// --- Envio seguro de mensagens (trata contexto invalidado) ---
export async function safeSendMessage<M = any, R = any>(message: M): Promise<R> {
  // Detector precoce de contexto morto
  if (!chrome.runtime?.id) {
    handleInvalidatedContext()
    const errorMsg = 'Extensão ATI: Erro ao enviar mensagem: Contexto invalidado. Recarregue a página.'
    showToast(errorMsg, 'error')
    throw new Error('Extension context invalidated')
  }

  try {
    return await chrome.runtime.sendMessage(message)
  } catch (error: any) {
    const msg = error?.message || ''
    if (msg.includes('Extension context invalidated') || msg.includes('context_invalidated')) {
      handleInvalidatedContext()
      showToast(`Extensão ATI: Erro de conexão: ${msg}`, 'error')
    }
    throw error
  }
}
