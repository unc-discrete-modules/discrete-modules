/** Sidebar that displays modules. */
import { useParams } from 'react-router-dom'
import { Sidebar, SidebarContent, SidebarHeader } from './ui/sidebar'
// import { useModules } from '@/context/course-context'
import ModuleDropdown from './ModuleCollapsible'
import { useState } from 'react'

const mockModules = [
  {
    id: 1,
    title: 'Mock Module 1',
    description: 'Statements, connectives, and implications.',
    display_order: 0,
    lessons: [
      { id: 1, title: 'Mock L1' },
      { id: 2, title: 'Mock L2' },
    ],
  },
  {
    id: 2,
    title: 'Mock Module 2',
    description: 'Sets and their operations.',
    display_order: 1,
    lessons: [
      { id: 3, title: 'Mock L1' },
      { id: 4, title: 'Mock L2' },
    ],
  },
  {
    id: 3,
    title: 'Mock Module 3',
    description: 'Ordered pairs, relations, and function properties.',
    display_order: 2,
    lessons: [
      { id: 5, title: 'Mock L1' },
      { id: 6, title: 'Mock L2' },
    ],
  },
]

export default function ModuleSidebar() {
  const { moduleId } = useParams()
  const [openId, setOpenId] = useState<number | null>(Number(moduleId) || null)
  // const { modules, loading, error } = useModules()
  const modules = mockModules

  // if (loading) {
  //   return (
  //     <Sidebar className="drop-shadow-lg">
  //       <SidebarHeader className="items-center justify-center text-2xl font-bold m-3">
  //         <h1 className="pt-3 text-gray-500">Discrete Modules</h1>
  //       </SidebarHeader>
  //       <div>
  //         <h2 className="pt-3 text-gray-500">Loading...</h2>
  //       </div>
  //     </Sidebar>
  //   )
  // }

  // if (error) {
  //   return (
  //     <Sidebar className="drop-shadow-lg">
  //       <SidebarHeader className="items-center justify-center text-2xl font-bold m-3">
  //         <h1 className="pt-3 text-gray-500">Discrete Modules</h1>
  //       </SidebarHeader>
  //       <div>
  //         <h2 className="pt-3 text-gray-500">Error: {error.message}</h2>
  //       </div>
  //     </Sidebar>
  //   )
  // }

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
