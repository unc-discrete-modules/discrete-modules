/** Writes a lesson in the browser, with a preview of what students will see. */

import { useDeferredValue, useId, useState, type SubmitEvent } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isHttpUrl, lessonKeyFromTitle } from '@/lib/lesson-content'
import {
  MAX_KEY_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_VIDEO_URL_LENGTH,
  lessonProblems,
  toLessonInput,
} from '@/lib/lesson-draft'
import type { LessonInput, Module } from '@/types/types'
import CancelButton from './CancelButton'
import { CreateFillButton } from './CreateButton'
import LessonPreviewBody from './LessonPreviewBody'

type LessonBuilderProps = {
  module: Module
  cancelTo: string
  onSave: (lesson: LessonInput) => Promise<void>
}

function Problem({ id, children }: { id: string; children?: string }) {
  return children ? (
    <p id={id} className="text-sm text-red-700">
      {children}
    </p>
  ) : null
}

export default function LessonBuilder({
  module,
  cancelTo,
  onSave,
}: LessonBuilderProps) {
  const baseId = useId()
  const [title, setTitle] = useState('')
  // The key follows the title until the admin edits it. It is permanent once
  // the lesson exists, so it is shown instead of being hidden.
  const [keyOverride, setKeyOverride] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [body, setBody] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const key = keyOverride ?? lessonKeyFromTitle(title)
  const draft = { title, key, videoUrl, body }
  const problems = attempted ? lessonProblems(draft) : null

  // Rendering Markdown and math on every keystroke can lag, so the preview
  // trails what is typed.
  const previewTitle = useDeferredValue(title)
  const previewBody = useDeferredValue(body)
  const previewVideo = useDeferredValue(videoUrl.trim())
  const showPreview = previewTitle.trim() !== '' || previewBody.trim() !== ''

  // Typing after a lesson was created starts the next one.
  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setNotice(null)
      setter(value)
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setAttempted(true)
    setError(null)
    setNotice(null)

    const found = lessonProblems(draft)
    if (found) {
      setError('Fix the highlighted fields.')
      const firstInvalid = (['title', 'key', 'videoUrl', 'body'] as const).find(
        (field) => found[field],
      )
      document.getElementById(`${baseId}-${firstInvalid}`)?.focus()
      return
    }

    setSubmitting(true)
    try {
      await onSave(toLessonInput(draft))
      setNotice(`Created "${title.trim()}".`)
      setTitle('')
      setKeyOverride(null)
      setVideoUrl('')
      setBody('')
      setAttempted(false)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not create the lesson. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Lesson builder"
      className="max-w-4xl space-y-5"
    >
      {/* Locked while saving: the fields are cleared once the save finishes,
          which would discard anything typed meanwhile. */}
      <fieldset disabled={submitting} className="min-w-0 space-y-5">
        <div className="space-y-1">
          <Label
            htmlFor={`${baseId}-title`}
            className="text-lg font-bold text-muted-navy"
          >
            Title
          </Label>
          <Input
            id={`${baseId}-title`}
            aria-describedby={`${baseId}-title-problem`}
            aria-invalid={Boolean(problems?.title)}
            maxLength={MAX_TITLE_LENGTH}
            className="h-auto rounded-sm border-3 border-stone-200 bg-white py-2"
            value={title}
            onChange={(event) => edit(setTitle)(event.target.value)}
          />
          <Problem id={`${baseId}-title-problem`}>{problems?.title}</Problem>
        </div>

        <div className="space-y-1">
          <Label
            htmlFor={`${baseId}-key`}
            className="text-lg font-bold text-muted-navy"
          >
            Lesson key
          </Label>
          <p
            id={`${baseId}-key-hint`}
            className="text-sm text-muted-foreground"
          >
            A permanent name for the lesson, filled in from the title. Use
            lowercase letters and numbers joined by hyphens.
          </p>
          <Input
            id={`${baseId}-key`}
            aria-describedby={`${baseId}-key-hint ${baseId}-key-problem`}
            aria-invalid={Boolean(problems?.key)}
            maxLength={MAX_KEY_LENGTH}
            className="h-auto rounded-sm border-3 border-stone-200 bg-white py-2 font-mono"
            value={key}
            onChange={(event) => edit(setKeyOverride)(event.target.value)}
          />
          <Problem id={`${baseId}-key-problem`}>{problems?.key}</Problem>
        </div>

        <div className="space-y-1">
          <Label
            htmlFor={`${baseId}-videoUrl`}
            className="text-lg font-bold text-muted-navy"
          >
            Video link <span className="text-sm font-normal">(optional)</span>
          </Label>
          <Input
            id={`${baseId}-videoUrl`}
            type="url"
            aria-describedby={`${baseId}-videoUrl-problem`}
            aria-invalid={Boolean(problems?.videoUrl)}
            maxLength={MAX_VIDEO_URL_LENGTH}
            className="h-auto rounded-sm border-3 border-stone-200 bg-white py-2"
            value={videoUrl}
            onChange={(event) => edit(setVideoUrl)(event.target.value)}
          />
          <Problem id={`${baseId}-videoUrl-problem`}>
            {problems?.videoUrl}
          </Problem>
        </div>

        <div className="space-y-1">
          <Label
            htmlFor={`${baseId}-body`}
            className="text-lg font-bold text-muted-navy"
          >
            Lesson
          </Label>
          <p
            id={`${baseId}-body-hint`}
            className="text-sm text-muted-foreground"
          >
            Markdown, with LaTeX math between dollar signs, such as $x^2$. Start
            headings at ##, because the title is the lesson&apos;s heading. A
            section titled &quot;## Learning Objectives&quot; is shown as the
            overview.
          </p>
          <Textarea
            id={`${baseId}-body`}
            aria-describedby={`${baseId}-body-hint ${baseId}-body-problem`}
            aria-invalid={Boolean(problems?.body)}
            className="h-80 resize-y rounded-sm border-3 border-stone-200 bg-white font-mono"
            value={body}
            onChange={(event) => edit(setBody)(event.target.value)}
          />
          <Problem id={`${baseId}-body-problem`}>{problems?.body}</Problem>
        </div>
      </fieldset>

      {showPreview && (
        <section aria-labelledby={`${baseId}-preview`} className="space-y-2">
          <h2
            id={`${baseId}-preview`}
            className="text-lg font-bold text-muted-navy"
          >
            Preview
          </h2>
          <LessonPreviewBody
            title={previewTitle.trim() || 'Untitled lesson'}
            videoUrl={isHttpUrl(previewVideo) ? previewVideo : null}
            body={previewBody}
            moduleId={module.id}
            // The lesson is added after the module's existing ones.
            lessonNumber={module.lessons.length + 1}
          />
        </section>
      )}

      {notice && (
        <p role="status" className="text-sm font-bold text-muted-navy">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Link to={cancelTo}>
          <CancelButton />
        </Link>
        <CreateFillButton type="submit" disabled={submitting} />
      </div>
    </form>
  )
}
