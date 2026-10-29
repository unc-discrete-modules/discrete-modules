import { useParams } from 'react-router-dom'
import LessonContent from '@/components/lesson/LessonContent'
import LessonHeader from '@/components/lesson/LessonHeader'
import LessonNavigation from '@/components/lesson/LessonNavigation'
import LessonVideo from '@/components/lesson/LessonVideo'
import { ErrorState, LoadingState } from '@/components/RequestState'
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

  return (
    <main className="max-w-4xl px-12 py-10">
      <LessonHeader
        title={lesson.title}
        moduleId={moduleId}
        lessonId={lessonId}
        objectives={objectives}
      />
      <LessonVideo videoUrl={lesson.video_url ?? null} title={lesson.title} />
      <LessonContent body={body} />
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
