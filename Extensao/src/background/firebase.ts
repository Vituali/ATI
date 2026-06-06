// =================================================================
// FIREBASE — CONFIG, LOGIN E DADOS
// =================================================================



import { firebaseConfig } from './config'
export { firebaseConfig }

// =================================================================
// LOGIN
// =================================================================

interface FirebaseAtendente {
  uid: string
  nomeCompleto: string
  status: string
  role: 'usuario' | 'supervisor' | 'moderador' | 'admin'
  setor?: 'geral' | 'ti' | 'financeiro' | 'suporte' | 'comercial'
  email: string
  sgpUsername?: string
  avatarUrl?: string
}

// SDK removido por incompatibilidade com Service Worker (usamos REST API)

// =================================================================
// LOGIN
// =================================================================

export async function handleFirebaseLogin(email: string, password: string) {
  try {
    console.log('Extensão ATI: Autenticando via REST API...')

    // Clear caches on new login attempts
    await chrome.storage.session.remove(['cachedTemplates', 'cachedQuickReplies', 'cachedCategoriesOrder'])

    const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      signal: AbortSignal.timeout(8000),
    })

    console.log('Extensão ATI: Auth response status:', authResponse.status)
    const authData = await authResponse.json()
    console.log('Extensão ATI: Auth data:', JSON.stringify(authData).slice(0, 200))

    if (!authResponse.ok) {
      const errorMessages: Record<string, string> = {
        EMAIL_NOT_FOUND: 'Email não encontrado.',
        INVALID_PASSWORD: 'Senha incorreta.',
        INVALID_LOGIN_CREDENTIALS: 'Email ou senha incorretos.',
        TOO_MANY_ATTEMPTS_TRY_LATER: 'Muitas tentativas. Tente mais tarde.',
        USER_DISABLED: 'Seu acesso está bloqueado. Fale com o administrador.',
      }
      const code = authData?.error?.message ?? ''
      return { success: false, error: errorMessages[code] ?? 'Erro ao fazer login.' }
    }

    const uid = authData.localId
    const idToken = authData.idToken
    const refreshToken = authData.refreshToken as string
    // Firebase ID tokens expiram em 1h; guardamos com 5 min de margem
    const tokenExpiresAt = Date.now() + 55 * 60 * 1000

    const dbResponse = await fetch(`${firebaseConfig.databaseURL}atendentes.json?auth=${idToken}`)
    const atendentes = await dbResponse.json()

    if (!atendentes) {
      return { success: false, error: 'Nenhum atendente cadastrado no sistema.' }
    }

    let foundUsername: string | null = null
    let foundData: FirebaseAtendente | null = null

    for (const [username, data] of Object.entries(atendentes) as [string, FirebaseAtendente][]) {
      if (data.uid === uid) {
        foundUsername = username
        foundData = data
        break
      }
    }

    if (!foundUsername || !foundData) {
      return { success: false, error: 'Usuário não encontrado. Fale com o administrador.' }
    }

    if (foundData.status && foundData.status !== 'ativo') {
      return { success: false, error: 'Seu acesso está bloqueado. Fale com o administrador.' }
    }

    const session = {
      uid,
      username: foundUsername,
      nomeCompleto: foundData.nomeCompleto,
      role: foundData.role,
      setor: foundData.setor ?? 'geral',
      email: foundData.email,
      password,
      idToken,
      refreshToken,
      tokenExpiresAt,
      sgpUsername: foundData.sgpUsername ?? undefined,
      avatarUrl: foundData.avatarUrl ?? undefined,
    }

    console.log(`Extensão ATI: Login realizado — ${foundUsername} (${foundData.role})`)
    return { success: true, session }
  } catch (error: unknown) {
    console.error('Extensão ATI: Erro no login Firebase.', error)
    return { success: false, error: 'Erro de conexão. Verifique sua internet.' }
  }
}

// =================================================================
// REFRESH DE TOKEN — Renova o idToken sem precisar de senha
// =================================================================

export async function refreshIdToken(refreshToken: string): Promise<{ idToken: string; refreshToken: string; tokenExpiresAt: number } | null> {
  try {
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('Extensão ATI: Falha ao renovar token.', err)
      return null
    }

    const data = await res.json()
    const newIdToken = data.id_token as string
    const newRefreshToken = data.refresh_token as string
    const tokenExpiresAt = Date.now() + 55 * 60 * 1000

    // Limpa caches de dados para que sejam recarregados com o novo token
    await chrome.storage.session.remove(['cachedTemplates', 'cachedQuickReplies', 'cachedCategoriesOrder', 'cachedOccurrenceTypes'])

    console.log('Extensão ATI: Token renovado com sucesso.')
    return { idToken: newIdToken, refreshToken: newRefreshToken, tokenExpiresAt }
  } catch (error) {
    console.error('Extensão ATI: Erro ao renovar token.', error)
    return null
  }
}

// =================================================================
// TEMPLATES DE O.S
// =================================================================

import { OsTemplate, SgpOccurrenceType } from '../contentScript/sgp/types'
import { extractOptions } from './sgp/contracts'

// =================================================================
// TIPOS DE OCORRÊNCIA — Cache em memória + Firebase (1x/dia) + SGP fallback
// =================================================================

export async function getOccurrenceTypes(baseUrl: string, idToken: string): Promise<SgpOccurrenceType[]> {
  // Camada 1: cache de sessão (específico por baseUrl para evitar conflitos entre ambientes)
  const cacheKey = `occurrenceTypes_${baseUrl}`
  const cached = await chrome.storage.session.get(cacheKey)
  
  if (cached[cacheKey]) {
    console.log(`Extensão ATI: [Cache HIT] Tipos de ocorrência do cache de sessão (${cached[cacheKey].length} tipos). Revalidando em background...`)
    
    // Dispara a revalidação em background silenciosamente
    _revalidateOccurrenceTypes(baseUrl, idToken, cacheKey, cached[cacheKey]).catch((err) => {
      console.warn('Extensão ATI: Falha silenciosa ao revalidar tipos de ocorrência:', err)
    })
    
    return cached[cacheKey]
  }

  return await _fetchOccurrenceTypesInternal(baseUrl, idToken, cacheKey)
}

async function _revalidateOccurrenceTypes(baseUrl: string, idToken: string, cacheKey: string, oldTypes: SgpOccurrenceType[]): Promise<void> {
  const freshTypes = await _fetchOccurrenceTypesInternal(baseUrl, idToken, cacheKey, true)
  if (freshTypes && freshTypes.length > 0) {
    const changed = JSON.stringify(freshTypes) !== JSON.stringify(oldTypes)
    if (changed) {
      console.log(`Extensão ATI: Revalidação detectou alteração nos tipos de ocorrência (${freshTypes.length} tipos). Cache atualizado.`)
      await chrome.storage.session.set({ [cacheKey]: freshTypes })
    }
  }
}

async function _fetchOccurrenceTypesInternal(baseUrl: string, idToken: string, cacheKey: string, isSilent = false): Promise<SgpOccurrenceType[]> {
  const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
  const is53 = baseUrl.includes('201.158.20.53')
  const dbNode = is53 ? 'sgp_cache_53' : 'sgp_cache'

  try {
    // Camada 2: Firebase (agora seguro com auth != null)
    const fbRes = await fetch(`${firebaseConfig.databaseURL}${dbNode}.json?auth=${idToken}`, {
      signal: AbortSignal.timeout(5000),
    })
    const fbData = (await fbRes.json()) as {
      updatedAt?: string
      occurrenceTypes?: SgpOccurrenceType[]
    } | null

    if (fbData?.updatedAt === today && Array.isArray(fbData.occurrenceTypes) && fbData.occurrenceTypes.length > 0) {
      if (!isSilent) {
        console.log(`Extensão ATI: Tipos de ocorrência do Firebase em ${dbNode} (${fbData.occurrenceTypes.length} tipos, cache de hoje).`)
      }
      await chrome.storage.session.set({ [cacheKey]: fbData.occurrenceTypes })
      return fbData.occurrenceTypes
    }

    // Camada 3: Cache expirado/ausente — busca do SGP e atualiza Firebase
    if (!isSilent) {
      console.log('Extensão ATI: Cache de tipos expirado. Sincronizando com o SGP...')
    }
    const sgpRes = await fetch(`${baseUrl}/admin/atendimento/cliente/1/ocorrencia/add/`, {
      credentials: 'include',
      signal: AbortSignal.timeout(10000),
    })
    const sgpHtml = await sgpRes.text()
    const freshTypes = extractOptions(sgpHtml, /<select[^>]+id=['"]id_tipo['"][^>]*>([\s\S]*?)<\/select>/)

    if (freshTypes.length > 0) {
      // Atualiza Firebase (agora autorizado usando o idToken do usuário logado)
      fetch(`${firebaseConfig.databaseURL}${dbNode}.json?auth=${idToken}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updatedAt: today, occurrenceTypes: freshTypes }),
        signal: AbortSignal.timeout(5000),
      })
        .then(() => {
          if (!isSilent) console.log(`Extensão ATI: Firebase ${dbNode} atualizado com ${freshTypes.length} tipos.`)
        })
        .catch((writeErr) => {
          console.warn(`Extensão ATI: Falha ao atualizar ${dbNode} no Firebase.`, writeErr)
        })

      // Sincronização secundária em background para a outra base se possível
      const otherUrl = is53 ? 'http://201.158.20.35:8000' : 'http://201.158.20.53:8000'
      const otherDbNode = is53 ? 'sgp_cache' : 'sgp_cache_53'
      
      fetch(`${otherUrl}/admin/atendimento/cliente/1/ocorrencia/add/`, {
        credentials: 'include',
        signal: AbortSignal.timeout(6000),
      })
        .then(async (otherRes) => {
          if (otherRes.ok) {
            const html = await otherRes.text()
            const otherTypes = extractOptions(html, /<select[^>]+id=['"]id_tipo['"][^>]*>([\s\S]*?)<\/select>/)
            if (otherTypes.length > 0) {
              fetch(`${firebaseConfig.databaseURL}${otherDbNode}.json?auth=${idToken}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updatedAt: today, occurrenceTypes: otherTypes }),
                signal: AbortSignal.timeout(5000),
              })
                .then(() => {
                  if (!isSilent) console.log(`Extensão ATI: Sincronização secundária em background para ${otherDbNode} concluída com ${otherTypes.length} tipos.`)
                })
                .catch((err) => console.warn(`Extensão ATI: Erro ao salvar sync secundário para ${otherDbNode}:`, err))
            }
          }
        })
        .catch(() => {
          // Falha silenciosa normal se o usuário não estiver logado no outro SGP
        })

      await chrome.storage.session.set({ [cacheKey]: freshTypes })
      return freshTypes
    }

    // SGP também falhou — retorna o que havia no Firebase mesmo expirado
    if (Array.isArray(fbData?.occurrenceTypes) && fbData!.occurrenceTypes!.length > 0) {
      if (!isSilent) console.warn('Extensão ATI: SGP falhou. Usando tipos desatualizados do Firebase.')
      await chrome.storage.session.set({ [cacheKey]: fbData!.occurrenceTypes! })
      return fbData!.occurrenceTypes!
    }

    return []
  } catch (error) {
    if (!isSilent) console.error('Extensão ATI: Erro ao buscar tipos de ocorrência.', error)
    const cached = await chrome.storage.session.get(cacheKey)
    return cached[cacheKey] ?? []
  }
}

export async function getOsTemplates(username: string, idToken: string): Promise<OsTemplate[]> {
  const { cachedTemplates } = await chrome.storage.session.get('cachedTemplates')
  if (cachedTemplates) {
    console.log(`Extensão ATI: Retornando ${cachedTemplates.length} templates do cache de sessão.`)
    return cachedTemplates
  }
  try {
    // Busca templates, tipos 35 e tipos 53 em paralelo
    const [templatesRes, types35Res, types53Res] = await Promise.all([
      fetch(`${firebaseConfig.databaseURL}modelos_os/${username}.json?auth=${idToken}`),
      fetch(`${firebaseConfig.databaseURL}sgp_cache/occurrenceTypes.json?auth=${idToken}`),
      fetch(`${firebaseConfig.databaseURL}sgp_cache_53/occurrenceTypes.json?auth=${idToken}`),
    ])

    const data = await templatesRes.json()
    const rawTypes35 = await types35Res.json().catch(() => null)
    const rawTypes53 = await types53Res.json().catch(() => null)

    const templates = data ? (Object.values(data) as OsTemplate[]) : []
    const types35 = Array.isArray(rawTypes35) ? rawTypes35 : (rawTypes35 ? Object.values(rawTypes35) : [])
    const types53 = Array.isArray(rawTypes53) ? rawTypes53 : (rawTypes53 ? Object.values(rawTypes53) : [])

    // Enriquecimento dinâmico em tempo de execução para retrocompatibilidade
    templates.forEach((t) => {
      // Se tiver ID .35 mas faltar o nome amigável ou o ID .53, vamos preencher!
      if (t.occurrenceTypeId) {
        const found35 = (types35 as any[]).find((item) => item && String(item.id) === String(t.occurrenceTypeId))
        if (found35) {
          if (!t.occurrenceTypeName) {
            t.occurrenceTypeName = found35.text
          }
          if (!t.occurrenceTypeId_53) {
            const found53 = (types53 as any[]).find((item) => item && String(item.text).toLowerCase().trim() === String(found35.text).toLowerCase().trim())
            if (found53) {
              t.occurrenceTypeId_53 = found53.id
            }
          }
        }
      }
      
      // Vice-versa: se tiver ID .53 mas faltar o nome ou o ID .35
      if (t.occurrenceTypeId_53 && !t.occurrenceTypeId) {
        const found53 = (types53 as any[]).find((item) => item && String(item.id) === String(t.occurrenceTypeId_53))
        if (found53) {
          if (!t.occurrenceTypeName) {
            t.occurrenceTypeName = found53.text
          }
          const found35 = (types35 as any[]).find((item) => item && String(item.text).toLowerCase().trim() === String(found53.text).toLowerCase().trim())
          if (found35) {
            t.occurrenceTypeId = found35.id
          }
        }
      }
    })

    await chrome.storage.session.set({ cachedTemplates: templates })
    console.log(`Extensão ATI: ${templates.length} templates carregados e enriquecidos para ${username}`)
    return templates
  } catch (error) {
    console.error('Extensão ATI: Erro ao buscar templates e tipos.', error)
    return []
  }
}

// =================================================================
// QUICK REPLIES
// =================================================================

export async function getQuickReplies(username: string, idToken: string): Promise<{ replies: OsTemplate[]; categoriesOrder: string[] }> {
  const { cachedQuickReplies, cachedCategoriesOrder } = await chrome.storage.session.get(['cachedQuickReplies', 'cachedCategoriesOrder'])
  if (cachedQuickReplies && cachedCategoriesOrder) {
    console.log(`Extensão ATI: Retornando ${cachedQuickReplies.length} quick replies e ordem do cache de sessão.`)
    return { replies: cachedQuickReplies, categoriesOrder: cachedCategoriesOrder }
  }

  try {
    const [userRes, masterRes, orderRes] = await Promise.all([
      fetch(`${firebaseConfig.databaseURL}respostas/${username}.json?auth=${idToken}`),
      fetch(`${firebaseConfig.databaseURL}respostas/master.json?auth=${idToken}`),
      fetch(`${firebaseConfig.databaseURL}categorias_ordem/${username}.json?auth=${idToken}`)
    ])

    const userData = await userRes.json()
    const masterData = masterRes.ok ? await masterRes.json() : null
    const orderData = orderRes.ok ? await orderRes.json() : null

    const userReplies = Array.isArray(userData) ? userData : Object.values(userData ?? {})
    const masterReplies = masterData ? (Array.isArray(masterData) ? masterData : Object.values(masterData)) : []

    const all = [...masterReplies, ...userReplies].filter((r: OsTemplate) => r?.category === 'quick_reply' && r?.text && r?.title)
    const categoriesOrder = Array.isArray(orderData) ? orderData.filter(Boolean) : []

    await chrome.storage.session.set({ cachedQuickReplies: all, cachedCategoriesOrder: categoriesOrder })
    console.log(`Extensão ATI: ${all.length} quick replies e ${categoriesOrder.length} categorias em ordem carregadas para ${username}`)
    return { replies: all, categoriesOrder }
  } catch (error) {
    console.error('Extensão ATI: Erro ao buscar quick replies.', error)
    return { replies: [], categoriesOrder: [] }
  }
}
