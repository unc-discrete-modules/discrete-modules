/** Card displayed on dashboard/home page that includes module number and progress. */
import { Progress } from './ui/progress'
import { Card, CardContent } from './ui/card'
import { Label } from './ui/label'
import type { ModuleSummary } from '@/types/types'
import { Badge } from './ui/badge'
import { Link } from 'react-router-dom'
import { useModule } from '@/hooks/use-modules'
import { useProgress } from '@/context/progress-context-value'

type ModuleCardProps = {
  module: ModuleSummary
}

export default function ModuleCard({ module }: ModuleCardProps) {
  const { module: details } = useModule(module.id)
  const progressState = useProgress()
  const progress = progressState?.progress?.find(
    (item) => item.module_id === module.id,
  )
  const completed = new Set(progress?.completed_lesson_ids ?? [])
  const firstLessonId = progress
    ? (details?.lessons.find((lesson) => !completed.has(lesson.id))?.id ??
      details?.lessons[0]?.id)
    : details?.lessons[0]?.id
  const percentage =
    progress && progress.lesson_count > 0
      ? Math.round(
          (progress.completed_lesson_ids.length / progress.lesson_count) * 100,
        )
      : null

  const card = (
    <Card className="w-full overflow-hidden p-0 gap-0">
      <div className="relative">
        <div className="h-44 w-full object-cover bg-blue-200"></div>
        <Badge
          variant="secondary"
          className="absolute left-4 top-4 max-w-[60%] rounded-md bg-white text-left text-md text-muted-navy shadow-md"
        >
          <span className="min-w-0 truncate">
            Module {module.display_order + 1}: {module.title}
          </span>
        </Badge>
      </div>

      <CardContent className="flex items-center gap-3 py-4">
        {progress ? (
          progress.lesson_count === 0 ? (
            <span className="text-sm text-muted-foreground">No lessons</span>
          ) : (
            <>
              <Label className="shrink-0 text-sm text-muted-foreground">
                Progress
              </Label>
              <Progress
                value={percentage ?? 0}
                className="flex-1"
                aria-label={`Module ${module.display_order + 1} progress`}
              />
              <span className="shrink-0 text-sm font-medium text-blue-600">
                {percentage}%
              </span>
            </>
          )
        ) : (
          <span className="text-sm text-muted-foreground">
            {progressState?.loading
              ? 'Loading progress...'
              : 'Progress unavailable'}
          </span>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Link
      to={
        firstLessonId !== undefined
          ? `/modules/${module.id}/lessons/${firstLessonId}`
          : `/modules/${module.id}`
      }
    >
      {card}
    </Link>
  )
}
