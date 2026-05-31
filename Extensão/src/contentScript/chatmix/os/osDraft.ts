// =================================================================
// OS DRAFT — Salva rascunho da O.S por chatId no sessionStorage
// Limpo automaticamente ao encerrar atendimento
// =================================================================

import { SgpData } from '../../sgp/types'

export interface OsDraft {
  osText: string
  selectedContract: string | null
  selectedContractText: string | null
  occurrenceType: string | null
  occurrenceTypeText: string | null
  sgpData?: SgpData | null
}

const DRAFT_PREFIX = 'ati_os_draft_'

export function saveDraft(chatId: string, draft: OsDraft): void {
  try {
    sessionStorage.setItem(DRAFT_PREFIX + chatId, JSON.stringify(draft))
  } catch {}
}

export function loadDraft(chatId: string): OsDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_PREFIX + chatId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearDraft(chatId: string): void {
  try {
    sessionStorage.removeItem(DRAFT_PREFIX + chatId)
  } catch {}
}

export function clearAllDrafts(): void {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(DRAFT_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k))
  } catch {}
}
