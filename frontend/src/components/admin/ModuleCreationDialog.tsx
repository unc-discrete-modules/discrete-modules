import { useState } from 'react'
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
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CreateButton from './CreateButton'

function onSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const formData = new FormData(event.currentTarget)

  console.log({
    name: formData.get('name'),
    coverImage: formData.get('coverImage'),
  })
}

export function ModuleCreationDialog() {
  const [nameInvalid, setNameInvalid] = useState(false)
  const [coverImageInvalid, setCoverImageInvalid] = useState(false)

  return (
    <Dialog>
      <DialogTrigger render={<CreateButton />} />
      <DialogContent className="sm:max-w-sm rounded-md">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl text-bold text-muted-navy">
              Create Module
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="name">Module Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter module name..."
                className="rounded-sm border-2 border-stone-200 bg-white"
                aria-invalid={nameInvalid}
                aria-describedby={nameInvalid ? 'name-error' : undefined}
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
            <Field>
              <Label htmlFor="cover-image">Cover Image</Label>
              <Input
                id="cover-image"
                name="coverImage"
                type="url"
                placeholder="Enter a link to an image..."
                className="rounded-sm border-2 border-stone-200 bg-white aria-invalid:border-stone-200 aria-invalid:ring-0"
                aria-invalid={coverImageInvalid}
                aria-describedby={
                  coverImageInvalid
                    ? 'cover-image-description cover-image-error'
                    : 'cover-image-description'
                }
                onInvalid={(event) => {
                  event.preventDefault()
                  setCoverImageInvalid(true)
                }}
                onChange={(event) => {
                  if (event.currentTarget.validity.valid) {
                    setCoverImageInvalid(false)
                  }
                }}
              />
              {coverImageInvalid && (
                <p
                  id="cover-image-error"
                  role="alert"
                  className="rounded-sm bg-red-50 px-2 py-1 text-sm text-red-700"
                >
                  Please enter a URL.
                </p>
              )}
              <FieldDescription id="cover-image-description">
                If you do not link an image, the cover will be solid blue.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  variant="secondary"
                  className="rounded-sm text-muted-navy"
                >
                  Cancel
                </Button>
              }
            />
            <Button type="submit" className="bg-light-blue rounded-sm">
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
