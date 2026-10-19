// Component for collapsible module in the sidebar.

import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
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
          className="rounded-none"
        >
          <span className="min-w-0 flex-1 truncate">
            {module.id}. {module.title}
          </span>
          <ChevronRight className="ml-auto shrink-0 transition-transform duration-150 group-data-open/collapsible:rotate-90" />
        </SidebarMenuButton>

        <CollapsibleContent id={`module-${module.id}-lessons`}>
          <SidebarMenuSub className="mx-0 w-full translate-x-0 border-l-0 px-0 py-0">
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
                <SidebarMenuSubButton
                  render={
                    <Link to={`/modules/${module.id}/lessons/${lesson.id}`} />
                  }
                  isActive={lesson.id === Number(lessonId)}
                  className="h-7 w-full items-center overflow-hidden rounded-none whitespace-nowrap pl-8"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {lesson.id}. {lesson.title}
                  </span>
                </SidebarMenuSubButton>
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
