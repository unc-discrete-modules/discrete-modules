import { useParams } from 'react-router-dom'
import LessonContent from '@/components/lesson/LessonContent'
import LessonHeader from '@/components/lesson/LessonHeader'
import LessonNavigation from '@/components/lesson/LessonNavigation'
import LessonVideo from '@/components/lesson/LessonVideo'
import { Skeleton } from '@/components/ui/skeleton'
import { useLesson } from '@/hooks/use-lesson'

export default function Lesson() {
  const { moduleId, lessonId } = useParams()
  const { lesson, loading, error } = useLesson(lessonId)

  if (loading) {
    return <Skeleton className="m-6 h-32" />
  }

  if (error) {
    return <main className="p-6 text-lg">{error?.message ?? 'Lesson not found.'}</main>
  }

  if (!lesson) return null

  return (
    <main className="max-w-4xl px-12 py-10">
      <LessonHeader
        title={lesson.title}
        moduleId={moduleId}
        lessonId={lessonId}
      />
      <LessonVideo videoUrl={lesson.video_url} title={lesson.title} />
      <LessonContent body={lesson.body} />
      <LessonNavigation
        moduleId={moduleId}
        previousLessonId={lesson.previous_lesson_id}
        nextLessonId={lesson.next_lesson_id}
      />
    </main>
  )
}
