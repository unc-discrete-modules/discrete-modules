import type { AdminQuiz, QuizInput } from '@/types/types'

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

export function firstInvalidQuestion(
  questions: DraftQuestion[],
): DraftQuestion | undefined {
  return questions.find((question) => questionProblems(question))
}

// Turns a saved quiz into drafts. A saved question keeps its key, which is how
// the server recognizes it as the same question, with its student responses,
// when the quiz is saved again.
export function draftsFromQuiz(quiz: AdminQuiz): DraftQuestion[] {
  return quiz.questions
    .filter((question) => !question.archived)
    .map((question) => ({
      id: question.key,
      type: question.type,
      prompt: question.prompt,
      answer: question.answer ?? '',
      options: (question.options ?? []).map((option) => ({
        ...createOption(),
        text: option.text,
        correct: option.correct,
      })),
    }))
}

// What would be saved, so two sets of drafts can be compared without being
// thrown by the random ids that only identify options on screen.
export function quizSnapshot(questions: DraftQuestion[]): string {
  return JSON.stringify(toQuizInput(questions))
}
