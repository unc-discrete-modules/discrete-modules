/** Landing page that displays modules */

import { ErrorState, LoadingState } from '@/components/RequestState'
import ModuleCard from '@/components/ModuleCard'
import { useModules } from '@/hooks/use-modules'
import { useAuth } from '@/context/auth-context-value'
import SwitchViewButton from '@/components/admin/SwitchViewButton'
import { Link } from 'react-router-dom'

export default function Home() {
  const { modules, loading, error, retry } = useModules()
  const { state: authState } = useAuth()
  if (loading) return <LoadingState message="Loading modules..." />
  if (error) return <ErrorState error={error} retry={retry} />

  return (
    <>
      <div className="mx-10">
        <div className="flex justify-between items-start py-5">
          <h1 className="text-3xl font-bold text-muted-navy">
            {' '}
            {authState.status === 'authenticated'
              ? `Welcome back, ${authState.user?.display_name}`
              : 'Welcome back!'}{' '}
          </h1>
          {authState.user?.role === 'admin' ? (
            <Link to="/admin">
              <SwitchViewButton viewType="Admin"></SwitchViewButton>
            </Link>
          ) : null}
        </div>
      </div>
      <div className="mx-10">
        <h4 className="pb-5 text-gray-500">Click on a card to begin.</h4>
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
