// =================================================================
// SGP — BUSCA DE CLIENTES
// =================================================================

import { ClientData, SgpClient } from './constants'
import { performSilentLogin } from './auth'
import { getCpfCache, setCpfCache } from './cpfCache'

export async function executeSearch(url: string, isRetry = false): Promise<SgpClient[] | null> {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      signal: AbortSignal.timeout(8000),
    })

    const text = await response.text()

    // 1. Tenta fazer parse do texto como JSON.
    // Isso evita problemas onde o servidor manda JSON mas diz que é text/html no header.
    try {
      const data: SgpClient[] = JSON.parse(text)
      console.log(`Extensão ATI: Busca retornou ${data?.length ?? 0} resultado(s) — ${url}`)
      return data?.length > 0 ? data : null
    } catch (parseError) {
      // 2. Não é um JSON válido. Pode ser uma página HTML de login / sessão expirada.
      const redirectedToLogin = response.url.includes('/accounts/login')
      const isHtml = text.toLowerCase().includes('<html') || text.toLowerCase().includes('<!doctype html>')

      if (!isRetry && (redirectedToLogin || isHtml)) {
        console.warn(`Extensão ATI: Sessão expirada ou HTML detectado ao invés de JSON (${redirectedToLogin ? 'Redirecionamento' : 'HTML 200 OK'}) ao acessar ${url}. Tentando login silencioso...`)

        const baseUrl = new URL(url).origin
        const success = await performSilentLogin(baseUrl)

        if (success) {
          console.log('Extensão ATI: Login silencioso finalizado. Repetindo busca...')
          return await executeSearch(url, true)
        }
      }

      console.error(`Extensão ATI: Erro na resposta de busca (${response.status}) em ${url}. ${isRetry ? '(Após tentativa de login). ' : ''}A resposta não é um JSON válido. Início do conteúdo:`, text.substring(0, 300))
      return null
    }
  } catch (error) {
    console.error(`Extensão ATI: Erro na busca — ${url}`, error)
    return null
  }
}

export async function findClientInSgp(baseUrl: string, clientData: ClientData, uid?: string): Promise<SgpClient[] | null> {
  const { clientSgpId, clientSgpOrigin, cpfCnpj, fullName, phoneNumber } = clientData
  const base = `${baseUrl}/public/autocomplete/ClienteAutocomplete`

  if (clientSgpId && clientSgpOrigin === baseUrl) {
    console.log(`Extensão ATI: Cliente já identificado pelo SGP ID ${clientSgpId}`)
    return [{ id: clientSgpId, text: fullName || 'Cliente Identificado' }]
  }

  if (cpfCnpj) {
    // --- Nível 1/2/3: Consulta cache antes de bater na API ---
    const cached = await getCpfCache(cpfCnpj, baseUrl)
    if (cached) {
      return [{ id: cached, text: fullName || 'Cliente Identificado' }]
    }

    console.log('Extensão ATI: Buscando por CPF/CNPJ...')
    const result = await executeSearch(`${base}?tconsulta=cpfcnpj&term=${cpfCnpj}`)
    if (result) {
      // Salva no cache somente quando há resultado único e inequívoco
      if (result.length === 1) {
        await setCpfCache(cpfCnpj, result[0].id, baseUrl, uid)
      }
      return result
    }
  }

  // Paraleliza as buscas por Nome e Telefone se o CPF não retornar nada
  const [nameRes, phoneRes] = await Promise.all([fullName && fullName !== 'Cliente' ? executeSearch(`${base}?tconsulta=nome&term=${encodeURIComponent(fullName)}`) : null, phoneNumber ? executeSearch(`${base}?tconsulta=telefone&term=${phoneNumber.replace(/\D/g, '').replace(/^55/, '').substring(0, 11)}`) : null])

  if (nameRes || phoneRes) return nameRes || phoneRes

  console.warn('Extensão ATI: Cliente não encontrado por nenhum critério.')
  return null
}
