/** Builds a quiz question by question, with an answer key for each. */

import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  QUESTION_TYPE_LABELS,
  createQuestion,
  questionProblems,
  toQuizInput,
  type DraftQuestion,
  type QuestionType,
} from '@/lib/quiz-draft'
import type { QuizInput } from '@/types/types'
import CancelButton from './CancelButton'
import { CreateFillButton } from './CreateButton'
import QuestionEditor from './QuestionEditor'

type QuizBuilderProps = {
  cancelTo: string
  // A rejection's message is shown to the user.
  onSave: (quiz: QuizInput) => Promise<void>
  onSaved: () => void
}

const QUESTION_TYPES = Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]

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
  // A question just added, to move keyboard focus to its text once it renders.
  const focusAfterRender = useRef<string | null>(null)

  useEffect(() => {
    const id = focusAfterRender.current
    if (!id) return
    focusAfterRender.current = null
    document
      .getElementById(`question-${id}`)
      ?.querySelector('textarea')
      ?.focus()
  }, [questions])

  function addQuestion(type: QuestionType) {
    const question = createQuestion(type)
    setQuestions((current) => [...current, question])
    focusAfterRender.current = question.id
  }

  function updateQuestion(id: string, changes: Partial<DraftQuestion>) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...changes } : question,
      ),
    )
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((current) => {
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(index + direction, 0, moved)
      return next
    })
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setAttempted(true)
    setError(null)

    if (questions.length === 0) {
      setError('Add at least one question.')
      return
    }
    const firstInvalid = questions.find((question) =>
      questionProblems(question),
    )
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
      {questions.length === 0 && (
        <p className="text-muted-foreground">
          No questions yet. Add one below.
        </p>
      )}
      {questions.map((question, index) => (
        <QuestionEditor
          key={question.id}
          question={question}
          number={index + 1}
          total={questions.length}
          showProblems={attempted}
          onChange={(changes) => updateQuestion(question.id, changes)}
          onMove={(direction) => moveQuestion(index, direction)}
          onRemove={() =>
            setQuestions((current) =>
              current.filter((item) => item.id !== question.id),
            )
          }
        />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-muted-navy">Add question:</span>
        {QUESTION_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addQuestion(type)}
          >
            <Plus aria-hidden="true" />
            {QUESTION_TYPE_LABELS[type]}
          </Button>
        ))}
      </div>

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
