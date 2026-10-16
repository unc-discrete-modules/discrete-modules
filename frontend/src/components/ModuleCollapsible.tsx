// Component for collapsible module in the sidebar.

import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from 'cn'
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { useModule } from '@/hooks/use-modules'
import type { ModuleSummary } from '@/types/types'

type ModuleCollapsibleProps = {
  module: ModuleSummary
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ModuleCollapsible({
  module,
  open,
  onOpenChange,
}: ModuleCollapsibleProps) {
  const { moduleId, lessonId } = useParams()
  const isCurrentModule = Number(moduleId) === module.id
  const {
    module: details,
    loading: lessonsLoading,
    error: lessonsError,
    retry,
  } = useModule(module.id, open)

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="group/collapsible"
    >
      <SidebarMenuItem className="list-none w-full">
        <SidebarMenuButton
          isActive={isCurrentModule}
          aria-expanded={open}
          aria-controls={`module-${module.id}-lessons`}
          onClick={() => onOpenChange(!open)}
        >
          <span>{module.title}</span>
          <ChevronRight className="ml-auto transition-transform duration-150 group-data-open/collapsible:rotate-90" />
        </SidebarMenuButton>

        <CollapsibleContent id={`module-${module.id}-lessons`}>
          <SidebarMenuSub className="list-none">
            {lessonsLoading && (
              <li className="px-2 py-1 text-sm">Loading lessons...</li>
            )}
            {lessonsError && (
              <li role="alert" className="px-2 py-1 text-sm">
                {lessonsError.message}
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={retry}
                >
                  Retry
                </button>
              </li>
            )}
            {details?.lessons.map((lesson) => (
              <SidebarMenuSubItem key={lesson.id} className="list-none">
                <Link
                  to={`/modules/${module.id}/lessons/${lesson.id}`}
                  data-size="md"
                  data-active={lesson.id === Number(lessonId) ? '' : undefined}
                  className={cn(
                    'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-xl px-3 text-sidebar-foreground ring-sidebar-ring outline-hidden group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[size=md]:text-sm data-[size=sm]:text-xs data-[active]:bg-sidebar-accent data-[active]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground',
                  )}
                >
                  {lesson.title}
                </Link>
              </SidebarMenuSubItem>
            ))}
            {details?.lessons.length === 0 && (
              <li className="px-2 py-1 text-sm">No lessons available.</li>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
