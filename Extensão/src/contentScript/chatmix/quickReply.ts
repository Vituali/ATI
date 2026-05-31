// =================================================================
// QUICK REPLY — Respostas rápidas injetadas acima do textarea
// =================================================================

import { processDynamicPlaceholders } from './os/osModal'
import { setNativeValue } from './helpers'
import { log, logError, SELECTORS } from './state'

interface QuickReply {
  title: string
  text: string
  category: string
  subCategory?: string
}

// Cache em memória — busca Firebase uma vez por sessão
// Limpo apenas no logout (clearQuickReplyCache)
let cachedReplies: QuickReply[] | null = null

export function getCachedReplies(): QuickReply[] | null {
  return cachedReplies
}

export function setCachedReplies(replies: QuickReply[]): void {
  cachedReplies = replies
  log(`Cache de quick replies salvo ÔÇö ${replies.length} respostas.`)
}

export function clearQuickReplyCache(): void {
  cachedReplies = null
  log('Cache de quick replies limpo.')
}

// Aba ativa atual
let activeTab = ''

// =================================================================
// INJETA O CONTAINER DE QUICK REPLY
// =================================================================

export function injectQuickReply(replies: QuickReply[]): void {
  document.getElementById('ati-quick-reply-container')?.remove()

  const textarea = document.querySelector<HTMLTextAreaElement>(SELECTORS.textarea)
  if (!textarea) return

  const quickReplies = replies.filter((r) => r.category === 'quick_reply')

  const container = document.createElement('div')
  container.id = 'ati-quick-reply-container'

  const insertContainer = () => {
    const inputArea = textarea.closest('.flex-none.p-4') ?? textarea.parentElement
    if (inputArea?.parentElement) {
      inputArea.parentElement.insertBefore(container, inputArea)
    } else {
      textarea.parentElement?.insertBefore(container, textarea)
    }
  }

  if (quickReplies.length === 0) {
    insertContainer()
    return
  }

  const bySubCategory = quickReplies.reduce<Record<string, QuickReply[]>>((acc, r) => {
    const cat = r.subCategory ?? 'Geral'
    ;(acc[cat] = acc[cat] ?? []).push(r)
    return acc
  }, {})

  const categories = Object.keys(bySubCategory)

  // --- Renderiza tela de categorias ---
  const showCategories = () => {
    container.innerHTML = ''
    const grid = document.createElement('div')
    grid.className = 'ati-qr-buttons'

    categories.forEach((cat) => {
      const btn = document.createElement('button')
      btn.className = 'ati-qr-tab'
      btn.textContent = cat
      btn.addEventListener('click', () => showReplies(cat))
      grid.appendChild(btn)
    })

    container.appendChild(grid)
  }

  // --- Renderiza tela de respostas da categoria ---
  const showReplies = (cat: string) => {
    container.innerHTML = ''

    // Cabeçalho com botão voltar + nome da categoria
    const header = document.createElement('div')
    header.className = 'ati-qr-tabs'

    const backBtn = document.createElement('button')
    backBtn.className = 'ati-qr-tab ati-qr-tab--active'
    backBtn.innerHTML = '← ' + cat
    backBtn.addEventListener('click', showCategories)
    header.appendChild(backBtn)

    const buttonsDiv = document.createElement('div')
    buttonsDiv.className = 'ati-qr-buttons'
    renderButtons(buttonsDiv, bySubCategory[cat], textarea)

    container.appendChild(header)
    container.appendChild(buttonsDiv)
  }

  showCategories()
  insertContainer()

  log(`Quick reply injetado — ${quickReplies.length} respostas em ${categories.length} categoria(s).`)
}

// =================================================================
// RENDERIZA BOTÕES DA ABA ATIVA
// =================================================================

function renderButtons(container: HTMLDivElement, replies: QuickReply[], textarea: HTMLTextAreaElement): void {
  container.innerHTML = ''

  replies.forEach((reply) => {
    const btn = document.createElement('button')
    btn.className = 'ati-qr-btn'
    btn.textContent = reply.title
    btn.title = reply.text // tooltip com o texto completo

    btn.addEventListener('click', () => {
      const processed = processDynamicPlaceholders(reply.text)
      setNativeValue(textarea, processed)
      textarea.focus()
      log(`Quick reply aplicado: ${reply.title}`)
    })

    container.appendChild(btn)
  })
}

// =================================================================
// MOSTRA ESTADO DE LOADING
// =================================================================

export function injectQuickReplyLoading(): void {
  document.getElementById('ati-quick-reply-container')?.remove()

  const textarea = document.querySelector<HTMLTextAreaElement>(SELECTORS.textarea)
  if (!textarea) return

  const container = document.createElement('div')
  container.id = 'ati-quick-reply-container'
  container.innerHTML = `<div class="ati-qr-loading">Carregando respostas rápidas...</div>`

  const inputArea = textarea.closest('.flex-none.p-4') ?? textarea.parentElement
  if (inputArea?.parentElement) {
    inputArea.parentElement.insertBefore(container, inputArea)
  } else {
    textarea.parentElement?.insertBefore(container, textarea)
  }
}

// =================================================================
// REMOVE O CONTAINER
// =================================================================

export function removeQuickReply(): void {
  document.getElementById('ati-quick-reply-container')?.remove()
}
