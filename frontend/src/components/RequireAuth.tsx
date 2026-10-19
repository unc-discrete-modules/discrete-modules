import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/auth-context-value'
import { Button } from '@/components/ui/button'

export default function RequireAuth() {
  const { state, retry } = useAuth()
  const location = useLocation()
  if (state.status === 'loading')
    return <p role="status">Checking your session…</p>
  if (state.status === 'unavailable') {
    return (
      <main className="p-6">
        <p role="alert">We couldn’t check your session. Please try again.</p>
        <Button onClick={retry}>Try again</Button>
      </main>
    )
  }
  if (state.status === 'anonymous') {
    const returnTo = location.pathname + location.search + location.hash
    return (
      <Navigate
        to={`/login?${new URLSearchParams({ return_to: returnTo })}`}
        replace
      />
    )
  }
  return <Outlet />
}
