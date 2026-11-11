/** Form for choosing a content file and previewing it before it is created. */

import {
  useId,
  useState,
  type ChangeEvent,
  type ComponentType,
  type SubmitEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CancelButton from './CancelButton'
import type { Module } from '@/types/types'
import { CreateFillButton } from './CreateButton'
import RawTextPreview from './RawTextPreview'
import type { PreviewProps, UploadedFile } from './upload-types'

// Files are read into memory in the browser, so a size cap keeps a wrong
// pick from freezing the page. Lessons and quizzes are far smaller.
const MAX_FILE_BYTES = 1_000_000

type FileUploadFormProps = {
  fileLabel: string
  extensions: string[]
  formatHint: string
  cancelTo: string
  // How the chosen file is shown; plain text unless the content has a richer view.
  Preview?: ComponentType<PreviewProps>
  module?: Module
  // Create stays disabled until the page supplies a handler. A rejection's
  // message is shown to the user.
  onCreate?: (file: UploadedFile) => Promise<unknown> | void
}

export default function FileUploadForm({
  fileLabel,
  extensions,
  formatHint,
  cancelTo,
  Preview = RawTextPreview,
  module,
  onCreate,
}: FileUploadFormProps) {
  const inputId = useId()
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Changing the key remounts the input, which is how a file input is cleared.
  const [inputKey, setInputKey] = useState(0)

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setUploaded(null)
    setError(null)
    setSubmitError(null)
    setNotice(null)
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

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!uploaded || !onCreate || submitting) return

    setSubmitting(true)
    setSubmitError(null)
    setNotice(null)
    try {
      await onCreate(uploaded)
      setNotice(`Created ${uploaded.name}.`)
      setUploaded(null)
      setInputKey((key) => key + 1)
    } catch (reason) {
      setSubmitError(
        reason instanceof Error
          ? reason.message
          : 'Could not create this. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor={inputId} className="text-lg font-bold text-muted-navy">
          {fileLabel}
        </Label>
        <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
          {formatHint}
        </p>
        <Input
          key={inputKey}
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
        <section aria-labelledby={`${inputId}-preview`} className="space-y-2">
          <h2
            id={`${inputId}-preview`}
            className="text-lg font-bold text-muted-navy"
          >
            Preview
          </h2>
          <p className="text-sm text-muted-foreground">{uploaded.name}</p>
          <Preview file={uploaded} module={module} />
        </section>
      )}

      {notice && (
        <p role="status" className="text-sm font-bold text-muted-navy">
          {notice}
        </p>
      )}
      {submitError && (
        <p role="alert" className="text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex gap-3">
        <Link to={cancelTo}>
          <CancelButton />
        </Link>
        <CreateFillButton
          type="submit"
          disabled={!uploaded || !onCreate || submitting}
        />
      </div>
    </form>
  )
}
