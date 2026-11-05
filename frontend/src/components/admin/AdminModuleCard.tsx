/** Card displayed on dashboard/home page that includes module number and progress. */
import { useRef } from 'react'
import { Card, CardContent } from '../ui/card'
import type { ModuleSummary } from '@/types/types'
import { Badge } from '../ui/badge'
import { Link } from 'react-router-dom'
import EditButton from './EditButton'
import DeleteButton from './DeleteButton'

type ModuleCardProps = {
  module: ModuleSummary
}

export default function AdminModuleCard({ module }: ModuleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <Card ref={cardRef} className="w-full overflow-hidden p-0 gap-0">
      {/* image with overlaid badge */}
      <Link to={`/modules/${module.id}`}>
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
      </Link>

      {/* Button Row */}
      <CardContent className="grid grid-cols-2 items-center gap-3 py-4">
        <EditButton />
        <DeleteButton anchor={cardRef} />
      </CardContent>
    </Card>
  )
}
