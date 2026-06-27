import { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '../services/firebase'
import { api } from '../services/api'
import { syncWithExtension } from '../services/auth'
import type { Role, Setor, Section } from '../services/permissions'

export interface UserProfile {
  id: string
  uid: string
  email: string
  username: string
  nomeCompleto: string
  role: Role
  setor: Setor
  status: 'ativo' | 'inativo'
  sgpUsername?: string
  avatarUrl?: string
  customBg?: string
  customAllowedSections?: Section[]
}

interface UseUserReturn {
  user: UserProfile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

async function fetchProfile(uid: string): Promise<UserProfile> {
  const all = await api.get('/api/atendentes') as any[]
    const found = all.find((a: any) => a.uid === uid)
    if (!found) throw new Error('Perfil não encontrado. Tente fazer login novamente.')
    return {
      id: found.id,
      uid: found.uid,
    email: found.email,
    username: found.username,
    nomeCompleto: found.nomeCompleto,
    role: found.role as Role,
    setor: found.setor as Setor,
    status: found.status ?? 'ativo',
    sgpUsername: found.sgpUsername ?? undefined,
    avatarUrl: found.avatarUrl ?? undefined,
    customBg: found.customBg ?? undefined,
    customAllowedSections: found.customAllowedSections || [],
  }
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) return
    try {
      const profile = await fetchProfile(currentUser.uid)
      if (profile.status !== 'ativo') {
        await auth.signOut()
        setUser(null)
        setError('Sua conta está inativa. Contate o administrador.')
        return
      }
      if (currentUser.email && profile.email !== currentUser.email) {
        await api.patch(`/api/atendentes/me`, { email: currentUser.email })
        profile.email = currentUser.email
      }
      setUser(profile)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      setUser(null)
    }
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }

      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      try {
        await refresh()
        pollRef.current = setInterval(refresh, 30000)
      } finally {
        setLoading(false)
      }

      syncWithExtension(firebaseUser)
    })

    return () => {
      unsubscribeAuth()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  return { user, loading, error, refresh }
}
