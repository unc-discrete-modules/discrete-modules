/** Sidebar that displays modules. */
import { Link, useParams } from 'react-router-dom'
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
import { useModules } from '@/context/course-context'
import ModuleDropdown from './ModuleCollapsible'

export default function ModuleSidebar() {
  const { lessonId } = useParams()
  const { modules, loading, error } = useModules()
  //   const modules = mockModules

  if (loading) {
    return (
      <Sidebar className="drop-shadow-lg">
        <SidebarHeader className="items-center justify-center text-2xl font-bold m-3">
          <h1 className="pt-3 text-gray-500">Discrete Modules</h1>
        </SidebarHeader>
        <div>
          <h2 className="pt-3 text-gray-500">Loading...</h2>
        </div>
      </Sidebar>
    )
  }

  if (error) {
    return (
      <Sidebar className="drop-shadow-lg">
        <SidebarHeader className="items-center justify-center text-2xl font-bold m-3">
          <h1 className="pt-3 text-gray-500">Discrete Modules</h1>
        </SidebarHeader>
        <div>
          <h2 className="pt-3 text-gray-500">Error: {error.message}</h2>
        </div>
      </Sidebar>
    )
  }

  return (
    <Sidebar className="drop-shadow-lg">
      <SidebarHeader className="items-center justify-center text-2xl font-bold m-3">
        <h1 className="pt-3 text-gray-500">Discrete Modules</h1>
      </SidebarHeader>
      {/* here, there should be a loop that renders each module. */}
      <SidebarContent className="pl-5">
        {modules?.map((mod) => (
          <ModuleDropdown key={mod.id} module={mod} />
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
