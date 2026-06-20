// =================================================================
// QUICK REPLY — Respostas rápidas injetadas acima do textarea
// =================================================================

import { processDynamicPlaceholders } from './os/osModal'
import { setNativeValue, safeSendMessage, showToast } from './helpers'
import { log, logError, SELECTORS, currentChatId } from './state'
import { getClientData } from './getClientData'

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

// =================================================================
// INJETA O CONTAINER DE QUICK REPLY
// =================================================================

export function injectQuickReply(replies: QuickReply[], categoriesOrder?: string[]): void {
  document.getElementById('ati-quick-reply-container')?.remove()

  const textarea = document.querySelector<HTMLTextAreaElement>(SELECTORS.textarea)
  if (!textarea) return

  // Filtra apenas respostas rápidas e ignora a subcategoria "cadastro"
  const quickReplies = replies.filter((r) => {
    if (r.category !== 'quick_reply') return false
    const sub = (r.subCategory ?? '').toLowerCase().trim()
    return sub !== 'cadastro'
  })

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
    let cat = r.subCategory?.trim() || 'Geral'
    // Capitaliza primeira letra para manter a uniformidade visual (ex: Geral, Suporte)
    cat = cat.charAt(0).toUpperCase() + cat.slice(1)
    ;(acc[cat] = acc[cat] ?? []).push(r)
    return acc
  }, {})

  // Ordena as subcategorias de acordo com a ordem configurada no site
  const baseOrder = categoriesOrder && categoriesOrder.length > 0 ? categoriesOrder.map((c) => c.toLowerCase().trim()) : ['geral', 'suporte', 'comercial', 'financeiro', 'desastres', 'outros', 'planos']

  const categories = Object.keys(bySubCategory).sort((a, b) => {
    const idxA = baseOrder.indexOf(a.toLowerCase().trim())
    const idxB = baseOrder.indexOf(b.toLowerCase().trim())

    const posA = idxA !== -1 ? idxA : 999
    const posB = idxB !== -1 ? idxB : 999

    if (posA !== posB) {
      return posA - posB
    }
    return a.localeCompare(b)
  })

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
    btn.title = reply.text === 'VALIDAR_CONTATOS_DYNAMIC' ? 'Puxa e valida os contatos de telefone registrados no SGP' : reply.text

    btn.addEventListener('click', async () => {
      const hasPlaceholder = reply.text.includes('[contatossgp]') || reply.text.includes('[numerossgp]')

      if (reply.text === 'VALIDAR_CONTATOS_DYNAMIC' || hasPlaceholder) {
        await handleValidarContatos(btn, textarea, reply.text)
        return
      }
      const processed = processDynamicPlaceholders(reply.text)
      setNativeValue(textarea, processed)
      textarea.focus()
      log(`Quick reply aplicado: ${reply.title}`)
    })

    container.appendChild(btn)
  })
}

async function handleValidarContatos(btn: HTMLButtonElement, textarea: HTMLTextAreaElement, templateText?: string): Promise<void> {
  const originalText = btn.textContent || ''
  btn.disabled = true
  btn.textContent = '⏳ Buscando...'

  try {
    const clientData = await getClientData()
    const sgpLink = document.querySelector<HTMLAnchorElement>('a[href*="/admin/cliente/"]')
    const clientUrl = sgpLink?.href

    if (!clientUrl && !clientData.clientSgpId && !clientData.phoneNumber && !clientData.fullName) {
      throw new Error('Cliente não identificado no SGP e sem dados para busca automática.')
    }

    const response = (await safeSendMessage({
      action: 'getSgpClientContacts',
      clientUrl,
      baseUrl: clientData.clientSgpOrigin ?? undefined,
      clientId: clientData.clientSgpId ?? undefined,
      clientData,
      uid: currentChatId ?? undefined,
    })) as { success: boolean; html?: string; error?: string } | null

    if (!response || !response.success || !response.html) {
      throw new Error(response?.error || 'Não foi possível buscar as informações de contatos no SGP.')
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(response.html, 'text/html')

    const contacts: { type: string; contact: string; observation: string }[] = []

    // 1. Encontra o grupo ou elemento de contatos
    const inlineGroup =
      doc.querySelector('.tablelistcontatos') ||
      doc.querySelector('[id*="contato"]') ||
      Array.from(doc.querySelectorAll('.inline-group, fieldset, div, table')).find((el) => {
        const text = el.textContent || ''
        return text.includes('Contatos') || text.includes('Contato')
      })

    if (inlineGroup) {
      const rows = inlineGroup.querySelectorAll('tr')
      rows.forEach((row) => {
        if (row.querySelector('th')) return // cabeçalhos
        if (row.classList.contains('empty-form') || row.id?.includes('__prefix__')) return

        const cells = Array.from(row.querySelectorAll('td'))
        if (cells.length >= 2) {
          const tipoSelect = cells[0].querySelector<HTMLSelectElement>('select')
          const tipoVal = tipoSelect ? tipoSelect.options[tipoSelect.selectedIndex]?.text : cells[0].textContent

          const contatoInput = cells[1].querySelector<HTMLInputElement>('input')
          const contatoLink = cells[1].querySelector<HTMLAnchorElement>('a')
          const contatoVal = contatoInput ? contatoInput.value : contatoLink ? contatoLink.textContent : cells[1].textContent

          let obsVal = ''
          if (cells.length >= 3) {
            const obsInput = cells[2].querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
            const obsParagraph = cells[2].querySelector('p')
            obsVal = obsInput ? obsInput.value : ((obsParagraph ? obsParagraph.textContent : cells[2].textContent) ?? '')
          }

          const cleanTipo = (tipoVal ?? '').trim()
          const cleanContato = (contatoVal ?? '').trim()
          const cleanObs = (obsVal ?? '').trim()

          if (cleanContato) {
            contacts.push({
              type: cleanTipo,
              contact: cleanContato,
              observation: cleanObs,
            })
          }
        }
      })
    }

    // Fallback: se o inline group falhar, varre qualquer tabela/linhas contendo "Celular Pessoal" ou "Telefone"
    if (contacts.length === 0) {
      const rows = doc.querySelectorAll('tr')
      rows.forEach((row) => {
        if (row.classList.contains('empty-form') || row.id?.includes('__prefix__')) return
        const text = row.textContent || ''
        if (text.includes('Celular Pessoal') || text.includes('Telefone') || text.includes('Contato')) {
          const cells = Array.from(row.querySelectorAll('td'))
          if (cells.length >= 2) {
            const cleanTipo = cells[0].textContent?.trim() || ''

            const contatoLink = cells[1].querySelector<HTMLAnchorElement>('a')
            const cleanContato = contatoLink ? contatoLink.textContent?.trim() || '' : cells[1].textContent?.trim() || ''

            const obsParagraph = cells.length >= 3 ? cells[2].querySelector('p') : null
            const cleanObs = cells.length >= 3 ? (obsParagraph ? obsParagraph.textContent?.trim() || '' : cells[2].textContent?.trim() || '') : ''

            if (cleanContato) {
              contacts.push({ type: cleanTipo, contact: cleanContato, observation: cleanObs })
            }
          }
        }
      })
    }

    // Filtra apenas telefones (números sem @ com tamanho >= 8)
    const phoneContacts = contacts.filter((c) => {
      const cleanVal = c.contact.replace(/\D/g, '')
      return cleanVal.length >= 8 && !c.contact.includes('@')
    })

    if (phoneContacts.length === 0) {
      throw new Error('Nenhum número de telefone encontrado no cadastro do SGP para este cliente.')
    }

    // Formatação dos contatos
    const phoneLines = phoneContacts
      .map((c) => {
        const cleanPhoneText = c.contact
          .replace(/Validar/g, '')
          .replace(/validar/g, '')
          .trim()
        const cleanObsText = c.observation
          .replace(/Validar/g, '')
          .replace(/validar/g, '')
          .trim()
        return cleanObsText ? `• ${cleanPhoneText} (${cleanObsText})` : `• ${cleanPhoneText}`
      })
      .join('\n')

    // Constrói a mensagem final (com substituição flexível de placeholders)
    let finalMsg = ''
    if (templateText && templateText !== 'VALIDAR_CONTATOS_DYNAMIC') {
      const replaced = templateText.replace(/\[contatossgp\]/gi, phoneLines).replace(/\[numerossgp\]/gi, phoneLines)

      finalMsg = processDynamicPlaceholders(replaced)
    } else {
      // Mensagem padrão de fallback
      finalMsg = `Verifiquei que os números abaixo estão registrados em nosso sistema:\n${phoneLines}\n\nEles ainda são contatos válidos? Em caso positivo, poderia me informar quem utiliza cada um deles? Assim consigo manter o cadastro atualizado.`
    }

    setNativeValue(textarea, finalMsg)
    textarea.focus()
    showToast('📞 Contatos do cliente importados com sucesso!', 'success')
  } catch (error: any) {
    logError('Erro ao puxar contatos do SGP:', error)
    showToast(error.message || 'Erro ao puxar contatos do SGP.', 'error')
  } finally {
    btn.textContent = originalText
    btn.disabled = false
  }
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
