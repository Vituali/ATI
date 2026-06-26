import { firebaseConfig } from '../config'
import { SGP_DEFAULT_HOSTS } from './constants'
import type { SgpHost } from './constants'

const CACHE_KEY = 'sgp_hosts_config'

let runtimeCache: SgpHost[] | null = null

export async function initSgpConfig(idToken: string): Promise<SgpHost[]> {
  try {
    const res = await fetch(
      `${firebaseConfig.databaseURL}config/sgp_hosts.json?auth=${idToken}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as Record<string, { url: string; name?: string }> | null
    if (data && Object.keys(data).length > 0) {
      const hosts: SgpHost[] = Object.entries(data).map(([key, val]) => ({
        key,
        url: val.url,
        name: val.name ?? key,
      }))
      runtimeCache = hosts
      await chrome.storage.session.set({ [CACHE_KEY]: hosts })
      return hosts
    }
  } catch {
    // fall through
  }
  const hosts = await loadCachedHosts()
  runtimeCache = hosts
  return hosts
}

export async function getSgpHosts(): Promise<SgpHost[]> {
  if (runtimeCache) return runtimeCache
  const hosts = await loadCachedHosts()
  runtimeCache = hosts
  return hosts
}

export function getDefaultSgpUrl(hostKey: string): string {
  const host = runtimeCache?.find(h => h.key === hostKey)
  if (host) return host.url
  const def = SGP_DEFAULT_HOSTS.find(h => h.key === hostKey)
  return def?.url ?? ''
}

export function matchSgpKey(baseUrl: string): string | null {
  const hosts = runtimeCache ?? SGP_DEFAULT_HOSTS
  const ip = extractIp(baseUrl)
  if (!ip) return null
  return hosts.find(h => extractIp(h.url) === ip)?.key ?? null
}

export function getAlternateSgpUrl(baseUrl: string): string {
  const hosts = runtimeCache ?? SGP_DEFAULT_HOSTS
  const idx = hosts.findIndex(h => baseUrl.includes(extractIp(h.url)))
  if (idx === -1) return ''
  const alt = hosts[idx === 0 ? 1 : 0]
  return alt?.url ?? ''
}

function extractIp(url: string): string {
  const m = url.match(/https?:\/\/([\d.]+)/)
  return m ? m[1] : ''
}

async function loadCachedHosts(): Promise<SgpHost[]> {
  const cached = await chrome.storage.session.get(CACHE_KEY)
  if (cached[CACHE_KEY]) {
    return cached[CACHE_KEY] as SgpHost[]
  }
  return SGP_DEFAULT_HOSTS
}
