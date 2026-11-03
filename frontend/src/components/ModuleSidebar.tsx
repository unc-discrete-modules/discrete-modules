/** Sidebar that displays modules. */
import { ErrorState, LoadingState } from './RequestState'
import { useParams } from 'react-router-dom'
import { Sidebar, SidebarContent, SidebarHeader } from './ui/sidebar'
import ModuleDropdown from './ModuleCollapsible'
import { useState } from 'react'
import { useModules } from '@/hooks/use-modules'

export default function ModuleSidebar() {
  const { moduleId } = useParams()
  const [openId, setOpenId] = useState<number | null>(Number(moduleId) || null)
  const { modules, loading, error, retry } = useModules()

  return (
    <Sidebar className="drop-shadow-lg">
      <SidebarHeader className="items-center justify-center text-2xl font-bold m-3">
        <h1 className="pt-3 text-gray-500">Discrete Modules</h1>
      </SidebarHeader>
      {/* here, there should be a loop that renders each module. */}
      <SidebarContent className="items-center">
        {loading && <LoadingState message="Loading modules..." />}
        {error && <ErrorState error={error} retry={retry} />}
        {modules?.length === 0 && <p>No modules available.</p>}
        {modules?.map((mod) => (
          <div key={mod.id} className="w-[90%]">
            <ModuleDropdown
              key={mod.id}
              module={mod}
              open={openId === mod.id}
              onOpenChange={(open) => setOpenId(open ? mod.id : null)}
            />
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
