import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createModule } from '@/api/client'
import { useAuth } from '@/context/auth-context-value'
import { useModules } from '@/hooks/use-modules'
import CreateButton from './CreateButton'

export function ModuleCreationDialog() {
  const [nameInvalid, setNameInvalid] = useState(false)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { state: authState } = useAuth()
  const { retry } = useModules()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (authState.status !== 'authenticated') {
      setError('Your session has expired. Please sign in again.')
      return
    }

    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('name') ?? '').trim()
    const key = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    if (!key) {
      setError('Enter a name with at least one letter or number.')
      return
    }

    if (key.length > 100) {
      setError('The module name is too long to create a module key.')
      return
    }

    setSubmitting(true)
    try {
      await createModule(authState.user.csrf_token, key, title)
      retry()
      setOpen(false)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to create module. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setError(null)
      }}
    >
      <DialogTrigger render={<CreateButton />} />
      <DialogContent className="sm:max-w-sm rounded-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl text-bold text-muted-navy">
              Create Module
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field className="pb-5">
              <Label htmlFor="name">Module Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter module name..."
                className="rounded-sm border-2 border-stone-200 bg-white"
                aria-invalid={nameInvalid}
                aria-describedby={nameInvalid ? 'name-error' : undefined}
                maxLength={200}
                required
                onInvalid={(event) => {
                  event.preventDefault()
                  setNameInvalid(true)
                }}
                onChange={(event) => {
                  if (event.currentTarget.validity.valid) {
                    setNameInvalid(false)
                  }
                }}
              />
              {nameInvalid && (
                <p
                  id="name-error"
                  role="alert"
                  className="rounded-sm bg-red-50 px-2 py-1 text-sm text-red-700"
                >
                  Please enter a module name.
                </p>
              )}
            </Field>
          </FieldGroup>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  variant="secondary"
                  className="rounded-sm text-muted-navy"
                  disabled={submitting}
                >
                  Cancel
                </Button>
              }
            />
            <Button
              type="submit"
              className="bg-light-blue rounded-sm"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
