/** Landing page that displays modules */

import ModuleCard from '@/components/ModuleCard'
import { useModules } from '@/hooks/use-modules'

export default function Home() {
  const { modules } = useModules()

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
