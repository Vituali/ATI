// =================================================================
// SGP — BUSCA DE CLIENTES
// =================================================================

import { ClientData, SgpClient } from './constants'
import { performSilentLogin } from './auth'
import { getCpfCache, setCpfCache } from './cpfCache'

const getTs = () => `[${new Date().toLocaleTimeString('pt-BR')}]`

export async function executeSearch(url: string, isRetry = false): Promise<SgpClient[] | null> {
  const tStart = performance.now()
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
      const tEnd = performance.now()
      console.log(`Extensão ATI: Busca retornou ${data?.length ?? 0} resultado(s) — ${url} (levou ${(tEnd - tStart).toFixed(1)}ms)`)
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
  const tStart = performance.now()
  const result = await _findClientInSgpInternal(baseUrl, clientData, uid)
  const tEnd = performance.now()
  console.log(`${getTs()} ⏱️ [ATI Perf] Busca de cliente em ${baseUrl} levou ${(tEnd - tStart).toFixed(1)} ms. Encontrados: ${result?.length ?? 0}`)
  return result
}

async function _findClientInSgpInternal(baseUrl: string, clientData: ClientData, uid?: string): Promise<SgpClient[] | null> {
  const { clientSgpId, clientSgpOrigin, cpfCnpj, fullName, phoneNumber } = clientData
  const base = `${baseUrl}/public/autocomplete/ClienteAutocomplete`

  if (clientSgpId && clientSgpOrigin === baseUrl) {
    console.log(`Extensão ATI: Cliente já identificado pelo SGP ID ${clientSgpId}`)
    return [{ id: clientSgpId, text: fullName || 'Cliente Identificado' }]
  }

  // 1. Busca por CPF/CNPJ (Mais específico e seguro)
  if (cpfCnpj) {
    const cached = await getCpfCache(cpfCnpj, baseUrl)
    if (cached) {
      return [{ id: cached, text: fullName || 'Cliente Identificado' }]
    }

    console.log('Extensão ATI: Buscando por CPF/CNPJ...')
    const result = await executeSearch(`${base}?tconsulta=cpfcnpj&term=${cpfCnpj}`)
    if (result && result.length > 0) {
      // Salva no cache somente quando há resultado único e inequívoco
      if (result.length === 1) {
        await setCpfCache(cpfCnpj, result[0].id, baseUrl, uid)
      }
      return result
    }
  }

  // 2. Busca por Nome (Segunda mais específica)
  if (fullName && fullName !== 'Cliente') {
    console.log('Extensão ATI: Buscando por Nome...')
    const result = await executeSearch(`${base}?tconsulta=nome&term=${encodeURIComponent(fullName)}`)
    if (result && result.length > 0) {
      return result
    }
  }

  // 3. Busca por Telefone (Fallback final)
  if (phoneNumber) {
    console.log('Extensão ATI: Buscando por Telefone...')
    const cleanPhone = phoneNumber.replace(/\D/g, '').replace(/^55/, '').substring(0, 11)
    const result = await executeSearch(`${base}?tconsulta=telefone&term=${cleanPhone}`)
    if (result && result.length > 0) {
      return result
    }
  }

  console.warn('Extensão ATI: Cliente não encontrado por nenhum critério.')
  return null
}
