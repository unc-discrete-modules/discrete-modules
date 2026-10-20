import { useState } from 'react'
import { useAuth } from '@/context/auth-context-value'
import { Button } from './ui/button'

export default function AccountControls() {
  const { state, logout } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  if (state.status !== 'authenticated') return null
  return (
    <header className="flex flex-wrap items-center justify-end gap-3 border-b p-4">
      <span>{state.user.email}</span>
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setError('')
          try {
            await logout()
          } catch {
            setError('Could not sign out. Please try again.')
            setPending(false)
          }
        }}
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </Button>
      {error && <p role="alert">{error}</p>}
    </header>
  )
}
