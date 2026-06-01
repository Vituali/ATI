// =================================================================
// LOGIN / LOGOUT — Delega ao background para evitar bloqueio de referer
// O Firebase Auth não aceita requisições com referer do chatmix.com.br
// =================================================================

import { clearSession, saveSession, UserSession } from './session'
import { safeSendMessage } from '../helpers'
import type { FirebaseLoginRequest } from '../../../background/types'

export type LoginResult = { success: true; session: UserSession } | { success: false; error: string }

export async function loginWithEmail(email: string, password: string): Promise<LoginResult> {
  try {
    console.log('Extensão ATI: Enviando credenciais para o background...')

    const response = await safeSendMessage<FirebaseLoginRequest>({
      action: 'firebaseLogin',
      email,
      password,
    })

    if (!response?.success) {
      return { success: false, error: response?.error ?? 'Erro desconhecido.' }
    }

    // Salva sessão localmente após confirmação do background
    await saveSession(response.session)
    console.log(`Extensão ATI: Sessão salva para ${response.session.username}`)
    return { success: true, session: response.session }
  } catch (error: unknown) {
    console.error('Extensão ATI: Erro ao comunicar com background.', error)
    return { success: false, error: 'Erro de conexão com a extensão.' }
  }
}

export async function logout(): Promise<void> {
  try {
    await clearSession()
    console.log('Extensão ATI: Logout realizado.')
  } catch (error) {
    console.error('Extensão ATI: Erro ao fazer logout.', error)
  }
}
