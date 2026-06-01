// =================================================================
// SESSÃO — Salva e recupera dados do usuário logado
// =================================================================

export interface UserSession {
  uid: string
  username: string
  nomeCompleto: string
  role: 'admin' | 'supervisor' | 'moderador' | 'usuario'
  setor: 'geral' | 'ti' | 'financeiro' | 'suporte' | 'comercial'
  email: string
  idToken: string
  refreshToken: string // token de renovação (não expira)
  tokenExpiresAt: number // timestamp Unix (ms) de expiração do idToken
  avatarUrl?: string
  sgpUsername?: string
}

const SESSION_KEY = 'ati_user_session'

export async function getSession(): Promise<UserSession | null> {
  try {
    const result = await chrome.storage.local.get(SESSION_KEY)
    return result[SESSION_KEY] ?? null
  } catch (error) {
    console.error('Extensão ATI: Erro ao ler sessão.', error)
    return null
  }
}

export async function saveSession(session: UserSession): Promise<void> {
  try {
    await chrome.storage.local.set({ [SESSION_KEY]: session })
    console.log(`Extensão ATI: Sessão salva para ${session.username}`)
  } catch (error) {
    console.error('Extensão ATI: Erro ao salvar sessão.', error)
  }
}

export async function clearSession(): Promise<void> {
  try {
    await chrome.storage.local.remove(SESSION_KEY)
    console.log('Extensão ATI: Sessão encerrada.')
  } catch (error) {
    console.error('Extensão ATI: Erro ao limpar sessão.', error)
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}

// =================================================================
// REFRESH AUTOMÁTICO — Garante token válido antes de usar o Firebase
// =================================================================

import { safeSendMessage } from '../helpers'

/**
 * Retorna a sessão com um idToken garantidamente válido.
 * Se o token estiver expirado (ou vencer nos próximos 5 min),
 * delega a renovação ao background e persiste a sessão atualizada.
 * Retorna null se a sessão não existir ou a renovação falhar.
 */
export async function ensureFreshToken(): Promise<UserSession | null> {
  const session = await getSession()
  if (!session) return null

  // Se o token ainda é válido (com 5 min de folga), usa direto
  const FIVE_MINUTES_MS = 5 * 60 * 1000
  if (session.tokenExpiresAt && Date.now() < session.tokenExpiresAt - FIVE_MINUTES_MS) {
    return session
  }

  // Token expirado ou prestes a expirar — renova via background
  console.log('Extensão ATI: Token expirado ou próximo de expirar. Renovando...')

  try {
    const result = await safeSendMessage({
      action: 'refreshToken',
      refreshToken: session.refreshToken,
    })

    if (!result?.success || !result.idToken) {
      console.error('Extensão ATI: Falha na renovação do token. Usuário precisará fazer login novamente.')
      await clearSession()
      return null
    }

    const updatedSession: UserSession = {
      ...session,
      idToken: result.idToken,
      refreshToken: result.refreshToken,
      tokenExpiresAt: result.tokenExpiresAt,
    }

    await saveSession(updatedSession)
    console.log('Extensão ATI: Sessão atualizada com novo token.')
    return updatedSession
  } catch (error) {
    console.error('Extensão ATI: Erro ao renovar token.', error)
    return session // retorna a sessão antiga como fallback
  }
}
