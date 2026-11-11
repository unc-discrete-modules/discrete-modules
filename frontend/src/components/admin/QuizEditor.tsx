/** Edits an existing quiz: its questions, answer keys and their order. */

import { useState, type SubmitEvent } from 'react'
import { replaceQuiz } from '@/api/client'
import { Button } from '@/components/ui/button'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes'
import {
  draftsFromQuiz,
  firstInvalidQuestion,
  quizSnapshot,
  toQuizInput,
  type DraftQuestion,
} from '@/lib/quiz-draft'
import { explainQuizError } from '@/lib/quiz-save'
import type { AdminQuiz } from '@/types/types'
import BackToModuleLink from './BackToModuleLink'
import QuestionListEditor from './QuestionListEditor'

type QuizEditorProps = {
  quiz: AdminQuiz
  csrfToken: string
}

export default function QuizEditor({ quiz, csrfToken }: QuizEditorProps) {
  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    draftsFromQuiz(quiz),
  )
  // What the server has, so unsaved changes can be told apart from saved ones.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    quizSnapshot(questions),
  )
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const dirty = quizSnapshot(questions) !== savedSnapshot
  const confirmLeave = useUnsavedChangesGuard(dirty)

  function change(next: DraftQuestion[]) {
    setNotice(null)
    setQuestions(next)
  }

  async function handleSave(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !dirty) return
    setAttempted(true)
    setError(null)
    setNotice(null)

    if (questions.length === 0) {
      setError(
        'A quiz needs at least one question. To remove the quiz, delete it in the module editor.',
      )
      return
    }
    const firstInvalid = firstInvalidQuestion(questions)
    if (firstInvalid) {
      setError('Fix the highlighted questions.')
      document.getElementById(`question-${firstInvalid.id}`)?.focus()
      return
    }

    setSaving(true)
    try {
      const updated = await replaceQuiz(
        csrfToken,
        quiz.id,
        toQuizInput(questions),
      )
      // Show what the server stored.
      const stored = draftsFromQuiz(updated)
      setQuestions(stored)
      setSavedSnapshot(quizSnapshot(stored))
      setAttempted(false)
      setNotice('Saved.')
    } catch (reason) {
      const shown = explainQuizError(reason)
      setError(
        shown instanceof Error
          ? shown.message
          : 'Could not save the quiz. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-10">
      <div className="py-5">
        <BackToModuleLink moduleId={quiz.module_id} onClick={confirmLeave} />
        <h1 className="text-3xl font-bold text-muted-navy">Edit quiz</h1>
        <p className="text-muted-foreground">
          Questions you remove are hidden from students, and the answers they
          already gave are kept.
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSave}
        aria-label="Quiz editor"
        className="max-w-4xl space-y-5"
      >
        <QuestionListEditor
          questions={questions}
          onChange={change}
          showProblems={attempted}
          disabled={saving}
        />

        {notice && (
          <p role="status" className="text-sm font-bold text-muted-navy">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={!dirty || saving}
            className="rounded-md bg-primary font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:bg-primary hover:saturate-130 hover:scale-102 disabled:hover:scale-100 disabled:hover:saturate-100"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {dirty && (
            <span className="text-sm text-muted-foreground">
              You have unsaved changes.
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
