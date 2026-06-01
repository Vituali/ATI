// =================================================================
// AUTO-IDENTIFICAÇÃO DO CLIENTE NO CHATMIX
// =================================================================

import { SELECTORS, log, logWarn, identificationLock, setIdentificationLock } from './state'
import { findCPF, collectTextFromMessages, setNativeValue } from './helpers'

export async function tryVisualIdentification(force = false): Promise<boolean> {
  if (identificationLock && !force) {
    log('Identificação bloqueada, pulando...')
    return false
  }

  try {
    let input = document.querySelector<HTMLInputElement>(SELECTORS.unidentifiedInput)

    // Se forçado e input não está visível, tenta navegar para a aba do cliente
    if (!input && force) {
      const clientTab = document.querySelector<HTMLAnchorElement>(SELECTORS.clientTabLink)
      if (clientTab) {
        log('Navegando para aba do cliente para buscar input de CPF...')
        clientTab.click()
        await new Promise((r) => setTimeout(r, 800))
        input = document.querySelector<HTMLInputElement>(SELECTORS.unidentifiedInput)
      }
    }

    if (input && (!input.value || force)) {
      const cpf = findCPF(collectTextFromMessages())

      if (cpf) {
        setIdentificationLock(true)
        setNativeValue(input, cpf)
        await new Promise((r) => setTimeout(r, 500))

        const button = input.closest('.grid')?.querySelector('button') as HTMLButtonElement | null

        if (button && !button.disabled) {
          button.click()
          log('Auto-identificação executada com CPF:', cpf)

          // Libera o lock após tempo suficiente para a ação completar
          setTimeout(() => setIdentificationLock(false), force ? 1000 : 5000)
          return true
        } else {
          logWarn('Botão de identificação não encontrado ou desabilitado.')
          setIdentificationLock(false)
        }
      } else {
        log('CPF não encontrado nas mensagens para auto-identificação.')
      }
    }
  } catch (error) {
    logWarn('Erro na tentativa de auto-identificação:', error)
    setIdentificationLock(false)
  }

  return false
}
