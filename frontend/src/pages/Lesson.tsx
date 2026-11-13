import { useState } from 'react'
import { useParams } from 'react-router-dom'
import LessonContent from '@/components/lesson/LessonContent'
import LessonHeader from '@/components/lesson/LessonHeader'
import LessonNavigation from '@/components/lesson/LessonNavigation'
import LessonVideo from '@/components/lesson/LessonVideo'
import { ErrorState, LoadingState } from '@/components/RequestState'
import { useProgress } from '@/context/progress-context-value'
import { Button } from '@/components/ui/button'
import { useLesson } from '@/hooks/use-lesson'
import { useModule } from '@/hooks/use-modules'
import { splitLessonSections } from '../lib/lesson-content'

export default function Lesson() {
  const { moduleId, lessonId } = useParams()
  const { lesson, loading, error, retry } = useLesson(lessonId)
  const numericModuleId = Number(moduleId)
  const {
    module,
    loading: moduleLoading,
    error: moduleError,
    retry: retryModule,
  } = useModule(
    numericModuleId,
    Number.isSafeInteger(numericModuleId) && numericModuleId > 0,
  )

  if (loading) {
    return <LoadingState message="Loading lesson..." />
  }

  if (error || !lesson) {
    return (
      <ErrorState
        error={error ?? new Error('Lesson not found.')}
        retry={retry}
      />
    )
  }

  const { objectives, body } = splitLessonSections(lesson.body)
  const position = module?.lessons.findIndex((item) => item.id === lesson.id)
  const lessonNumber =
    position === undefined || position < 0 ? undefined : position + 1

  return (
    <main className="max-w-4xl px-12 py-10">
      <LessonHeader
        title={lesson.title}
        moduleId={moduleId}
        lessonNumber={lessonNumber}
        objectives={objectives}
      />
      <LessonVideo videoUrl={lesson.video_url ?? null} title={lesson.title} />
      <LessonContent body={body} />
      <LessonCompletion
        key={lesson.id}
        moduleId={numericModuleId}
        lessonId={lesson.id}
      />
      {moduleLoading && <LoadingState message="Loading lesson navigation..." />}
      {moduleError && <ErrorState error={moduleError} retry={retryModule} />}
      <LessonNavigation
        moduleId={moduleId}
        previousLessonId={lesson.previous_lesson_id ?? null}
        nextLessonId={lesson.next_lesson_id ?? null}
        quizId={module?.quiz_id ?? null}
      />
    </main>
  )
}

function LessonCompletion({
  moduleId,
  lessonId,
}: {
  moduleId: number
  lessonId: number
}) {
  const state = useProgress()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const progress = state?.progress?.find((item) => item.module_id === moduleId)
  if (!progress) return null
  if (progress.completed_lesson_ids.includes(lessonId))
    return (
      <p className="mt-8 font-medium text-green-700" role="status">
        Lesson complete
      </p>
    )

  async function markComplete() {
    if (!state || saving) return
    setSaving(true)
    setError(null)
    try {
      await state.complete(moduleId, lessonId)
    } catch (error) {
      setError(
        error instanceof Error ? error : new Error('Unable to save progress.'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-8">
      <Button type="button" disabled={saving} onClick={markComplete}>
        {saving ? 'Saving...' : 'Mark complete'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error.message} Please try again.
        </p>
      )}
    </div>
  )
}
