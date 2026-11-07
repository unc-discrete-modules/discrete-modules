import type { Question } from '@/types/types'
import FillInBlankQuestion from './FillInBlankQuestion'
import FreeResponseQuestion from './FreeResponseQuestion'
import MultipleChoiceQuestion from './MultipleChoiceQuestion'
import type { QuestionInputProps } from './question-props'

export default function QuizQuestion({
  question,
  ...props
}: QuestionInputProps<Question>) {
  return (
    <div id={`question-${question.id}`} tabIndex={-1} className="outline-none">
      {question.type === 'multiple_choice' ? (
        <MultipleChoiceQuestion question={question} {...props} />
      ) : question.type === 'fill_in_blank' ? (
        <FillInBlankQuestion question={question} {...props} />
      ) : (
        <FreeResponseQuestion question={question} {...props} />
      )}
    </div>
  )
}
