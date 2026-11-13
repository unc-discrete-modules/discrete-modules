// Component for collapsible module in the sidebar.

import { ErrorState, LoadingState } from './RequestState'
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
import { useProgress } from '@/context/progress-context-value'
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
  const { moduleId, lessonId, quizId } = useParams()
  const progressState = useProgress()
  const progress = progressState?.progress?.find(
    (item) => item.module_id === module.id,
  )
  const completed = new Set(progress?.completed_lesson_ids ?? [])
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
      <SidebarMenuItem className="list-none w-full text-muted-navy">
        <SidebarMenuButton
          isActive={isCurrentModule}
          aria-expanded={open}
          aria-controls={`module-${module.id}-content`}
          onClick={() => onOpenChange(!open)}
          className="rounded-none"
        >
          <span className="min-w-0 flex-1 truncate">
            {module.display_order + 1}. {module.title}
          </span>
          {progress && (
            <span
              className="shrink-0 text-xs"
              aria-label={
                progress.lesson_count === 0
                  ? undefined
                  : `${progress.completed_lesson_ids.length} of ${progress.lesson_count} lessons complete`
              }
            >
              {progress.lesson_count === 0
                ? 'No lessons'
                : `${progress.completed_lesson_ids.length}/${progress.lesson_count}`}
            </span>
          )}
          <ChevronRight className="ml-auto shrink-0 transition-transform duration-150 group-data-open/collapsible:rotate-90 stroke-muted-navy" />
        </SidebarMenuButton>

        <CollapsibleContent id={`module-${module.id}-content`}>
          <SidebarMenuSub className="mx-0 w-full translate-x-0 border-l-0 px-0 py-0">
            {lessonsLoading && (
              <li>
                <LoadingState message="Loading lessons..." />
              </li>
            )}
            {lessonsError && (
              <li>
                <ErrorState error={lessonsError} retry={retry} />
              </li>
            )}
            {details?.lessons.map((lesson, index) => (
              <SidebarMenuSubItem key={lesson.id} className="list-none">
                <SidebarMenuSubButton
                  render={
                    <Link to={`/modules/${module.id}/lessons/${lesson.id}`} />
                  }
                  isActive={lesson.id === Number(lessonId)}
                  className="h-7 w-full items-center overflow-hidden rounded-none whitespace-nowrap pl-8"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {index + 1}. {lesson.title}
                  </span>
                  {progress && !completed.has(lesson.id) && (
                    <span className="shrink-0 text-xs">To do</span>
                  )}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
            {details?.lessons.length === 0 && (
              <li className="px-2 py-1 text-sm">No lessons available.</li>
            )}
            {details?.quiz_id != null && (
              <SidebarMenuSubItem className="list-none">
                <SidebarMenuSubButton
                  render={
                    <Link
                      to={`/modules/${module.id}/quiz/${details.quiz_id}`}
                    />
                  }
                  isActive={details.quiz_id === Number(quizId)}
                  className="h-7 w-full items-center overflow-hidden rounded-none whitespace-nowrap pl-8"
                >
                  <span className="min-w-0 flex-1 truncate">Quiz 1</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
