// Wrapper tipado para chrome.storage.local/session
// Útil para quando migrar para @types/chrome >= 0.1.x
// Uso: const { key } = await storageGet<{ key: Type }>('key')

// Wrappers tipados para chrome.storage.local/session
// Útil quando migrar para @types/chrome >= 0.1.x (NoInferX quebra .get())
// Uso: const { myKey } = await storageGet<{ myKey: MyType }>('myKey')

export async function storageGet<T = Record<string, any>>(keys?: string | string[] | null): Promise<T> {
  return chrome.storage.local.get(keys as any) as Promise<T>
}

export async function storageSet(items: Record<string, any>): Promise<void> {
  return chrome.storage.local.set(items)
}

export async function storageSessionGet<T = Record<string, any>>(keys?: string | string[] | null): Promise<T> {
  return chrome.storage.session.get(keys as any) as Promise<T>
}

export async function storageSessionSet(items: Record<string, any>): Promise<void> {
  return chrome.storage.session.set(items)
}
