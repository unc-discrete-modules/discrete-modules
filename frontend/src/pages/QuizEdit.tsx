/** Page where a quiz's questions are edited. The route carries the module and quiz ids. */

import { useParams } from 'react-router-dom'
import QuizEditor from '@/components/admin/QuizEditor'
import { ErrorState, LoadingState } from '@/components/RequestState'
import { useAuth } from '@/context/auth-context-value'
import { useAdminQuiz } from '@/hooks/use-admin-quiz'
import NoAccess from './NoAccess'

const isId = (value: number) => Number.isSafeInteger(value) && value > 0

export default function QuizEdit() {
  const { state: authState } = useAuth()
  const { moduleId, quizId } = useParams()
  const numericModuleId = Number(moduleId)
  const numericQuizId = Number(quizId)
  const isAdmin =
    authState.status === 'authenticated' && authState.user.role === 'admin'
  const validIds = isId(numericModuleId) && isId(numericQuizId)
  const { quiz, loading, error, retry } = useAdminQuiz(
    numericModuleId,
    isAdmin && validIds,
  )

  if (authState.status !== 'authenticated' || authState.user.role !== 'admin') {
    return <NoAccess />
  }
  if (!validIds) {
    return <ErrorState error={new Error('Quiz not found.')} />
  }
  if (loading) {
    return <LoadingState message="Loading quiz..." />
  }
  if (error || !quiz) {
    return (
      <ErrorState error={error ?? new Error('Quiz not found.')} retry={retry} />
    )
  }
  // A module has one quiz, so a different id in the address is a mistake.
  if (quiz.id !== numericQuizId) {
    return <ErrorState error={new Error('Quiz not found.')} />
  }
  if (quiz.archived) {
    return (
      <ErrorState
        error={
          new Error(
            'This quiz was deleted. Add it again from the module editor to restore it.',
          )
        }
      />
    )
  }

  return (
    <QuizEditor
      key={quiz.id}
      quiz={quiz}
      csrfToken={authState.user.csrf_token}
    />
  )
}
