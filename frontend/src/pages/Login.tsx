import LoginCard from '@/components/LoginCard'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/auth-context-value'
import DevLoginButton from '@/components/DevLoginButton'
import { Button } from '@/components/ui/button'

export default function Login() {
  const { state, loggedOut, retry } = useAuth()
  const [params] = useSearchParams()
  const requested = params.get('return_to') || '/'
  const returnTo =
    requested.startsWith('/') &&
    !requested.startsWith('//') &&
    !requested.includes('\\') &&
    !requested.startsWith('/login')
      ? requested
      : '/'
  if (state.status === 'authenticated') {
    return <Navigate to={returnTo} replace />
  }
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginCard>
          {loggedOut && (
            <p role="status">
              You’re signed out of Discrete Modules. Your UNC single sign-on
              session may still be active.
            </p>
          )}
          {params.has('error') && (
            <p role="alert">
              {params.get('error') === 'sso_unavailable'
                ? 'UNC sign-in is currently unavailable. Please try again later.'
                : 'We couldn’t complete UNC sign-in. Please try again.'}
            </p>
          )}
          {state.status === 'loading' ? (
            <p role="status">Checking your session…</p>
          ) : state.status === 'unavailable' ? (
            <>
              <p role="alert">We couldn’t check your session.</p>
              <Button onClick={retry}>Try again</Button>
            </>
          ) : (
            <a
              className="rounded-md bg-primary px-4 py-3 text-center font-medium text-primary-foreground"
              href={`/api/auth/login?${new URLSearchParams({ return_to: returnTo })}`}
            >
              Sign in with UNC
            </a>
          )}
          {state.status === 'anonymous' && <DevLoginButton />}
          {state.status === 'anonymous' && import.meta.env.DEV && (
            <DevLoginButton admin />
          )}
        </LoginCard>
      </div>
    </main>
  )
}
