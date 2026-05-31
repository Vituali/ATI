// =================================================================
// SGP — CACHE INTELIGENTE CPF/CNPJ → clienteId
// =================================================================
//
// Estrutura em chrome.storage.session:
// {
//   "cpfCache": {
//     "07629396724": {
//       "clienteId": "19433",
//       "uid": "51512970",
//       "createdAt": 1713000000000
//     }
//   }
// }
//
// Níveis de expiração:
//   Nível 1 — Encerramento do O.S    → deleteCpfCacheEntry(cpf)
//   Nível 2 — (Opcional) Limpeza manual por UID → deleteCpfCacheByUid(uid)
//   Nível 3 — Fallback por tempo     → TTL de 2 horas (verificado no get)

const CACHE_KEY = 'cpfCache'
const TTL_MS = 2 * 60 * 60 * 1000 // 2 horas

export interface CpfCacheEntry {
  clienteId: string
  baseUrl: string
  uid: string
  createdAt: number
}

type CpfCacheStore = Record<string, CpfCacheEntry>

async function readStore(): Promise<CpfCacheStore> {
  const result = await chrome.storage.session.get(CACHE_KEY)
  return (result[CACHE_KEY] as CpfCacheStore) ?? {}
}

async function writeStore(store: CpfCacheStore): Promise<void> {
  await chrome.storage.session.set({ [CACHE_KEY]: store })
}

// ---------------------------------------------------------------------------
// GET — retorna clienteId se existir e não expirou (Nível 3)
// ---------------------------------------------------------------------------
export async function getCpfCache(cpf: string, currentBaseUrl: string): Promise<string | null> {
  const store = await readStore()
  const entry = store[cpf]
  if (!entry) return null

  // Além do TTL, verifica se o ambiente (SGP_DNS, .35, .53) é o mesmo do cache
  const isDifferentEnv = entry.baseUrl && entry.baseUrl !== currentBaseUrl
  const isExpired = Date.now() - entry.createdAt > TTL_MS

  if (isExpired || isDifferentEnv) {
    if (isExpired) console.log(`Extensão ATI: Cache CPF expirado para ${cpf}.`)
    if (isDifferentEnv) console.log(`Extensão ATI: Cache CPF de outro ambiente (${entry.baseUrl} vs ${currentBaseUrl}).`)

    delete store[cpf]
    await writeStore(store)
    return null
  }

  console.log(`Extensão ATI: Cache CPF hit — ${cpf} → clienteId ${entry.clienteId}`)
  return entry.clienteId
}

// ---------------------------------------------------------------------------
// SET — salva/atualiza a entrada do cache
// ---------------------------------------------------------------------------
export async function setCpfCache(cpf: string, clienteId: string, baseUrl: string, uid?: string): Promise<void> {
  const store = await readStore()
  store[cpf] = { clienteId, baseUrl, uid: uid || '', createdAt: Date.now() }
  await writeStore(store)
  console.log(`Extensão ATI: Cache CPF salvo — ${cpf} → clienteId ${clienteId} (${baseUrl})${uid ? ` (uid: ${uid})` : ''}`)
}

// ---------------------------------------------------------------------------
// Nível 1 — Encerramento do O.S: remove entrada de um CPF específico
// ---------------------------------------------------------------------------
export async function deleteCpfCacheEntry(cpf: string): Promise<void> {
  const store = await readStore()
  if (store[cpf]) {
    delete store[cpf]
    await writeStore(store)
    console.log(`Extensão ATI: Cache CPF removido por encerramento de O.S — ${cpf}`)
  }
}

// ---------------------------------------------------------------------------
// Nível 2 — Mudança de UID: remove todas as entradas associadas ao uid
// ---------------------------------------------------------------------------
export async function deleteCpfCacheByUid(uid: string): Promise<void> {
  const store = await readStore()
  let changed = false

  for (const cpf of Object.keys(store)) {
    if (store[cpf].uid === uid) {
      delete store[cpf]
      changed = true
      console.log(`Extensão ATI: Cache CPF removido por mudança de UID (${uid}) — ${cpf}`)
    }
  }

  if (changed) await writeStore(store)
}
