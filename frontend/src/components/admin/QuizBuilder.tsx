/** Builds a new quiz question by question, with an answer key for each. */

import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createQuestion,
  firstInvalidQuestion,
  toQuizInput,
  type DraftQuestion,
} from '@/lib/quiz-draft'
import type { QuizInput } from '@/types/types'
import CancelButton from './CancelButton'
import { CreateFillButton } from './CreateButton'
import QuestionListEditor from './QuestionListEditor'

type QuizBuilderProps = {
  cancelTo: string
  // A rejection's message is shown to the user.
  onSave: (quiz: QuizInput) => Promise<void>
  onSaved: () => void
}

export default function QuizBuilder({
  cancelTo,
  onSave,
  onSaved,
}: QuizBuilderProps) {
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [
    createQuestion('multiple_choice'),
  ])
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setAttempted(true)
    setError(null)

    if (questions.length === 0) {
      setError('Add at least one question.')
      return
    }
    const firstInvalid = firstInvalidQuestion(questions)
    if (firstInvalid) {
      setError('Fix the highlighted questions.')
      document.getElementById(`question-${firstInvalid.id}`)?.focus()
      return
    }

    setSubmitting(true)
    try {
      await onSave(toQuizInput(questions))
      onSaved()
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not create the quiz. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Quiz builder"
      className="max-w-4xl space-y-5"
    >
      {/* Locked while saving: the page moves on once the quiz is saved, which
          would discard anything changed meanwhile. */}
      <fieldset disabled={submitting} className="min-w-0">
        <QuestionListEditor
          questions={questions}
          onChange={setQuestions}
          showProblems={attempted}
        />
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Link to={cancelTo}>
          <CancelButton />
        </Link>
        <CreateFillButton type="submit" disabled={submitting} />
      </div>
    </form>
  )
}
