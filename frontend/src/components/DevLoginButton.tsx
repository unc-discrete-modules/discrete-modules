import { useState } from 'react'
import { apiFetch } from '@/api'
import { useAuth } from '@/context/auth-context-value'
import { Button } from './ui/button'

export default function DevLoginButton({ admin = false }: { admin?: boolean }) {
  const { retry } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  return (
    <>
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setError('')
          try {
            const response = await apiFetch(
              admin ? '/auth/dev-login?admin=true' : '/auth/dev-login',
              {
                method: 'POST',
              },
            )
            if (!response.ok) throw new Error('Demo login failed')
            retry()
          } catch {
            setError(
              `Could not sign in as the demo ${admin ? 'admin' : 'user'}. Please try again later.`,
            )
            setPending(false)
          }
        }}
      >
        {pending
          ? 'Signing in…'
          : `Sign in as demo ${admin ? 'admin' : 'user'}`}
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  )
}
