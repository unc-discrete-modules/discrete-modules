import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

type LessonNavigationProps = {
  moduleId?: string
  previousLessonId: number | null
  nextLessonId: number | null
  quizId: number | null
}

export default function LessonNavigation({
  moduleId,
  previousLessonId,
  nextLessonId,
  quizId,
}: LessonNavigationProps) {
  const navigate = useNavigate()
  const nextPath =
    nextLessonId != null
      ? `/modules/${moduleId}/lessons/${nextLessonId}`
      : quizId != null
        ? `/modules/${moduleId}/quiz/${quizId}`
        : null

  return (
    <nav className="mt-10 flex gap-3" aria-label="Lesson navigation">
      <Button 
        type="button"
        variant="outline"
        size="lg"
        onClick={() => {
          if (previousLessonId == null) return
          navigate(`/modules/${moduleId}/lessons/${previousLessonId}`)
        }}
        disabled={previousLessonId == null}
      >
        Previous
      </Button>
      <Button
        type="button"
        size="lg"
        onClick={() => {
          if (nextPath == null) return
          navigate(nextPath)
        }}
        disabled={nextPath == null}
      >
        {nextLessonId == null && quizId != null ? 'Take quiz' : 'Next'}
      </Button>
    </nav>
  )
}