/** Button for module, lesson, quiz deletion. Use with DeleteConfirmation. */

import { Trash } from 'lucide-react'
import { Button } from '../ui/button'
import { useState, type RefObject } from 'react'
import DeleteConfirmation from './DeleteConfirmation'
import { deleteModule } from '@/api/client'
import { useAuth } from '@/context/auth-context-value'
import { useModules } from '@/hooks/use-modules'

type DeleteButtonProps = {
  moduleId: number
  anchor: RefObject<HTMLDivElement | null>
}

export default function DeleteButton({ moduleId, anchor }: DeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { state: authState } = useAuth()
  const { retry } = useModules()

  async function handleDelete() {
    if (authState.status !== 'authenticated') {
      setError('Your session has expired. Please sign in again.')
      return
    }

    setDeleting(true)
    setError(null)
    try {
      await deleteModule(moduleId, authState.user.csrf_token)
      retry()
      setOpen(false)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to delete module. Please try again.',
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DeleteConfirmation
      deleteType="module"
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setError(null)
      }}
      onConfirm={handleDelete}
      confirming={deleting}
      error={error}
      anchor={anchor}
      trigger={
        <Button className="w-full truncate rounded-md bg-delete-red font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:bg-delete-red hover:saturate-120 hover:scale-102">
          Delete
          <Trash />
        </Button>
      }
    />
  )
}
