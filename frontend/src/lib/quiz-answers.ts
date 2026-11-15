import type {
  Answer,
  AttemptSummary,
  AttemptDetail,
  Question,
} from '@/types/types'

export const MAX_ANSWER_LENGTH = 10_000

export type AnswerValues = Record<number, string>

export function isAnswered(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== ''
}

export function unansweredQuestions(
  questions: Question[],
  values: AnswerValues,
): Question[] {
  return questions.filter((question) => !isAnswered(values[question.id]))
}

export function buildAnswers(
  questions: Question[],
  values: AnswerValues,
): Answer[] {
  return questions.map((question): Answer => {
    const value = values[question.id]
    if (question.type === 'multiple_choice') {
      return {
        question_id: question.id,
        type: question.type,
        option_id: Number(value),
      }
    }
    return { question_id: question.id, type: question.type, text: value }
  })
}

// Multiple choice values are option ids, matching what the quiz form produces.
export function answerValuesFromAttempt(attempt: AttemptDetail): AnswerValues {
  return Object.fromEntries(
    attempt.answers.map((answer) => [
      answer.question_id,
      answer.option_id != null ? String(answer.option_id) : (answer.text ?? ''),
    ]),
  )
}

// Compares fractions because the number of graded questions can differ between
// attempts. Ties go to the latest, which comes first in the newest-first list.
export function bestAttempt(
  attempts: AttemptSummary[],
): AttemptSummary | undefined {
  const fraction = (attempt: AttemptSummary) =>
    attempt.max_score ? attempt.score / attempt.max_score : 0
  return attempts.reduce<AttemptSummary | undefined>(
    (best, attempt) =>
      best === undefined || fraction(attempt) > fraction(best) ? attempt : best,
    undefined,
  )
}
