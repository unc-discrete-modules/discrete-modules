/** Admin page for adding a lesson or quiz to a module from a content file. */

import { useState, type ComponentType } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { ErrorState, LoadingState } from '@/components/RequestState'
import { useAuth } from '@/context/auth-context-value'
import { useModule } from '@/hooks/use-modules'
import NoAccess from '@/pages/NoAccess'
import FileUploadForm from './FileUploadForm'
import type { LessonSummary } from '@/types/types'
import type { CreateContent, PreviewProps, UploadedFile } from './upload-types'

type ContentUploadPageProps = {
  contentName: 'lesson' | 'quiz'
  extensions: string[]
  formatHint: string
  Preview?: ComponentType<PreviewProps>
  // Create stays disabled until the page supplies a handler.
  onCreate?: CreateContent
}

export default function ContentUploadPage({
  contentName,
  extensions,
  formatHint,
  Preview,
  onCreate,
}: ContentUploadPageProps) {
  const { state: authState } = useAuth()
  const [addedLessons, setAddedLessons] = useState<LessonSummary[]>([])
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

  // Lessons added on this page are not in the fetched module, but the preview
  // numbers the next lesson from it.
  const currentModule = {
    ...module,
    lessons: [...module.lessons, ...addedLessons],
  }

  async function handleCreate(file: UploadedFile) {
    if (!onCreate || authState.status !== 'authenticated') {
      throw new Error('Your session has expired. Please sign in again.')
    }
    const lesson = await onCreate(file, {
      module: currentModule,
      csrfToken: authState.user.csrf_token,
    })
    if (lesson) setAddedLessons((lessons) => [...lessons, lesson])
  }

  return (
    <div className="mx-10">
      <div className="py-5">
        {/* A link, not a button inside a link, so it is one control. */}
        <Link
          to={`/edit-module/${module.id}`}
          className={`${buttonVariants({ variant: 'outline' })} mb-4 rounded-md border-light-blue font-bold text-muted-navy`}
        >
          <ArrowLeft aria-hidden="true" />
          Back to module editing
        </Link>
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
        Preview={Preview}
        module={currentModule}
        onCreate={onCreate ? handleCreate : undefined}
      />
    </div>
  )
}
