import { useState } from 'react'
import { useAuth } from '@/context/auth-context-value'
import { Button } from './ui/button'
import { SquareText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export default function AccountControls() {
  const { state, logout } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  if (state.status !== 'authenticated') return null
  return (
    <header className="flex flex-wrap items-center justify-end gap-3 border-b p-4">
      <span>{state.user.email}</span>
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="outline"
            className="rounded-full border-2 text-muted-navy"
          >
            <SquareText></SquareText>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-muted-navy font-semibold *:last:invisible">
          <p>Read Tutorial</p>
        </TooltipContent>
      </Tooltip>
      <Link to="/faq">
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="outline"
              className="rounded-full text-muted-navy font-semibold"
            >
              ?
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-muted-navy font-semibold *:last:invisible">
            <p>FAQ</p>
          </TooltipContent>
        </Tooltip>
      </Link>
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
        {pending ? 'Signing out…' : 'Sign Out'}
      </Button>
      {error && <p role="alert">{error}</p>}
    </header>
  )
}
