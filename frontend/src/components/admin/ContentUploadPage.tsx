/** Admin page for adding a lesson or quiz to a module from a content file. */

import { useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '@/components/RequestState'
import { useAuth } from '@/context/auth-context-value'
import { useModule } from '@/hooks/use-modules'
import NoAccess from '@/pages/NoAccess'
import FileUploadForm from './FileUploadForm'

type ContentUploadPageProps = {
  contentName: 'lesson' | 'quiz'
  extensions: string[]
  formatHint: string
}

export default function ContentUploadPage({
  contentName,
  extensions,
  formatHint,
}: ContentUploadPageProps) {
  const { state: authState } = useAuth()
  const { moduleId } = useParams()
  const numericModuleId = Number(moduleId)
  const isAdmin = authState.user?.role === 'admin'
  const { module, loading, error, retry } = useModule(
    numericModuleId,
    isAdmin && Number.isSafeInteger(numericModuleId) && numericModuleId > 0,
  )

  if (!isAdmin) {
    return <NoAccess />
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

  return (
    <div className="mx-10">
      <div className="py-5">
        <h1 className="text-3xl font-bold text-muted-navy">
          Add {contentName}
        </h1>
        <p className="text-muted-foreground">to {module.title}</p>
      </div>
      <FileUploadForm
        fileLabel={`${contentName[0].toUpperCase()}${contentName.slice(1)} file`}
        extensions={extensions}
        formatHint={formatHint}
        cancelTo={`/edit-module/${module.id}`}
      />
    </div>
  )
}
