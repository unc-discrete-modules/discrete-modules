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
}

export default function ModuleCollapsible({ module }: ModuleCollapsibleProps) {
  const { moduleId, lessonId } = useParams()
  const isCurrentModule = Number(moduleId) === module.id

  return (
    <Collapsible defaultOpen={isCurrentModule} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger>
          <SidebarMenuButton isActive={isCurrentModule}>
            <span>{module.title}</span>
            <span>{module.description}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
            {module.lessons.map((lesson) => (
              <SidebarMenuSubItem key={lesson.id}>
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
