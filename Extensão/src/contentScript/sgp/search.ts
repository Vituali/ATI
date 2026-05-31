// =================================================================
// BUSCA DE CLIENTE NO SGP
// =================================================================

import { SgpClient, ClientData } from './types'

const AUTOCOMPLETE_URL = (baseUrl: string, type: string, term: string) => `${baseUrl}/public/autocomplete/ClienteAutocomplete?tconsulta=${type}&term=${term}`

// Executa uma busca na API de autocomplete do SGP
async function executeSearch(url: string): Promise<SgpClient[] | null> {
  try {
    const response = await fetch(url, { credentials: 'include' })
    const data: SgpClient[] = await response.json()
    console.log(`Extensão ATI: Busca em ${url} retornou ${data?.length ?? 0} resultado(s).`)
    return data?.length > 0 ? data : null
  } catch (error) {
    console.error(`Extensão ATI: Erro na busca — ${url}`, error)
    return null
  }
}

// Busca cliente por CPF/CNPJ, nome ou telefone (nessa ordem de prioridade)
export async function findClientInSgp(baseUrl: string, clientData: Pick<ClientData, 'cpfCnpj' | 'fullName' | 'phoneNumber'>): Promise<SgpClient[] | null> {
  const { cpfCnpj, fullName, phoneNumber } = clientData

  // 1. Tenta por CPF/CNPJ (mais preciso)
  if (cpfCnpj) {
    console.log('Extensão ATI: Buscando cliente por CPF/CNPJ...')
    const result = await executeSearch(AUTOCOMPLETE_URL(baseUrl, 'cpfcnpj', cpfCnpj))
    if (result) return result
  }

  // 2. Tenta por nome completo
  if (fullName && fullName !== 'Cliente') {
    console.log('Extensão ATI: Buscando cliente por nome...')
    const result = await executeSearch(AUTOCOMPLETE_URL(baseUrl, 'nome', encodeURIComponent(fullName)))
    if (result) return result
  }

  // 3. Tenta por telefone (remove DDI 55 e caracteres não numéricos)
  if (phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, '').replace(/^55/, '').substring(0, 11)
    console.log(`Extensão ATI: Buscando cliente por telefone — ${cleanPhone}`)
    const result = await executeSearch(AUTOCOMPLETE_URL(baseUrl, 'telefone', cleanPhone))
    if (result) return result
  }

  console.warn('Extensão ATI: Cliente não encontrado por nenhum critério.')
  return null
}
