import type { QuizInput } from '@/types/types'

export type QuestionType = QuizInput['questions'][number]['type']

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple choice',
  fill_in_blank: 'Fill in the blank',
  free_response: 'Free response',
}

// Same limits as the API.
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 26

export type DraftOption = { id: string; text: string; correct: boolean }

// `id` doubles as the question's permanent key. It is random rather than
// numbered so that a quiz built here never reuses the key of an archived
// question, which would bring that question's old student responses back.
export type DraftQuestion = {
  id: string
  type: QuestionType
  prompt: string
  answer: string
  options: DraftOption[]
}

export function createOption(): DraftOption {
  return { id: crypto.randomUUID(), text: '', correct: false }
}

export function createQuestion(type: QuestionType): DraftQuestion {
  return {
    id: `q-${crypto.randomUUID()}`,
    type,
    prompt: '',
    answer: '',
    options: type === 'multiple_choice' ? [createOption(), createOption()] : [],
  }
}

export type QuestionProblems = {
  prompt?: string
  answer?: string
  options?: string
  emptyOptionIds: string[]
}

// Mirrors the API's rules so mistakes are caught before a request is made;
// the API still has the final say.
export function questionProblems(
  question: DraftQuestion,
): QuestionProblems | null {
  const problems: QuestionProblems = { emptyOptionIds: [] }

  if (!question.prompt.trim()) problems.prompt = 'Enter the question.'

  if (question.type === 'multiple_choice') {
    problems.emptyOptionIds = question.options
      .filter((option) => !option.text.trim())
      .map((option) => option.id)
    if (question.options.length < MIN_OPTIONS) {
      problems.options = `Add at least ${MIN_OPTIONS} options.`
    } else if (problems.emptyOptionIds.length > 0) {
      problems.options = 'Fill in every option, or remove the empty ones.'
    } else if (!question.options.some((option) => option.correct)) {
      problems.options = 'Choose the correct option.'
    }
  } else if (!question.answer.trim()) {
    problems.answer =
      question.type === 'fill_in_blank'
        ? 'Enter the correct answer.'
        : 'Enter a model answer.'
  }

  const hasProblems = problems.prompt || problems.answer || problems.options
  return hasProblems ? problems : null
}

export function toQuizInput(questions: DraftQuestion[]): QuizInput {
  return {
    questions: questions.map((question) => {
      const base = {
        key: question.id,
        type: question.type,
        prompt: question.prompt.trim(),
      }
      return question.type === 'multiple_choice'
        ? {
            ...base,
            options: question.options.map((option) => ({
              text: option.text.trim(),
              correct: option.correct,
            })),
          }
        : { ...base, answer: question.answer.trim() }
    }),
  }
}
