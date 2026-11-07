export type Lesson = {
  id: number
  title: string
  body: string
  video_url: string | null
  previous_lesson_id: number | null
  next_lesson_id: number | null
}

export type ModuleSummary = {
  id: number
  title: string
  description: string
  display_order: number
}

export type Module = ModuleSummary & {
  quiz_id: number | null
  lessons: Lesson[]
}

export type AnswerOption = {
  id: number
  text: string
}

type QuestionBase = {
  id: number
  prompt: string
}

export type MultipleChoiceQuestion = QuestionBase & {
  type: 'multiple_choice'
  options: AnswerOption[]
}

export type FillInBlankQuestion = QuestionBase & { type: 'fill_in_blank' }

export type FreeResponseQuestion = QuestionBase & { type: 'free_response' }

export type Question =
  MultipleChoiceQuestion | FillInBlankQuestion | FreeResponseQuestion

export type Quiz = {
  id: number
  questions: Question[]
}

export type Answer =
  | { question_id: number; type: 'multiple_choice'; option_id: number }
  | {
      question_id: number
      type: 'fill_in_blank' | 'free_response'
      text: string
    }

export type QuestionResult = {
  question_id: number
  correct: boolean | null
  correct_answer: string
  correct_option_id?: number | null
}

export type SubmissionResult = {
  results: QuestionResult[]
}

export type CourseContextValue = {
  modules: ModuleSummary[] | null
  loading: boolean
  error: Error | null
}
