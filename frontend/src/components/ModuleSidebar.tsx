/** Sidebar that displays modules. */
import { useParams } from 'react-router-dom'
import { Sidebar, SidebarContent, SidebarHeader } from './ui/sidebar'
import ModuleDropdown from './ModuleCollapsible'
import { useState } from 'react'
import { useModules } from '@/hooks/use-modules'

export default function ModuleSidebar() {
  const { moduleId } = useParams()
  const [openId, setOpenId] = useState<number | null>(Number(moduleId) || null)
  const { modules, loading, error } = useModules()

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
          <ModuleDropdown
            key={mod.id}
            module={mod}
            open={openId === mod.id}
            onOpenChange={(open) => setOpenId(open ? mod.id : null)}
          />
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
