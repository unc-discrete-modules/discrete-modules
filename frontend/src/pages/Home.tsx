/** Landing page that displays modules */

import { ErrorState, LoadingState } from '@/components/RequestState'
import ModuleCard from '@/components/ModuleCard'
import { useModules } from '@/hooks/use-modules'

export default function Home() {
  const { modules, loading, error, retry } = useModules()
  if (loading) return <LoadingState message="Loading modules..." />
  if (error) return <ErrorState error={error} retry={retry} />

  return (
    <>
      <h1 className="text-3xl ml-10 mt-5 font-bold text-muted-navy">
        Welcome back, PlaceholderUsername
      </h1>
      <div className="mx-10">
        <h4 className="py-5 text-gray-500">Click on a card to begin.</h4>
        {/* module card grid */}
        <div className="grid grid-cols-3 grid-rows-auto gap-x-[5%] gap-y-15">
          {modules?.length === 0 && <p>No modules available.</p>}
          {modules?.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      </div>
    </>
  )
}
