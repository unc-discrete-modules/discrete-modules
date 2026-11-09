import { Navigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/RequestState'
import { useModule } from '@/hooks/use-modules'

export default function ModuleStart() {
  const { moduleId } = useParams()
  const numericModuleId = Number(moduleId)
  const enabled =
    Number.isSafeInteger(numericModuleId) && numericModuleId > 0
  const { module, loading, error, retry } = useModule(numericModuleId, enabled)

  if (!enabled) {
    return <ErrorState error={new Error('Module not found.')} />
  }
  if (loading) {
    return <LoadingState message="Loading module..." />
  }
  if (error || !module) {
    return (
      <ErrorState
        error={error ?? new Error('Module not found.')}
        retry={retry}
      />
    )
  }

  const firstLessonId = module.lessons[0]?.id
  if (firstLessonId !== undefined) {
    return (
      <Navigate
        replace
        to={`/modules/${module.id}/lessons/${firstLessonId}`}
      />
    )
  }

  return (
    <main className="max-w-4xl px-12 py-10">
      <h1 className="text-3xl font-bold text-muted-navy">{module.title}</h1>
      <p className="mt-4 text-gray-500">No lessons available.</p>
    </main>
  )
}
