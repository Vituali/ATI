// =================================================================
// SGP — TIPOS E INTERFACES GLOBAIS
// =================================================================

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
  online?: boolean | null
  cancelled?: boolean
  baseUrl?: string
}

export interface SgpUser {
  id: string
  username: string
}

export interface SgpOccurrenceType {
  id: string
  text: string
}

export interface SgpData {
  clientSgpId: string
  contracts: SgpContract[]
  responsibleUsers: SgpUser[]
  occurrenceTypes: SgpOccurrenceType[]
  clientSgpOrigin?: string | null
}

export interface OsTemplate {
  category: string
  text: string
  title: string
  occurrenceTypeId?: string
  occurrenceTypeId_53?: string
  occurrenceTypeName?: string
}

export interface ModalButton {
  text: string
  value: string
  className: string
  disabled?: boolean
}

export interface ModalResult {
  action: string
  data: {
    osText: string
    selectedContract: string | null
    occurrenceType: string | null
    occurrenceStatus: '1' | '2'
    shouldCreateOS: boolean
  }
}

export interface SgpStatus {
  isLoggedIn: boolean
  baseUrl: string
}

export interface SgpStatusCache extends SgpStatus {
  timestamp: number
}
