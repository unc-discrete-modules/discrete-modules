/** Editor for one quiz question and its answer key. */

import { useId } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MAX_ANSWER_LENGTH } from '@/lib/quiz-answers'
import {
  MAX_OPTIONS,
  MIN_OPTIONS,
  QUESTION_TYPE_LABELS,
  createOption,
  questionProblems,
  type DraftQuestion,
} from '@/lib/quiz-draft'

type QuestionEditorProps = {
  question: DraftQuestion
  number: number
  showProblems: boolean
  onChange: (changes: Partial<DraftQuestion>) => void
  onRemove: () => void
}

function Problem({ id, children }: { id: string; children?: string }) {
  return children ? (
    <p id={id} className="text-sm text-red-700">
      {children}
    </p>
  ) : null
}

export default function QuestionEditor({
  question,
  number,
  showProblems,
  onChange,
  onRemove,
}: QuestionEditorProps) {
  const baseId = useId()
  const problems = showProblems ? questionProblems(question) : null

  function setOption(id: string, changes: { text?: string }) {
    onChange({
      options: question.options.map((option) =>
        option.id === id ? { ...option, ...changes } : option,
      ),
    })
  }

  // Exactly one option is correct, so choosing one clears the others.
  function setCorrect(id: string) {
    onChange({
      options: question.options.map((option) => ({
        ...option,
        correct: option.id === id,
      })),
    })
  }

  const answerLabel =
    question.type === 'fill_in_blank' ? 'Correct answer' : 'Model answer'

  return (
    <fieldset
      id={`question-${question.id}`}
      tabIndex={-1}
      className="space-y-4 rounded-md border-3 border-stone-200 bg-white p-4 outline-none"
    >
      <legend className="px-2 text-lg font-bold text-muted-navy">
        Question {number}: {QUESTION_TYPE_LABELS[question.type]}
      </legend>

      <div className="space-y-1">
        <Label
          htmlFor={`${baseId}-prompt`}
          className="font-bold text-muted-navy"
        >
          Question text
        </Label>
        <p
          id={`${baseId}-prompt-hint`}
          className="text-sm text-muted-foreground"
        >
          Markdown and LaTeX (such as $x^2$) are supported.
          {question.type === 'fill_in_blank' &&
            ' Write ______ where the blank goes.'}
        </p>
        <Textarea
          id={`${baseId}-prompt`}
          aria-describedby={`${baseId}-prompt-hint ${baseId}-prompt-problem`}
          aria-invalid={Boolean(problems?.prompt)}
          maxLength={MAX_ANSWER_LENGTH}
          value={question.prompt}
          onChange={(event) => onChange({ prompt: event.target.value })}
        />
        <Problem id={`${baseId}-prompt-problem`}>{problems?.prompt}</Problem>
      </div>

      {question.type === 'multiple_choice' ? (
        <div className="space-y-2">
          <p className="font-bold text-muted-navy">
            Options{' '}
            <span className="text-sm font-normal text-muted-foreground">
              (select the correct one)
            </span>
          </p>
          <ul className="space-y-2">
            {question.options.map((option, index) => (
              <li key={option.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${baseId}-correct`}
                  checked={option.correct}
                  onChange={() => setCorrect(option.id)}
                  aria-label={`Option ${index + 1} is correct`}
                  className="size-4 shrink-0 accent-primary"
                />
                <Input
                  aria-label={`Option ${index + 1} text`}
                  aria-invalid={problems?.emptyOptionIds.includes(option.id)}
                  maxLength={MAX_ANSWER_LENGTH}
                  value={option.text}
                  onChange={(event) =>
                    setOption(option.id, { text: event.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove option ${index + 1}`}
                  disabled={question.options.length <= MIN_OPTIONS}
                  onClick={() =>
                    onChange({
                      options: question.options.filter(
                        (item) => item.id !== option.id,
                      ),
                    })
                  }
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          <Problem id={`${baseId}-options-problem`}>
            {problems?.options}
          </Problem>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={question.options.length >= MAX_OPTIONS}
            onClick={() =>
              onChange({ options: [...question.options, createOption()] })
            }
          >
            <Plus aria-hidden="true" />
            Add option
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <Label
            htmlFor={`${baseId}-answer`}
            className="font-bold text-muted-navy"
          >
            {answerLabel}
          </Label>
          <p
            id={`${baseId}-answer-hint`}
            className="text-sm text-muted-foreground"
          >
            {question.type === 'fill_in_blank'
              ? 'Student answers match regardless of capital letters and extra spaces.'
              : 'Shown to students after they submit. Free responses are not graded.'}
          </p>
          {question.type === 'fill_in_blank' ? (
            <Input
              id={`${baseId}-answer`}
              aria-describedby={`${baseId}-answer-hint ${baseId}-answer-problem`}
              aria-invalid={Boolean(problems?.answer)}
              maxLength={MAX_ANSWER_LENGTH}
              value={question.answer}
              onChange={(event) => onChange({ answer: event.target.value })}
            />
          ) : (
            <Textarea
              id={`${baseId}-answer`}
              aria-describedby={`${baseId}-answer-hint ${baseId}-answer-problem`}
              aria-invalid={Boolean(problems?.answer)}
              maxLength={MAX_ANSWER_LENGTH}
              value={question.answer}
              onChange={(event) => onChange({ answer: event.target.value })}
            />
          )}
          <Problem id={`${baseId}-answer-problem`}>{problems?.answer}</Problem>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Remove question ${number}`}
          className="font-bold text-delete-red hover:text-delete-red"
          onClick={onRemove}
        >
          Remove question
        </Button>
      </div>
    </fieldset>
  )
}
