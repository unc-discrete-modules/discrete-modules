import { FieldSet } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import type { FreeResponseQuestion as FreeResponseQuestionType } from '@/types/types'
import { MAX_ANSWER_LENGTH } from '@/lib/quiz-answers'
import QuestionPrompt from './QuestionPrompt'
import type { QuestionInputProps } from './question-props'

export default function FreeResponseQuestion({
  question,
  number,
  value,
  invalid,
  onChange,
}: QuestionInputProps<FreeResponseQuestionType>) {
  return (
    <FieldSet>
      <QuestionPrompt
        number={number}
        prompt={question.prompt}
        invalid={invalid}
      />
      <Textarea
        aria-label={`Answer to question ${number}`}
        aria-invalid={invalid}
        maxLength={MAX_ANSWER_LENGTH}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldSet>
  )
}
