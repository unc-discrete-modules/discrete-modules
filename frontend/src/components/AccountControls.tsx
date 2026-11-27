import { useState } from 'react'
import { useAuth } from '@/context/auth-context-value'
import { Button } from './ui/button'
import { SquareText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { TutorialDialog } from './TutorialDialog'

export default function AccountControls() {
  const { state, logout } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  if (state.status !== 'authenticated') return <></>
  return (
    <header className="flex flex-wrap items-center justify-end gap-3 border-b p-4">
      <span>{state.user.email}</span>
      <TutorialLauncher key={state.user.id} userId={state.user.id} />
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

function TutorialLauncher({ userId }: { userId: number }) {
  const key = `dm:tutorial-seen:${userId}`
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(key) !== 'true'
    } catch {
      return true
    }
  })

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      try {
        localStorage.setItem(key, 'true')
      } catch {
        // Dismissal still works for this session when storage is unavailable.
      }
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="outline"
            className="rounded-full border-2 text-muted-navy"
            onClick={() => setOpen(true)}
          >
            <SquareText></SquareText>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-muted-navy font-semibold *:last:invisible">
          <p>Read Tutorial</p>
        </TooltipContent>
      </Tooltip>
      <TutorialDialog open={open} onOpenChange={handleOpenChange} />
    </>
  )
}
