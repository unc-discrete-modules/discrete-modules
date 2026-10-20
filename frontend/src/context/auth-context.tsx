import { useEffect, useState } from 'react'
import { AuthContext, type AuthState, type User } from './auth-context-value'
import { apiFetch, SESSION_EXPIRED } from '@/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    user: null,
  })
  const [version, setVersion] = useState(0)
  const [loggedOut, setLoggedOut] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/auth/me', {
      signal: controller.signal,
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (response.status === 401) {
          return { status: 'anonymous', user: null } as const
        }
        if (!response.ok) throw new Error('Session check failed')
        const user: User = await response.json()
        return { status: 'authenticated', user } as const
      })
      .then((next) => {
        if (!controller.signal.aborted) setState(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'unavailable', user: null })
        }
      })
    const expired = () => {
      controller.abort()
      setState({ status: 'anonymous', user: null })
    }
    window.addEventListener(SESSION_EXPIRED, expired)
    return () => {
      controller.abort()
      window.removeEventListener(SESSION_EXPIRED, expired)
    }
  }, [version])

  async function logout() {
    if (state.status !== 'authenticated') return
    const response = await apiFetch('/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': state.user.csrf_token },
    })
    if (!response.ok && response.status !== 401) {
      throw new Error('Could not sign out. Please try again.')
    }
    setLoggedOut(true)
    setState({ status: 'anonymous', user: null })
  }

  return (
    <AuthContext.Provider
      value={{
        state,
        loggedOut,
        retry: () => {
          setState({ status: 'loading', user: null })
          setVersion((value) => value + 1)
        },
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
