export function createAbortSignal(timeoutMs: number): AbortSignal {
  if ('AbortSignal' in globalThis && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}
