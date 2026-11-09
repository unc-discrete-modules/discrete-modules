/** Admin landing page.
 * Includes welcome message, module cards, and creation, reorder, and switch view buttons.
 * */

import { useMemo, useState } from 'react'
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react'
import AdminModuleCard from '@/components/admin/AdminModuleCard'
import { ModuleCreationDialog } from '@/components/admin/ModuleCreationDialog'
import ReorderButton from '@/components/admin/ReorderButton'
import SwitchViewButton from '@/components/admin/SwitchViewButton'
import { LoadingState, ErrorState } from '@/components/RequestState'
import { useModules } from '@/hooks/use-modules'
import { useAuth } from '@/context/auth-context-value'
import { reorderModules } from '@/api/client'
import { Link } from 'react-router-dom'
import NoAccess from './NoAccess'

export default function AdminHome() {
  const { modules, loading, error, retry, updateModuleOrder } = useModules()
  const { state: authState } = useAuth()
  const [moduleOrder, setModuleOrder] = useState<number[] | null>(null)
  const [reordering, setReordering] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const orderedModules = useMemo(() => {
    if (!modules || !moduleOrder) return modules ?? []
    const modulesById = new Map(modules.map((module) => [module.id, module]))
    const ordered = moduleOrder.flatMap((id) => {
      const module = modulesById.get(id)
      return module ? [module] : []
    })
    const orderedIds = new Set(moduleOrder)
    return [
      ...ordered,
      ...modules.filter((module) => !orderedIds.has(module.id)),
    ]
  }, [modules, moduleOrder])

  function handleDragEnd(event: DragEndEvent) {
    if (event.canceled) return
    const source = event.operation.source
    const sourceId = source?.id
    const targetId = event.operation.target?.id
    if (
      typeof sourceId !== 'number' ||
      !source ||
      !('index' in source) ||
      typeof source.index !== 'number'
    ) {
      return
    }

    const fromIndex = orderedModules.findIndex(
      (module) => module.id === sourceId,
    )
    const toIndex = source.index
    console.log('Drag end positions:', {
      sourceId,
      targetId,
      fromIndex,
      toIndex,
      moduleIds: orderedModules.map((module) => module.id),
    })
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      toIndex >= orderedModules.length ||
      fromIndex === toIndex
    ) {
      // console.log('Drag ended without a reorder:', { fromIndex, toIndex })
      return
    }

    const next = [...orderedModules]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    const nextOrder = next.map((module) => module.id)
    setModuleOrder(nextOrder)
  }

  async function handleReorderClick() {
    if (!reordering) {
      setSaveError(null)
      setReordering(true)
      return
    }

    if (authState.status !== 'authenticated') {
      setSaveError('Your session has expired. Please sign in again.')
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const result = await reorderModules(
        orderedModules.map((module) => module.id),
        authState.user.csrf_token,
      )
      setModuleOrder(result.ids)
      updateModuleOrder(result.ids)
      setReordering(false)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Unable to save module order. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading modules..." />
  if (error) return <ErrorState error={error} retry={retry} />

  // check user role
  if (authState.status === 'authenticated' && authState.user.role !== 'admin') {
    // redirect to student view
    return <NoAccess />
  }

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
          <Link to="/">
            <SwitchViewButton viewType="Student"></SwitchViewButton>
          </Link>
        </div>

        <div className="flex gap-x-[3%] pb-5">
          <ModuleCreationDialog />
          <ReorderButton
            reordering={reordering}
            disabled={saving}
            onClick={handleReorderClick}
          />
        </div>

        {saveError && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {saveError}
          </p>
        )}

        {/* module card grid */}
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-3 grid-rows-auto gap-x-[5%] gap-y-15">
            {orderedModules.length === 0 && <p>No modules available.</p>}
            {orderedModules.map((mod, index) => (
              <AdminModuleCard
                key={mod.id}
                module={mod}
                index={index}
                reordering={reordering}
                disabled={saving}
              />
            ))}
          </div>
        </DragDropProvider>
      </div>
    </>
  )
}
