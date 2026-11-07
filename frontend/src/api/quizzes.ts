import { apiFetch } from '@/api'
import type { Answer, Question, Quiz, SubmissionResult } from '@/types/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isQuestion(value: unknown): value is Question {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    typeof value.prompt !== 'string'
  ) {
    return false
  }
  switch (value.type) {
    case 'multiple_choice':
      return (
        Array.isArray(value.options) &&
        value.options.every(
          (option: unknown) =>
            isRecord(option) &&
            typeof option.id === 'number' &&
            typeof option.text === 'string',
        )
      )
    case 'fill_in_blank':
    case 'free_response':
      return true
    default:
      return false
  }
}

function isQuiz(value: unknown): value is Quiz {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    Array.isArray(value.questions) &&
    value.questions.every(isQuestion)
  )
}

function isSubmissionResult(value: unknown): value is SubmissionResult {
  return (
    isRecord(value) &&
    Array.isArray(value.results) &&
    value.results.every(
      (result: unknown) =>
        isRecord(result) &&
        typeof result.question_id === 'number' &&
        (result.correct === null || typeof result.correct === 'boolean') &&
        typeof result.correct_answer === 'string',
    )
  )
}

export async function fetchModuleQuiz(
  moduleId: number,
  signal?: AbortSignal,
): Promise<Quiz> {
  const response = await apiFetch(`/modules/${moduleId}/quiz`, { signal })
  if (!response.ok) {
    throw new Error(`Failed to load quiz: ${response.status}`)
  }
  const value: unknown = await response.json()
  if (!isQuiz(value)) {
    throw new Error('The quiz API returned an invalid response')
  }
  return value
}

export async function submitQuiz(
  quizId: number,
  answers: Answer[],
  csrfToken: string,
): Promise<SubmissionResult> {
  const response = await apiFetch(`/quizzes/${quizId}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ answers }),
  })
  if (!response.ok) {
    throw new Error(`Failed to submit quiz: ${response.status}`)
  }
  const value: unknown = await response.json()
  if (!isSubmissionResult(value)) {
    throw new Error('The submission API returned an invalid response')
  }
  return value
}
