import { FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { FillInBlankQuestion as FillInBlankQuestionType } from '@/types/types'
import { MAX_ANSWER_LENGTH } from '@/lib/quiz-answers'
import QuestionPrompt from './QuestionPrompt'
import type { QuestionInputProps } from './question-props'

export default function FillInBlankQuestion({
  question,
  number,
  value,
  invalid,
  onChange,
}: QuestionInputProps<FillInBlankQuestionType>) {
  return (
    <FieldSet>
      <QuestionPrompt
        number={number}
        prompt={question.prompt}
        invalid={invalid}
      />
      <Input
        type="text"
        aria-label={`Answer to question ${number}`}
        aria-invalid={invalid}
        maxLength={MAX_ANSWER_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldSet>
  )
}
