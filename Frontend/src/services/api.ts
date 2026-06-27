import { auth } from './firebase'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function getToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('Usuário não autenticado')
  return user.getIdToken(false)
}

async function request(method: string, path: string, body?: any) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Erro ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: any) => request('POST', path, body),
  patch: (path: string, body?: any) => request('PATCH', path, body),
  put: (path: string, body?: any) => request('PUT', path, body),
  del: (path: string) => request('DELETE', path),
}
