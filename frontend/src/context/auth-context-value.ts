import { createContext, useContext } from 'react'

export type User = {
  id: number
  email: string
  onyen: string | null
  display_name: string | null
  role: 'student' | 'admin'
  csrf_token: string
}
export type AuthState =
  | { status: 'loading' | 'anonymous' | 'unavailable'; user: null }
  | { status: 'authenticated'; user: User }

export const AuthContext = createContext<{
  state: AuthState
  loggedOut: boolean
  retry: () => void
  logout: () => Promise<void>
} | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requires AuthProvider')
  return context
}
