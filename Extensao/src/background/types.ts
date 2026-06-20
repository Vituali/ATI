import { ClientData } from '../contentScript/sgp/types'

export interface FirebaseLoginRequest {
  action: 'firebaseLogin'
  email: string
  password: string
}
export interface OpenInSgpRequest {
  action: 'openInSgp'
  clientData: ClientData
  cachedContract: string | null
  forceClientId?: string
  uid?: string
  forceShowModal?: boolean
}
export interface GetSgpFormParamsRequest {
  action: 'getSgpFormParams'
  clientData: ClientData
  chatId: string
  idToken: string
  uid?: string
}
export interface CreateOccurrenceVisuallyRequest {
  action: 'createOccurrenceVisually'
  data: Record<string, unknown>
}
export interface ClearSgpCacheRequest {
  action: 'clearSgpCache'
  cacheKey: string
}
export interface ClearCpfCacheRequest {
  action: 'clearCpfCache'
  cpf: string
}
export interface ClearCpfCacheByUidRequest {
  action: 'clearCpfCacheByUid'
  uid: string
}
export interface GetOsTemplatesRequest {
  action: 'getOsTemplates'
  username: string
  idToken: string
}
export interface GetQuickRepliesRequest {
  action: 'getQuickReplies'
  username: string
  idToken: string
}
export interface RefreshSgpOnlineStatusesRequest {
  action: 'refreshSgpOnlineStatuses'
  clientData: ClientData
  chatId: string
}
export interface GetGlobalOccurrenceTypesRequest {
  action: 'getGlobalOccurrenceTypes'
  idToken: string
}
export interface RefreshTokenRequest {
  action: 'refreshToken'
  refreshToken: string
}
export interface FirebaseFetchRequest {
  action: 'firebaseFetch'
  url: string
}
export interface FirebasePostRequest {
  action: 'firebasePost'
  url: string
  payload: any
}
export interface FirebasePatchRequest {
  action: 'firebasePatch'
  url: string
  payload: any
}

export interface SsoLoginRequest {
  action: 'SSO_LOGIN'
  session: any
}
export interface GetSsoSessionRequest {
  action: 'GET_SSO_SESSION'
}
export interface RefreshUserSessionRequest {
  action: 'refreshUserSession'
}
export interface ClearSessionCachesRequest {
  action: 'clearSessionCaches'
}
export interface LogoutRequest {
  action: 'logout'
}
export interface CheckVersionRequest {
  action: 'checkVersion'
}
export interface GetSgpClientContactsRequest {
  action: 'getSgpClientContacts'
  clientUrl?: string
  baseUrl?: string
  clientId?: string
  clientData?: ClientData
  uid?: string
}

export interface SearchSgpFeasibilityRequest {
  action: 'searchSgpFeasibility'
  baseUrl: string
  logradouro: string
  numero?: string
}

export interface SearchSgpOfflineClientsRequest {
  action: 'searchSgpOfflineClients'
  baseUrl: string
  filters?: {
    logradouro?: string
    numero?: string
    bairro?: string
    olt?: string
    oltslot?: string
    oltpon?: string
  }
}

export interface FindClientOnSgpRequest {
  action: 'findClientOnSgp'
  baseUrl: string
  clientData: ClientData
  uid?: string
}

export interface FetchSupportDataRequest {
  action: 'fetchSupportData'
  baseUrl: string
  contractId: string
  clientId?: string
}

export interface ExecuteOnuCommandRequest {
  action: 'executeOnuCommand'
  baseUrl: string
  sgpOnuId: string
  command: 'reset' | 'tl1-add' | 'tl1-delete'
}

export type ExtensionRequest = FirebaseLoginRequest | OpenInSgpRequest | GetSgpFormParamsRequest | CreateOccurrenceVisuallyRequest | ClearSgpCacheRequest | ClearCpfCacheRequest | ClearCpfCacheByUidRequest | GetOsTemplatesRequest | GetQuickRepliesRequest | RefreshSgpOnlineStatusesRequest | GetGlobalOccurrenceTypesRequest | RefreshTokenRequest | FirebaseFetchRequest | FirebasePostRequest | FirebasePatchRequest | SsoLoginRequest | GetSsoSessionRequest | RefreshUserSessionRequest | ClearSessionCachesRequest | LogoutRequest | CheckVersionRequest | GetSgpClientContactsRequest | SearchSgpFeasibilityRequest | SearchSgpOfflineClientsRequest | FindClientOnSgpRequest | FetchSupportDataRequest | ExecuteOnuCommandRequest
