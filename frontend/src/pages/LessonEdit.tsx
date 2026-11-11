/** Page where a lesson's content is edited. The route carries the module and lesson ids. */

import { useParams } from 'react-router-dom'
import LessonEditor from '@/components/admin/LessonEditor'
import { ErrorState, LoadingState } from '@/components/RequestState'
import { useAuth } from '@/context/auth-context-value'
import { useAdminLesson } from '@/hooks/use-admin-lesson'
import { useModule } from '@/hooks/use-modules'
import NoAccess from './NoAccess'

const isId = (value: number) => Number.isSafeInteger(value) && value > 0

export default function LessonEdit() {
  const { state: authState } = useAuth()
  const { moduleId, lessonId } = useParams()
  const numericModuleId = Number(moduleId)
  const numericLessonId = Number(lessonId)
  const isAdmin =
    authState.status === 'authenticated' && authState.user.role === 'admin'
  const validIds = isId(numericModuleId) && isId(numericLessonId)
  const { lesson, loading, error, retry } = useAdminLesson(
    numericLessonId,
    isAdmin && validIds,
  )
  // Only for the lesson's number in the preview, so a failure is not shown.
  const { module } = useModule(numericModuleId, isAdmin && validIds)

  if (authState.status !== 'authenticated' || authState.user.role !== 'admin') {
    return <NoAccess />
  }
  if (!validIds) {
    return <ErrorState error={new Error('Lesson not found.')} />
  }
  if (loading) {
    return <LoadingState message="Loading lesson..." />
  }
  if (error || !lesson) {
    return (
      <ErrorState
        error={error ?? new Error('Lesson not found.')}
        retry={retry}
      />
    )
  }
  // The lesson must belong to the module in the address, so a mistyped
  // address does not edit a lesson under the wrong module.
  if (lesson.module_id !== numericModuleId) {
    return <ErrorState error={new Error('Lesson not found.')} />
  }
  if (lesson.archived) {
    return (
      <ErrorState
        error={
          new Error(
            'This lesson was deleted. Add it again from the module editor to restore it.',
          )
        }
      />
    )
  }

  return (
    <LessonEditor
      key={lesson.id}
      lesson={lesson}
      module={module}
      csrfToken={authState.user.csrf_token}
    />
  )
}
