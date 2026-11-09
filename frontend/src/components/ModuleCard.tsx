/** Card displayed on dashboard/home page that includes module number and progress. */
import { Progress } from './ui/progress'
import { Card, CardContent } from './ui/card'
import { Label } from './ui/label'
import type { ModuleSummary } from '@/types/types'
import { Badge } from './ui/badge'
import { Link } from 'react-router-dom'
import { useModule } from '@/hooks/use-modules'

type ModuleCardProps = {
  module: ModuleSummary
}

const progress = 60 // placeholder value

export default function ModuleCard({ module }: ModuleCardProps) {
  const { module: details } = useModule(module.id)
  const firstLessonId = details?.lessons[0]?.id

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

      {/* Progress row */}
      <CardContent className="flex items-center gap-3 py-4">
        <Label className="shrink-0 text-sm text-muted-foreground">
          Progress
        </Label>
        <Progress value={progress} className="flex-1" />
        <span className="shrink-0 text-sm font-medium text-blue-600">
          {progress}%
        </span>
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
