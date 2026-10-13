/** Sidebar that displays modules. */
import { useParams } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from './ui/sidebar'

export default function ModuleSidebar() {
  //   const { moduleId, lessonId } = useParams()
  //   const modules = useCourse()

  return (
    <Sidebar className="drop-shadow-lg">
      <SidebarHeader className="items-center justify-center text-2xl font-bold m-3">
        <h1 className="pt-3 text-gray-500">Discrete Modules</h1>
      </SidebarHeader>
      {/* here, there should be a loop that renders each module. */}
    </Sidebar>
  )
}
