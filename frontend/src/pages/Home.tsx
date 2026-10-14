/** Landing page that displays modules */

import ModuleCard from '@/components/ModuleCard'

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

const modules = mockModules

export default function Home() {
  return (
    <>
      <h1 className="text-3xl ml-10 mt-5 font-bold text-muted-navy">
        Welcome back, PlaceholderUsername
      </h1>
      <div className="ml-20">
        <h4 className="py-5 text-gray-500">Click on a card to begin.</h4>
        {/* module card grid */}
        <div className="grid grid-cols-2 grid-rows-auto gap-y-15">
          {modules?.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      </div>
    </>
  )
}
