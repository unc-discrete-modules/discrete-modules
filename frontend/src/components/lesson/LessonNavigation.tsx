import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

type LessonNavigationProps = {
  moduleId?: string
  previousLessonId: number | null
  nextLessonId: number | null
}

export default function LessonNavigation({
  moduleId,
  previousLessonId,
  nextLessonId,
}: LessonNavigationProps) {
  const navigate = useNavigate()

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
          if (nextLessonId == null) return
          navigate(`/modules/${moduleId}/lessons/${nextLessonId}`)
        }}
        disabled={nextLessonId == null}
      >
        Next
      </Button>
    </nav>
  )
}