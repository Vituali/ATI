// =================================================================
// MODAL DE O.S — Tipos locais do modal e utilitários
// =================================================================

import { OsTemplate, ModalButton } from '../../sgp/types'

// Re-exporta para uso conveniente nos outros módulos
export type { OsTemplate }

// ModalConfig é local — usa ModalButton do sgp/types
export interface ModalConfig {
  title: string
  bodyHTML: string
  footerButtons: ModalButton[]
}

// =================================================================
// PLACEHOLDERS DINÂMICOS
// =================================================================

export function processDynamicPlaceholders(text: string): string {
  if (typeof text !== 'string') return ''

  const now = new Date()
  const hora = now.getHours()

  const saudacao = hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite'

  const despedida = hora >= 5 && hora < 12 ? 'Tenha uma excelente manhã' : hora >= 12 && hora < 18 ? 'Tenha uma excelente tarde' : 'Tenha uma excelente noite'

  const dia = String(now.getDate()).padStart(2, '0')
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const ano = now.getFullYear()
  const dataHoje = `${dia}/${mes}/${ano}`

  return text
    .replace(/\[SAUDACAO\]/gi, saudacao)
    .replace(/\[DESPEDIDA\]/gi, despedida)
    .replace(/\[HOJE\]/gi, dataHoje)
}

// =================================================================
// BUILDER DO HTML DE TEMPLATES
// =================================================================

export function buildTemplatesHTML(templates: OsTemplate[]): string {
  const byCategory = (templates ?? []).reduce<Record<string, OsTemplate[]>>((acc, t) => {
    if (t.category === 'quick_reply') return acc
    const cat = t.category ?? 'Outros'
    ;(acc[cat] = acc[cat] ?? []).push(t)
    return acc
  }, {})

  let html = ''
  for (const [cat, temps] of Object.entries(byCategory)) {
    html +=
      `<h4 class="modal-category-title">${cat}</h4><div class="modal-btn-group">` +
      temps
        .filter((t) => t.text && t.title)
        .map((t) => `<button class="template-btn" data-template-text="${t.text.replace(/"/g, '&quot;')}" data-occurrence-type-id="${t.occurrenceTypeId ?? ''}" data-occurrence-type-id-53="${t.occurrenceTypeId_53 ?? ''}" data-occurrence-type-name="${(t.occurrenceTypeName ?? '').replace(/"/g, '&quot;')}">${t.title}</button>`)
        .join('') +
      `</div>`
  }
  return html
}
