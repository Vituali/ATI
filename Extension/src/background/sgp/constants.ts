// =================================================================
// SGP — CONSTANTES E INTERFACES
// =================================================================

export const SGP_IP_35 = 'http://201.158.20.35:8000'
export const SGP_IP_53 = 'http://201.158.20.53:8000'

export interface SgpHost {
  key: string
  url: string
  name: string
}

export const SGP_DEFAULT_HOSTS: SgpHost[] = [
  { key: 'sgp_35', url: SGP_IP_35, name: 'SGP Antigo' },
  { key: 'sgp_53', url: SGP_IP_53, name: 'SGP Novo' },
]

export const LOGIN_CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 horas

export interface SgpClient {
  id: string
  text: string
}

export interface SgpContract {
  id: string
  text: string
  clientId: string
  online?: boolean | null // null = desconhecido
}
