/** Admin landing page.
 * Includes welcome message, module cards, and creation, reorder, and switch view buttons.
 * */

import AdminModuleCard from '@/components/admin/AdminModuleCard'
import { ModuleCreationDialog } from '@/components/admin/ModuleCreationDialog'
import ReorderButton from '@/components/admin/ReorderButton'
import SwitchViewButton from '@/components/admin/SwitchViewButton'
import { LoadingState, ErrorState } from '@/components/RequestState'
import { useModules } from '@/hooks/use-modules'

export default function AdminHome() {
  const { modules, loading, error, retry } = useModules()
  if (loading) return <LoadingState message="Loading modules..." />
  if (error) return <ErrorState error={error} retry={retry} />

  return (
    <>
      <div className="mx-10">
        <div className="flex justify-between items-start py-5">
          <h1 className="text-3xl font-bold text-muted-navy">Create Module</h1>
          <SwitchViewButton viewType="Student"></SwitchViewButton>
        </div>

        <div className="flex gap-x-[3%] pb-5">
          <ModuleCreationDialog />
          <ReorderButton />
        </div>

        {/* module card grid */}
        <div className="grid grid-cols-3 grid-rows-auto gap-x-[5%] gap-y-15">
          {modules?.length === 0 && <p>No modules available.</p>}
          {modules?.map((mod) => (
            <AdminModuleCard key={mod.id} module={mod} />
          ))}
        </div>
      </div>
    </>
  )
}
