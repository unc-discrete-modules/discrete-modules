import { useEffect, useRef } from 'react'
import { CircleCheckIcon, CircleXIcon } from 'lucide-react'
import LessonContent from '@/components/lesson/LessonContent'
import { Button } from '@/components/ui/button'
import type { AnswerValues } from '@/lib/quiz-answers'
import type {
  Question,
  Quiz,
  QuestionResult,
  SubmissionResult,
} from '@/types/types'
import MathText from './MathText'

type QuizFeedbackProps = {
  quiz: Quiz
  values: AnswerValues
  result: SubmissionResult
  onRetry: () => void
  onBack: () => void
}

function Verdict({ correct }: { correct: boolean | null }) {
  if (correct === null) {
    return (
      <p className="font-medium text-slate-600">
        Not graded: compare your answer with the model answer.
      </p>
    )
  }
  const Icon = correct ? CircleCheckIcon : CircleXIcon
  return (
    <p
      className={`flex items-center gap-2 font-medium ${correct ? 'text-green-700' : 'text-red-700'}`}
    >
      <Icon aria-hidden className="size-5" />
      {correct ? 'Correct' : 'Incorrect'}
    </p>
  )
}

function StudentAnswer({
  question,
  value,
}: {
  question: Question
  value: string
}) {
  if (question.type === 'multiple_choice') {
    const option = question.options.find((item) => String(item.id) === value)
    return <MathText>{option?.text ?? ''}</MathText>
  }
  return <p className="whitespace-pre-wrap">{value}</p>
}

// Model answers for free response are multi-line Markdown, such as numbered
// proof steps, so they need block rendering.
function CorrectAnswer({
  question,
  result,
}: {
  question: Question
  result: QuestionResult
}) {
  if (question.type === 'free_response') {
    return <LessonContent body={result.correct_answer} />
  }
  return <MathText>{result.correct_answer}</MathText>
}

export default function QuizFeedback({
  quiz,
  values,
  result,
  onRetry,
  onBack,
}: QuizFeedbackProps) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])

  const resultsById = new Map(
    result.results.map((item) => [item.question_id, item]),
  )
  const graded = result.results.filter((item) => item.correct !== null)
  const correctCount = graded.filter((item) => item.correct).length

  return (
    <section className="max-w-4xl px-12 py-10">
      <h1
        ref={heading}
        tabIndex={-1}
        className="text-4xl font-semibold text-slate-700 outline-none"
      >
        Quiz results
      </h1>
      <p className="mt-4 text-xl font-medium text-slate-700">
        Score: {correctCount} of {graded.length} auto-graded questions correct
      </p>
      {graded.length < result.results.length ? (
        <p className="mt-1 text-base text-slate-500">
          Free response questions are not graded. Compare your work with the
          model answer.
        </p>
      ) : null}
      <ol className="mt-8 space-y-10">
        {quiz.questions.map((question, index) => {
          const questionResult = resultsById.get(question.id)
          if (!questionResult) return null
          return (
            <li key={question.id} className="space-y-3">
              <div>
                <span className="block text-sm text-slate-500">
                  Question {index + 1}
                </span>
                <span className="text-lg font-medium">
                  <MathText>{question.prompt}</MathText>
                </span>
              </div>
              <Verdict correct={questionResult.correct} />
              <dl className="space-y-3 text-base text-slate-700">
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    Your answer
                  </dt>
                  <dd>
                    <StudentAnswer
                      question={question}
                      value={values[question.id] ?? ''}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-slate-500">
                    {question.type === 'free_response'
                      ? 'Model answer'
                      : 'Correct answer'}
                  </dt>
                  <dd>
                    <CorrectAnswer
                      question={question}
                      result={questionResult}
                    />
                  </dd>
                </div>
              </dl>
            </li>
          )
        })}
      </ol>
      <div className="mt-10 flex gap-3">
        <Button type="button" variant="outline" size="lg" onClick={onBack}>
          Back to module
        </Button>
        <Button type="button" size="lg" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </section>
  )
}
