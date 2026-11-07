import { useParams } from 'react-router-dom'
import LessonContent from '@/components/lesson/LessonContent'
import LessonHeader from '@/components/lesson/LessonHeader'
import LessonNavigation from '@/components/lesson/LessonNavigation'
import LessonVideo from '@/components/lesson/LessonVideo'
import { Skeleton } from '@/components/ui/skeleton'
import { useLesson } from '@/hooks/use-lesson'
import { useModule } from '@/hooks/use-modules'
import { splitLessonSections } from '../lib/lesson-content'

export default function Lesson() {
  const { moduleId, lessonId } = useParams()
  const { lesson, loading, error } = useLesson(lessonId)
  const numericModuleId = Number(moduleId)
  const { module } = useModule(
    numericModuleId,
    Number.isSafeInteger(numericModuleId) && numericModuleId > 0,
  )

  if (loading) {
    return <Skeleton className="m-6 h-32" />
  }

  if (error || !lesson) {
    return (
      <main className="p-6 text-lg">
        {error?.message ?? 'Lesson not found.'}
      </main>
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
      <LessonVideo videoUrl={lesson.video_url} title={lesson.title} />
      <LessonContent body={body} />
      <LessonNavigation
        moduleId={moduleId}
        previousLessonId={lesson.previous_lesson_id}
        nextLessonId={lesson.next_lesson_id}
        quizId={module?.quiz_id ?? null}
      />
    </main>
  )
}
