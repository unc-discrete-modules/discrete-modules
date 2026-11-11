/** Edits an existing lesson: its title, video, and Markdown, with a preview. */

import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react'
import { updateLesson } from '@/api/client'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isHttpUrl } from '@/lib/lesson-content'
import {
  MAX_TITLE_LENGTH,
  MAX_VIDEO_URL_LENGTH,
  lessonProblems,
} from '@/lib/lesson-draft'
import type { LessonResponse, Module } from '@/types/types'
import BackToModuleLink from './BackToModuleLink'
import LessonPreviewBody from './LessonPreviewBody'

type Fields = { title: string; videoUrl: string; body: string }
type View = 'edit' | 'preview'

type LessonEditorProps = {
  lesson: LessonResponse
  // Used for the lesson's number in the preview; null until it has loaded.
  module: Module | null
  csrfToken: string
}

const fieldsOf = (lesson: LessonResponse): Fields => ({
  title: lesson.title,
  videoUrl: lesson.video_url ?? '',
  body: lesson.body,
})

const VIEWS: [View, string][] = [
  ['edit', 'Edit'],
  ['preview', 'Preview'],
]

function Problem({ id, children }: { id: string; children?: string }) {
  return children ? (
    <p id={id} className="text-sm text-red-700">
      {children}
    </p>
  ) : null
}

export default function LessonEditor({
  lesson,
  module,
  csrfToken,
}: LessonEditorProps) {
  const baseId = useId()
  // What the server has, so unsaved changes can be told apart from saved ones.
  const [saved, setSaved] = useState(() => fieldsOf(lesson))
  const [fields, setFields] = useState(saved)
  const [view, setView] = useState<View>('edit')
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Set when a problem needs the admin's attention in the edit view, which
  // may have to be shown first; the request count lets repeats refocus.
  const [focusRequests, setFocusRequests] = useState(0)
  const focusId = useRef<string | null>(null)

  const dirty =
    fields.title !== saved.title ||
    fields.videoUrl !== saved.videoUrl ||
    fields.body !== saved.body
  const problems = attempted
    ? lessonProblems({ ...fields, key: lesson.key })
    : null

  useEffect(() => {
    const id = focusId.current
    if (!id) return
    focusId.current = null
    document.getElementById(id)?.focus()
  }, [focusRequests, view])

  const confirmLeave = useUnsavedChangesGuard(dirty)

  function change(changes: Partial<Fields>) {
    setNotice(null)
    setFields((current) => ({ ...current, ...changes }))
  }

  async function handleSave(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !dirty) return
    setAttempted(true)
    setError(null)
    setNotice(null)

    const found = lessonProblems({ ...fields, key: lesson.key })
    if (found) {
      const first = (['title', 'videoUrl', 'body'] as const).find(
        (field) => found[field],
      )
      focusId.current = `${baseId}-${first}`
      setError('Fix the highlighted fields.')
      setView('edit')
      setFocusRequests((count) => count + 1)
      return
    }

    setSaving(true)
    try {
      const updated = await updateLesson(csrfToken, lesson.id, {
        title: fields.title.trim(),
        body: fields.body.trim(),
        video_url: fields.videoUrl.trim() || null,
      })
      // The server tidies the Markdown, so show what it stored.
      const stored = fieldsOf(updated)
      setSaved(stored)
      setFields((current) => (current === fields ? stored : current))
      setAttempted(false)
      setNotice('Saved.')
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not save the lesson. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  const lessonNumber = module
    ? module.lessons.findIndex((item) => item.id === lesson.id) + 1 || undefined
    : undefined

  return (
    <div className="mx-10">
      <div className="py-5">
        <BackToModuleLink moduleId={lesson.module_id} onClick={confirmLeave} />
        <h1 className="text-3xl font-bold text-muted-navy">Edit lesson</h1>
        <p className="text-muted-foreground mt-3">
          Key: <code>{lesson.key}</code>
        </p>
      </div>

      <div role="group" aria-label="Editor view" className="mb-6 flex gap-2">
        {VIEWS.map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant="outline"
            aria-pressed={view === value}
            className="rounded-md border-3 font-bold text-muted-navy aria-pressed:border-light-blue aria-pressed:bg-lightest-blue"
            onClick={() => setView(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <form
        noValidate
        onSubmit={handleSave}
        aria-label="Lesson editor"
        className="max-w-4xl space-y-5"
      >
        {/* Locked while saving: the fields are replaced with what the server
            stored, which would discard anything typed meanwhile. */}
        <fieldset disabled={saving} className="min-w-0 space-y-5">
          {view === 'edit' ? (
            <>
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
                  value={fields.title}
                  onChange={(event) => change({ title: event.target.value })}
                />
                <Problem id={`${baseId}-title-problem`}>
                  {problems?.title}
                </Problem>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor={`${baseId}-videoUrl`}
                  className="text-lg font-bold text-muted-navy"
                >
                  Video link{' '}
                  <span className="text-sm font-normal">(optional)</span>
                </Label>
                <Input
                  id={`${baseId}-videoUrl`}
                  type="url"
                  aria-describedby={`${baseId}-videoUrl-problem`}
                  aria-invalid={Boolean(problems?.videoUrl)}
                  maxLength={MAX_VIDEO_URL_LENGTH}
                  className="h-auto rounded-sm border-3 border-stone-200 bg-white py-2"
                  value={fields.videoUrl}
                  onChange={(event) => change({ videoUrl: event.target.value })}
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
                  Lesson (Markdown)
                </Label>
                <p
                  id={`${baseId}-body-hint`}
                  className="text-sm text-muted-foreground"
                >
                  Markdown, with LaTeX math between dollar signs, such as $x^2$.
                  Start headings at ##, because the title is the lesson&apos;s
                  heading. A section titled &quot;## Learning Objectives&quot;
                  is shown as the overview.
                </p>
                <Textarea
                  id={`${baseId}-body`}
                  aria-describedby={`${baseId}-body-hint ${baseId}-body-problem`}
                  aria-invalid={Boolean(problems?.body)}
                  className="h-[28rem] resize-y rounded-sm border-3 border-stone-200 bg-white font-mono"
                  value={fields.body}
                  onChange={(event) => change({ body: event.target.value })}
                />
                <Problem id={`${baseId}-body-problem`}>
                  {problems?.body}
                </Problem>
              </div>
            </>
          ) : (
            <section
              aria-labelledby={`${baseId}-preview`}
              className="space-y-2"
            >
              <h2
                id={`${baseId}-preview`}
                className="text-lg font-bold text-muted-navy"
              >
                Preview
              </h2>
              <p className="text-sm text-muted-foreground">
                How students will see the lesson, including changes you
                haven&apos;t saved.
              </p>
              <LessonPreviewBody
                title={fields.title.trim() || 'Untitled lesson'}
                videoUrl={
                  isHttpUrl(fields.videoUrl.trim())
                    ? fields.videoUrl.trim()
                    : null
                }
                body={fields.body}
                moduleId={lesson.module_id}
                lessonNumber={lessonNumber}
              />
            </section>
          )}
        </fieldset>

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

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={!dirty || saving}
            className="rounded-md bg-primary font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:bg-primary hover:saturate-130 hover:scale-102 disabled:hover:scale-100 disabled:hover:saturate-100"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {dirty && (
            <span className="text-sm text-muted-foreground">
              You have unsaved changes.
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
