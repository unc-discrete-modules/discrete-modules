import { FieldSet } from '@/components/ui/field'
import type { MultipleChoiceQuestion as MultipleChoiceQuestionType } from '@/types/types'
import MathText from './MathText'
import QuestionPrompt from './QuestionPrompt'
import type { QuestionInputProps } from './question-props'

export default function MultipleChoiceQuestion({
  question,
  number,
  value,
  invalid,
  onChange,
}: QuestionInputProps<MultipleChoiceQuestionType>) {
  return (
    <FieldSet>
      <QuestionPrompt
        number={number}
        prompt={question.prompt}
        invalid={invalid}
      />
      <div className="flex flex-col gap-2">
        {question.options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-base has-checked:border-primary has-checked:bg-secondary"
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.id}
              checked={value === String(option.id)}
              onChange={() => onChange(String(option.id))}
              className="size-4 accent-primary"
            />
            <MathText>{option.text}</MathText>
          </label>
        ))}
      </div>
    </FieldSet>
  )
}
