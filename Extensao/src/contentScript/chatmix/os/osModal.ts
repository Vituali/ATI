// =================================================================
// MODAL DE O.S — Orquestrador principal
// =================================================================

import './osModal.css'
import { ClientData, SgpData, SgpContract } from '../../sgp/types'
import { formatPhoneNumber, safeSendMessage, showToast } from '../helpers'
import { clearDraft, loadDraft, saveDraft } from './osDraft'
import { SGP_IP_35, SGP_IP_53 } from '../../../background/sgp/constants'
import { currentChatId } from '../state'
import { processDynamicPlaceholders, buildTemplatesHTML, OsTemplate } from './osModalTypes'
import { icon } from '../../../utils/iconSvgs'
import { createModal, buildOsModalBodyHTML } from './osModalUI'
import { loadSgpData, populateTechnicians } from './osModalSgp'
import { setupDraftSaving, setupOsCheckbox, setupTemplateButtons, setupPeriodoChangeListener } from './osModalHandlers'
import { getSession } from '../auth/session'
import type { ClearSgpCacheRequest, CreateOccurrenceVisuallyRequest } from '../../../background/types'

export { processDynamicPlaceholders }

export async function showOSModal(allTemplates: OsTemplate[], extractChatFn: () => string[], clientData: ClientData): Promise<void> {
  const { firstName, phoneNumber, cpfCnpj, fullName } = clientData
  const formattedPhone = phoneNumber ? formatPhoneNumber(phoneNumber) : ''
  const osBaseText = `${formattedPhone} ${firstName ?? ''} | `
  const cacheKey = clientData.clientSgpId ?? cpfCnpj ?? fullName ?? phoneNumber
  const chatId = currentChatId ?? cacheKey ?? 'unknown'
  const session = await getSession()
  const idToken = session?.idToken ?? ''

  try {
    const existingDraft = chatId ? loadDraft(chatId) : null

    const storage = await chrome.storage.local.get('ati_preferred_sgp')
    const currentPref = storage.ati_preferred_sgp || SGP_IP_53
    let activeIsOld = currentPref === SGP_IP_35
    const modalTitle = activeIsOld ? 'Criar Ordem de Serviço <span class="sgp-badge sgp-badge--old">SGP ANTIGO</span>' : 'Criar Ordem de Serviço <span class="sgp-badge sgp-badge--new">SGP NOVO</span>'

    // --- Monta modal ---
    const templatesHTML = buildTemplatesHTML(allTemplates)
    const modalConfig = {
      title: modalTitle,
      bodyHTML: buildOsModalBodyHTML(templatesHTML),
      footerButtons: [
        { text: 'Cancelar', className: 'main-btn--cancel', value: 'cancel' },
        { text: `${icon.settings} Trocar SGP`, className: 'main-btn--change-sgp', value: 'change_sgp' },
        { text: `${icon.clipboardList} Copiar`, className: 'main-btn--confirm', value: 'copy' },
        { text: `${icon.rocket} Preencher no SGP`, className: 'main-btn--sgp', value: 'fill_sgp', disabled: true },
      ],
    }

    let sgpData: SgpData | null = null
    const { promise: resultPromise, controller: modalController } = createModal(modalConfig)

    const modalElement = document.querySelector<HTMLElement>('.ati-os-modal')!
    const osTextArea = modalElement.querySelector<HTMLTextAreaElement>('#osTextArea')!
    const sgpButton = modalElement.querySelector<HTMLButtonElement>('button[value="fill_sgp"]')!
    const osCheckbox = modalElement.querySelector<HTMLInputElement>('#shouldCreateOSCheckbox')!
    const statusCheckbox = modalElement.querySelector<HTMLInputElement>('#occurrenceStatusCheckbox')!
    const statusLabel = modalElement.querySelector<HTMLElement>('#lblOccurrenceStatus')!

    // Texto inicial
    osTextArea.value = existingDraft?.osText ? existingDraft.osText : processDynamicPlaceholders(osBaseText).toUpperCase()

    setupDraftSaving(chatId, osTextArea, modalElement, () => sgpData)
    setupOsCheckbox(osCheckbox, statusCheckbox, statusLabel, modalElement)
    setupPeriodoChangeListener(modalElement)
    setupTemplateButtons(
      modalElement,
      osTextArea,
      osBaseText,
      () => sgpData?.occurrenceTypes ?? [],
      () => !activeIsOld,
    )

    // Carrega dados SGP (cache ou busca)
    loadSgpData({
      clientData,
      chatId,
      idToken,
      uid: currentChatId ?? undefined,
      modalElement,
      sgpButton,
      signal: modalController.signal,
      existingDraft,
      onSgpDataLoaded: async (data) => {
        if (sgpData) {
          sgpData = {
            clientSgpId: data.clientSgpId || sgpData.clientSgpId,
            contracts: data.contracts && data.contracts.length > 0 ? data.contracts : sgpData.contracts,
            responsibleUsers: data.responsibleUsers && data.responsibleUsers.length > 0 ? data.responsibleUsers : sgpData.responsibleUsers,
            occurrenceTypes: data.occurrenceTypes && data.occurrenceTypes.length > 0 ? data.occurrenceTypes : sgpData.occurrenceTypes,
            // @ts-ignore
            clientSgpOrigin: data.clientSgpOrigin || sgpData.clientSgpOrigin,
          }
        } else {
          sgpData = data
        }

        // Preenche técnicos no formulário do modal
        populateTechnicians(modalElement, sgpData.responsibleUsers || [])

        // Atualiza a UI do Header se o SGP tiver sido alterado pelo auto-swap
        const freshStorage = await chrome.storage.local.get('ati_preferred_sgp')
        const freshPref = freshStorage.ati_preferred_sgp || SGP_IP_53
        activeIsOld = freshPref === SGP_IP_35

        const headerEl = modalElement.querySelector('.ati-os-modal-header')
        if (headerEl) {
          headerEl.innerHTML = activeIsOld ? 'Criar Ordem de Serviço <span class="sgp-badge sgp-badge--old">SGP ANTIGO</span>' : 'Criar Ordem de Serviço <span class="sgp-badge sgp-badge--new">SGP NOVO</span>'
        }
      },
    })

    // Aguarda ação do usuário
    const userAction = await resultPromise

    if (userAction.action === 'change_sgp') {
      const storage = await chrome.storage.local.get('ati_preferred_sgp')
      const currentPref = storage.ati_preferred_sgp
      const newSgp = currentPref === SGP_IP_35 ? SGP_IP_53 : SGP_IP_35

      await chrome.storage.local.set({ ati_preferred_sgp: newSgp })
      if (chatId) {
        await chrome.storage.local.set({ [`ati_manual_sgp_force_${chatId}`]: newSgp })
      }
      await safeSendMessage({ action: 'clearSgpCache', cacheKey: 'all' })
      await chrome.storage.local.remove('sgp_status_cache')

      if (chatId) {
        saveDraft(chatId, {
          osText: userAction.data.osText,
          selectedContract: null,
          selectedContractText: null,
          occurrenceType: userAction.data.occurrenceType,
          occurrenceTypeText: modalElement.querySelector<HTMLInputElement>('#occurrenceTypeSearchInput')?.value ?? null,
          sgpData: null,
        })
      }
      await showOSModal(allTemplates, extractChatFn, clientData)
      return
    }

    if (userAction.action === 'fill_sgp' && !sgpData) {
      throw new Error('Aguarde o carregamento dos dados do SGP.')
    }

    const resolvedSgpData = sgpData as unknown as SgpData
    const validContracts = resolvedSgpData?.contracts?.filter((c: SgpContract) => c?.id) ?? []
    const selectedContractId = userAction.data.selectedContract ?? validContracts[0]?.id ?? null
    const selectedContractObj = validContracts.find((c: SgpContract) => c.id === selectedContractId)
    const correctClientSgpId = selectedContractObj?.clientId ?? resolvedSgpData?.clientSgpId ?? null
    // @ts-ignore
    const selectedSgpOrigin = selectedContractObj?.baseUrl ?? resolvedSgpData?.clientSgpOrigin ?? null

    const isTarget53 = selectedSgpOrigin && selectedSgpOrigin.includes('201.158.20.53')
    let resolvedOccurrenceType = userAction.data.occurrenceType
    if (resolvedOccurrenceType && resolvedOccurrenceType.startsWith('{')) {
      try {
        const parsed = JSON.parse(resolvedOccurrenceType)
        resolvedOccurrenceType = isTarget53 ? parsed.id_53 || parsed.id_35 : parsed.id_35 || parsed.id_53
      } catch (e) {
        console.warn('Extensão ATI: Falha ao parsear tipo de ocorrência unificado:', e)
      }
    }

    const occurrenceTypeSearchInput = modalElement.querySelector<HTMLInputElement>('#occurrenceTypeSearchInput')
    const occurrenceTypeText = occurrenceTypeSearchInput?.value ?? null

    const submissionData = {
      ...clientData,
      clientSgpId: correctClientSgpId,
      sgpOrigin: selectedSgpOrigin,
      osText: userAction.data.osText,
      selectedContract: selectedContractId,
      occurrenceType: resolvedOccurrenceType,
      occurrenceTypeText: occurrenceTypeText,
      shouldCreateOS: userAction.data.shouldCreateOS,
      occurrenceStatus: userAction.data.occurrenceStatus,
      responsibleUsers: resolvedSgpData?.responsibleUsers ?? [],
      osDataAgendamento: userAction.data.osDataAgendamento,
      osDateModified: userAction.data.osDateModified,
    }

    const clientKey = clientData.clientSgpId || cpfCnpj || phoneNumber || fullName || chatId

    if (userAction.action === 'copy') {
      await navigator.clipboard.writeText(submissionData.osText)
      if (chatId) {
        clearDraft(chatId)
        await chrome.storage.local.remove(`ati_manual_sgp_force_${chatId}`)
        await chrome.storage.local.remove(`ati_support_cache_${chatId}`)
      }
      safeSendMessage<ClearSgpCacheRequest>({
        action: 'clearSgpCache',
        cacheKey: clientKey,
      })
      console.log('Extensão ATI: O.S copiada.')
    } else if (userAction.action === 'fill_sgp') {
      if (!submissionData.osText || !submissionData.selectedContract || !submissionData.occurrenceType) {
        throw new Error('Descrição, Contrato e Tipo são obrigatórios.')
      }
      if (submissionData.shouldCreateOS) {
        const osData = {
          motivo: userAction.data.osMotivo,
          prioridade: userAction.data.osPrioridade,
          dataAgendamento: userAction.data.osDataAgendamento,
          periodo: userAction.data.osPeriodo,
          periodoExtra: userAction.data.osPeriodoExtra,
          responsavel: userAction.data.osResponsavel,
          tecnicos: userAction.data.osTecnicos,
          observacao: userAction.data.osObservacao,
        }
        await chrome.storage.local.set({ ati_pending_os_fill_data: osData })
        console.log('Extensão ATI: Dados de O.S. agendados para preenchimento posterior:', osData)
      }
      if (chatId) {
        clearDraft(chatId)
        await chrome.storage.local.remove(`ati_manual_sgp_force_${chatId}`)
        await chrome.storage.local.remove(`ati_support_cache_${chatId}`)
      }
      safeSendMessage<ClearSgpCacheRequest>({
        action: 'clearSgpCache',
        cacheKey: clientKey,
      })

      const isSgpPage = window.location.hostname.includes('sgp') || window.location.hostname.includes('201.158.20.35') || window.location.hostname.includes('201.158.20.53')

      if (isSgpPage) {
        console.log('Extensão ATI: Preenchendo formulário localmente no SGP...')
        const script = document.createElement('script')
        script.src = chrome.runtime.getURL('src/contentScript/sgp/sgpFill.js')
        script.onload = () => {
          window.postMessage(
            {
              type: 'ATI_SGP_FILL',
              data: submissionData,
              username: (session?.sgpUsername ?? session?.username)?.toLowerCase() ?? '',
              fullname: session?.nomeCompleto?.toLowerCase() ?? '',
            },
            window.location.origin,
          )
          script.remove()
        }
        document.documentElement.appendChild(script)
      } else {
        console.log('Extensão ATI: Abrindo SGP para preenchimento...')
        safeSendMessage<CreateOccurrenceVisuallyRequest>({
          action: 'createOccurrenceVisually',
          data: submissionData,
        })
      }
    }
  } catch (error: unknown) {
    if (chatId) {
      await chrome.storage.local.remove(`ati_manual_sgp_force_${chatId}`)
    }
    const isCancel = error instanceof Error ? error.message === 'cancel' : error === 'cancel'
    if (!isCancel) {
      console.error('Extensão ATI: Erro no modal O.S.', error)
      showToast(`Extensão ATI: Erro no modal O.S.: ${error instanceof Error ? error.message : error}`, 'error')
      throw error
    }
  }
}
