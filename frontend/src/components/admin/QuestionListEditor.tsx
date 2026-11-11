/** The questions of a quiz, with controls to add, edit, reorder and remove them. */

import { useEffect, useRef, useState } from 'react'
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  QUESTION_TYPE_LABELS,
  createQuestion,
  type DraftQuestion,
  type QuestionType,
} from '@/lib/quiz-draft'
import QuestionEditor from './QuestionEditor'
import QuestionReorderRow from './QuestionReorderRow'
import ReorderButton from './ReorderButton'

type QuestionListEditorProps = {
  questions: DraftQuestion[]
  onChange: (questions: DraftQuestion[]) => void
  // Whether to point out questions that are incomplete.
  showProblems: boolean
}

const QUESTION_TYPES = Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]

export default function QuestionListEditor({
  questions,
  onChange,
  showProblems,
}: QuestionListEditorProps) {
  // While reordering, questions are shown as short rows that are easy to drag
  // instead of as full editors, as lessons are in the module editor.
  const [reordering, setReordering] = useState(false)
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
    focusAfterRender.current = question.id
    onChange([...questions, question])
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.canceled) return
    const source = event.operation.source
    if (
      typeof source?.id !== 'string' ||
      !('index' in source) ||
      typeof source.index !== 'number'
    ) {
      return
    }

    const fromIndex = questions.findIndex(
      (question) => question.id === source.id,
    )
    const toIndex = source.index
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      toIndex >= questions.length ||
      fromIndex === toIndex
    ) {
      return
    }

    const next = [...questions]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    onChange(next)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-muted-navy">Questions</h2>
        <ReorderButton
          reordering={reordering}
          doneLabel="Done"
          disabled={questions.length < 2}
          onClick={() => setReordering((current) => !current)}
        />
      </div>

      {reordering ? (
        <>
          <p className="text-sm text-muted-foreground">
            Drag the handles to put the questions in order, then choose Done.
          </p>
          <DragDropProvider onDragEnd={handleDragEnd}>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <QuestionReorderRow
                  key={question.id}
                  id={question.id}
                  index={index}
                  type={question.type}
                  prompt={question.prompt}
                />
              ))}
            </div>
          </DragDropProvider>
        </>
      ) : (
        <>
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
              showProblems={showProblems}
              onChange={(changes) =>
                onChange(
                  questions.map((item) =>
                    item.id === question.id ? { ...item, ...changes } : item,
                  ),
                )
              }
              onRemove={() =>
                onChange(questions.filter((item) => item.id !== question.id))
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
        </>
      )}
    </div>
  )
}
