// =================================================================
// AÇÕES DO SGP — CONTENT SCRIPT
// Apenas envia mensagens para o background processar
// (CORS e chrome.tabs só funcionam no background)
// =================================================================

import { ClientData } from './types'
import { log, logError, lastExtractedData, setLastExtractedData } from '../chatmix/state'
import { safeSendMessage, showToast } from '../chatmix/helpers'
import type { OpenInSgpRequest } from '../../background/types'
import { showClientSelectionModal } from './clientModal'

let isSearchRunning = false

export let cachedContract: string | null = null
export function setCachedContract(value: string | null) {
  cachedContract = value
}

export async function smartOpenSGP(clientData: ClientData, uid?: string, forceShowModal?: boolean): Promise<void> {
  if (isSearchRunning) {
    log('Busca já em andamento, ignorando clique duplo.')
    return
  }

  isSearchRunning = true
  log('Botão SGP pressionado, enviando dados para o background...')

  const tStart = performance.now()
  try {
    const response = await Promise.race([
      safeSendMessage<OpenInSgpRequest>({
        action: 'openInSgp',
        clientData,
        cachedContract,
        uid,
        forceShowModal,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: background não respondeu em 5s')), 5000)),
    ])
    const tEnd = performance.now()
    log(`⏱️ [ATI Perf] openInSgp (busca unificada) demorou ${(tEnd - tStart).toFixed(1)}ms.`)

    const res = response as {
      success?: boolean
      error?: string
      multipleClients?: boolean
      clients?: { id: string; text: string }[]
      clientId?: string
      sgpOrigin?: string
    }
    if (!res?.success) {
      throw new Error(res?.error ?? 'Erro desconhecido no background.')
    }

    // Se o background retornou um ID (busca única sucesso), salvamos no cache local do content script
    // para que o próximo clique já tenha o clientSgpId e pule a busca.
    if (res.clientId) {
      log(`ID do cliente (${res.clientId}) recebido do background e salvo no cache de sessão.`)
      clientData.clientSgpId = res.clientId
      if (res.sgpOrigin) {
        clientData.clientSgpOrigin = res.sgpOrigin
      }
      setLastExtractedData(lastExtractedData.chatId, clientData)
    }

    if (res.multipleClients && res.clients) {
      log('Múltiplos cadastros encontrados, exibindo modal no Chatmix.')
      const selectedId = await showClientSelectionModal(res.clients)
      if (selectedId) {
        log(`Cadastro escolhido: ${selectedId}`)
        await safeSendMessage<OpenInSgpRequest>({
          action: 'openInSgp',
          clientData,
          cachedContract,
          forceClientId: selectedId,
          uid,
        })
      }
      return
    }

    log('SGP aberto com sucesso.')
  } catch (error: any) {
    const tEndErr = performance.now()
    logError(`⏱️ [ATI Perf] openInSgp falhou após ${(tEndErr - tStart).toFixed(1)}ms.`)
    logError('Erro ao enviar mensagem para o background:', error)
    showToast(`Extensão ATI: Erro ao enviar mensagem para o background: ${error.message || error}`, 'error')
    throw error
  } finally {
    isSearchRunning = false
  }
}
