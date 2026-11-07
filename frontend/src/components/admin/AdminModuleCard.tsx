/** Card displayed on dashboard/home page that includes module number and progress. */
import { useRef } from 'react'
import { Card, CardContent } from '../ui/card'
import type { ModuleSummary } from '@/types/types'
import { Badge } from '../ui/badge'
import { Link } from 'react-router-dom'
import EditButton from './EditButton'
import DeleteButton from './DeleteButton'
import { useSortable } from '@dnd-kit/react/sortable'
import { GripVertical } from 'lucide-react'

type ModuleCardProps = {
  module: ModuleSummary
  index: number
  reordering: boolean
  disabled?: boolean
}

export default function AdminModuleCard({
  module,
  index,
  reordering,
  disabled = false,
}: ModuleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { ref, handleRef, isDragging } = useSortable({
    id: module.id,
    index,
    disabled: !reordering || disabled,
  })

  return (
    <div
      ref={ref}
      className={`relative transition-opacity ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card ref={cardRef} className="w-full overflow-hidden p-0 gap-0">
        {reordering && (
          <button
            ref={handleRef}
            type="button"
            aria-label={`Reorder module ${module.title}`}
            disabled={disabled}
            className="absolute right-3 top-3 z-10 cursor-grab touch-none rounded-md bg-white p-2 text-muted-navy shadow active:cursor-grabbing disabled:cursor-not-allowed"
          >
            <GripVertical aria-hidden="true" size={20} />
          </button>
        )}

        <Link to={`/modules/${module.id}`}>
          <div className="relative">
            <div className="h-44 w-full object-cover bg-blue-200"></div>
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

        <CardContent className="grid grid-cols-2 items-center gap-3 py-4">
          <Link to={`/edit-module/${module.id}`}>
            <EditButton />
          </Link>
          <DeleteButton moduleId={module.id} anchor={cardRef} />
        </CardContent>
      </Card>
    </div>
  )
}
