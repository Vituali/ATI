// =================================================================
// SGP — CACHE DO FORMULÁRIO
// =================================================================

import { SgpData } from '../../contentScript/sgp/types'

const SGP_FORM_CACHE_MAX = 50

export async function getSgpFormCache(key: string): Promise<SgpData | undefined> {
  const { sgpFormCache } = await chrome.storage.session.get('sgpFormCache')
  return sgpFormCache?.[key]
}

export async function hasSgpFormCache(key: string): Promise<boolean> {
  const { sgpFormCache } = await chrome.storage.session.get('sgpFormCache')
  return !!sgpFormCache?.[key]
}

export async function setSgpFormCache(key: string, value: SgpData): Promise<void> {
  const { sgpFormCache = {} } = await chrome.storage.session.get('sgpFormCache')
  const keys = Object.keys(sgpFormCache)

  if (keys.length >= SGP_FORM_CACHE_MAX && !sgpFormCache[key]) {
    delete sgpFormCache[keys[0]]
  }
  sgpFormCache[key] = value
  await chrome.storage.session.set({ sgpFormCache })
}

export async function deleteSgpFormCache(key: string): Promise<void> {
  if (key === 'all') {
    await chrome.storage.session.remove('sgpFormCache')
    console.log('Extensão ATI: Todo o cache SGP foi limpo.')
  } else {
    const { sgpFormCache } = await chrome.storage.session.get('sgpFormCache')
    if (sgpFormCache) {
      delete sgpFormCache[key]
      await chrome.storage.session.set({ sgpFormCache })
    }
  }
}
