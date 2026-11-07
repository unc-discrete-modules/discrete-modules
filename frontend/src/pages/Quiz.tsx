import { useState, type SubmitEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { submitQuiz } from '@/api/client'
import QuizFeedback from '@/components/quiz/QuizFeedback'
import QuizQuestion from '@/components/quiz/QuizQuestion'
import { ErrorState, LoadingState } from '@/components/RequestState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context-value'
import { useModule } from '@/hooks/use-modules'
import { useQuiz } from '@/hooks/use-quiz'
import {
  buildAnswers,
  isAnswered,
  unansweredQuestions,
  type AnswerValues,
} from '@/lib/quiz-answers'
import type { SubmissionResult } from '@/types/types'

export default function Quiz() {
  const { moduleId, quizId } = useParams()
  const navigate = useNavigate()
  const { state: auth } = useAuth()
  const numericModuleId = Number(moduleId)
  const validModuleId =
    Number.isSafeInteger(numericModuleId) && numericModuleId > 0
  const { quiz, loading, error, retry } = useQuiz(
    numericModuleId,
    validModuleId,
  )
  const { module } = useModule(numericModuleId, validModuleId)
  const [values, setValues] = useState<AnswerValues>({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmissionResult | null>(null)

  if (!validModuleId) {
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

  if (quiz.id !== Number(quizId)) {
    return <ErrorState error={new Error('Quiz not found.')} />
  }

  const unanswered = unansweredQuestions(quiz.questions, values)
  const lastLessonId = module?.lessons.at(-1)?.id
  const firstLessonId = module?.lessons[0]?.id

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quiz || submitting || auth.status !== 'authenticated') return
    setAttemptedSubmit(true)
    setSubmitError(null)

    if (unanswered.length > 0) {
      document.getElementById(`question-${unanswered[0].id}`)?.focus()
      return
    }

    setSubmitting(true)
    try {
      setResult(
        await submitQuiz(
          quiz.id,
          { answers: buildAnswers(quiz.questions, values) },
          { csrfToken: auth.user.csrf_token },
        ),
      )
    } catch {
      setSubmitError('Unable to submit your answers. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function restart() {
    setValues({})
    setAttemptedSubmit(false)
    setSubmitError(null)
    setResult(null)
  }

  if (result) {
    return (
      <QuizFeedback
        quiz={quiz}
        values={values}
        result={result}
        onRetry={restart}
        onBack={() =>
          void navigate(
            firstLessonId == null
              ? `/modules/${moduleId}`
              : `/modules/${moduleId}/lessons/${firstLessonId}`,
          )
        }
      />
    )
  }

  const unansweredIds = new Set(unanswered.map((question) => question.id))

  return (
    <section className="max-w-4xl px-12 py-10">
      <h1 className="text-4xl font-semibold text-slate-700">
        Module {moduleId} Quiz
      </h1>
      <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-12">
        {quiz.questions.map((question, index) => (
          <QuizQuestion
            key={question.id}
            question={question}
            number={index + 1}
            value={values[question.id] ?? ''}
            invalid={attemptedSubmit && !isAnswered(values[question.id])}
            onChange={(value) =>
              setValues((current) => ({ ...current, [question.id]: value }))
            }
          />
        ))}
        {attemptedSubmit && unansweredIds.size > 0 ? (
          <p role="alert" className="text-base text-destructive">
            Answer every question before submitting. Unanswered:{' '}
            {quiz.questions
              .flatMap((question, index) =>
                unansweredIds.has(question.id) ? [index + 1] : [],
              )
              .join(', ')}
            .
          </p>
        ) : null}
        {submitError ? (
          <p role="alert" className="text-base text-destructive">
            {submitError}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={lastLessonId == null}
            onClick={() =>
              void navigate(`/modules/${moduleId}/lessons/${lastLessonId}`)
            }
          >
            Previous
          </Button>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      </form>
    </section>
  )
}
