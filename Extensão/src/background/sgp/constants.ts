// =================================================================
// SGP — CONSTANTES E INTERFACES
// =================================================================

export const SGP_DNS = 'http://201.158.20.35:8000'
export const SGP_IP_35 = 'http://201.158.20.35:8000'
export const SGP_IP_53 = 'http://201.158.20.53:8000'
export const LOGIN_CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 horas

export interface ClientData {
  fullName: string
  firstName: string
  phoneNumber: string
  cpfCnpj: string | null
  isIdentified: boolean
  clientSgpId?: string | null
  clientSgpOrigin?: string | null
}

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
