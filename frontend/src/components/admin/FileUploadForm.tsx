/** Form for choosing a content file and previewing it before it is created. */

import { useId, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CancelButton from './CancelButton'
import { CreateFillButton } from './CreateButton'

export type UploadedFile = { name: string; text: string }

// Files are read into memory in the browser, so a size cap keeps a wrong
// pick from freezing the page. Lessons and quizzes are far smaller.
const MAX_FILE_BYTES = 1_000_000
const PREVIEW_CHARACTERS = 2_000

type FileUploadFormProps = {
  fileLabel: string
  extensions: string[]
  formatHint: string
  cancelTo: string
  // Create stays disabled until the page supplies a handler.
  onCreate?: (file: UploadedFile) => void
}

export default function FileUploadForm({
  fileLabel,
  extensions,
  formatHint,
  cancelTo,
  onCreate,
}: FileUploadFormProps) {
  const inputId = useId()
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setUploaded(null)
    setError(null)
    if (!file) return

    const name = file.name.toLowerCase()
    if (!extensions.some((extension) => name.endsWith(extension))) {
      setError(`Choose a ${extensions.join(' or ')} file.`)
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('That file is too large.')
      return
    }

    try {
      setUploaded({ name: file.name, text: await file.text() })
    } catch {
      setError('Could not read that file. Please try again.')
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploaded && onCreate) onCreate(uploaded)
  }

  const truncated =
    uploaded !== null && uploaded.text.length > PREVIEW_CHARACTERS

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor={inputId} className="text-lg font-bold text-muted-navy">
          {fileLabel}
        </Label>
        <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
          {formatHint}
        </p>
        <Input
          id={inputId}
          type="file"
          accept={extensions.join(',')}
          aria-describedby={`${inputId}-hint`}
          aria-invalid={error !== null}
          className="h-auto cursor-pointer rounded-sm border-3 border-stone-200 bg-white py-2 file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border-3 file:border-light-blue file:bg-lightest-blue file:px-3 file:text-muted-navy"
          onChange={handleChange}
        />
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      {uploaded && (
        <div className="space-y-2">
          <p className="font-bold text-muted-navy">{uploaded.name}</p>
          <pre
            aria-label="File preview"
            tabIndex={0}
            className="max-h-64 overflow-auto rounded-sm border-3 border-stone-200 bg-white p-3 text-sm whitespace-pre-wrap"
          >
            {truncated
              ? `${uploaded.text.slice(0, PREVIEW_CHARACTERS)}\n…`
              : uploaded.text}
          </pre>
        </div>
      )}

      <div className="flex gap-3">
        <Link to={cancelTo}>
          <CancelButton />
        </Link>
        <CreateFillButton type="submit" disabled={!uploaded || !onCreate} />
      </div>
    </form>
  )
}
