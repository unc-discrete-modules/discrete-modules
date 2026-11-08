import type { Answer, Question } from '@/types/types'

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
