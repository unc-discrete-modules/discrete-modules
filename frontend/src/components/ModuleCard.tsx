/** Card displayed on dashboard/home page that includes module number and progress. */
import { Progress } from './ui/progress'
import { Card, CardContent } from './ui/card'
import { Label } from './ui/label'
import type { ModuleSummary } from '@/types/types'
import { Badge } from './ui/badge'

type ModuleCardProps = {
  module: ModuleSummary
}

const progress = 60 // placeholder value

export default function ModuleCard({ module }: ModuleCardProps) {
  return (
    <Card className="w-full overflow-hidden p-0 gap-0">
      {/* image with overlaid badge */}
      <div className="relative">
        {/* placeholder for image: */}
        <div className="h-44 w-full object-cover bg-blue-200"></div>
        {/* <img
          src="xyz"
          alt=""
          className="h-44 w-full object-cover"
        /> */}
        <Badge
          variant="secondary"
          className="absolute left-4 top-4 max-w-[60%] rounded-md bg-white text-left text-md text-muted-navy shadow-md"
        >
          <span className="min-w-0 truncate">
            Module {module.id}: {module.title}
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
}
