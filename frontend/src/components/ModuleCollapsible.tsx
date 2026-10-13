// Component for collapsible module in the sidebar.

import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import type { Module } from '@/types/types'

type ModuleCollapsibleProps = {
  module: Module
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

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="group/collapsible"
    >
      <SidebarMenuItem className="list-none w-full">
        <CollapsibleTrigger>
          <SidebarMenuButton isActive={isCurrentModule}>
            <span>{module.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-150 group-data-open/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className="list-none">
            {module.lessons.map((lesson) => (
              <SidebarMenuSubItem key={lesson.id} className="list-none">
                <SidebarMenuSubButton isActive={lesson.id === Number(lessonId)}>
                  <Link to={`/modules/${module.id}/lessons/${lesson.id}`}>
                    {lesson.title}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
