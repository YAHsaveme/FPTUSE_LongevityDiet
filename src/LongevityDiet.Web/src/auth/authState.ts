import { createContext, useContext } from 'react'

export type SessionUser = {
  id: string
  email: string
  displayName: string
  role: string
  profileCompleted: boolean
}

export type RegisterInput = {
  email: string
  password: string
  displayName: string
}

export type LoginInput = {
  email: string
  password: string
}

export type AuthContextValue = {
  user: SessionUser | null
  isLoading: boolean
  login: (input: LoginInput) => Promise<SessionUser>
  register: (input: RegisterInput) => Promise<SessionUser>
  logout: () => Promise<void>
  updateSessionUser: (updates: Partial<SessionUser>) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return value
}
