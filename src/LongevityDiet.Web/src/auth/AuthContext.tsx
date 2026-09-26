import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, setApiAccessToken } from '../lib/api'

export type SessionUser = {
  id: string
  email: string
  displayName: string
  role: string
  profileCompleted: boolean
}

type AuthSessionResponse = {
  accessToken: string
  accessTokenExpiresAt: string
  user: SessionUser
}

type RegisterInput = {
  email: string
  password: string
  displayName: string
}

type LoginInput = {
  email: string
  password: string
}

type AuthContextValue = {
  user: SessionUser | null
  isLoading: boolean
  login: (input: LoginInput) => Promise<SessionUser>
  register: (input: RegisterInput) => Promise<SessionUser>
  logout: () => Promise<void>
  updateSessionUser: (updates: Partial<SessionUser>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

let bootstrapPromise: Promise<AuthSessionResponse | null> | null = null

function loadInitialSession() {
  if (!bootstrapPromise) {
    bootstrapPromise = api
      .post<AuthSessionResponse>('/auth/refresh')
      .then((response) => response.data)
      .catch(() => null)
  }

  return bootstrapPromise
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const applySession = useCallback((session: AuthSessionResponse) => {
    setApiAccessToken(session.accessToken)
    setUser(session.user)
  }, [])

  const clearSession = useCallback(() => {
    setApiAccessToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    let active = true

    loadInitialSession()
      .then((session) => {
        if (!active) {
          return
        }

        if (session) {
          applySession(session)
        } else {
          clearSession()
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [applySession, clearSession])

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await api.post<AuthSessionResponse>('/auth/login', input)
      applySession(response.data)
      return response.data.user
    },
    [applySession],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await api.post<AuthSessionResponse>('/auth/register', input)
      applySession(response.data)
      return response.data.user
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/revoke')
    } finally {
      clearSession()
    }
  }, [clearSession])

  const updateSessionUser = useCallback((updates: Partial<SessionUser>) => {
    setUser((current) => (current ? { ...current, ...updates } : current))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      updateSessionUser,
    }),
    [user, isLoading, login, register, logout, updateSessionUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return value
}
