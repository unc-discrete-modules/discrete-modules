import type { components } from '@/api/schema'

type Schemas = components['schemas']
export type ModuleProgress = Schemas['ModuleProgress']
export type LessonCompletionResponse = Schemas['LessonCompletionResponse']
export type Lesson = Schemas['Lesson']
export type LessonSummary = Schemas['LessonSummary']
export type ModuleSummary = Schemas['ModuleSummary']
export type Module = Schemas['Module']
export type ModuleResponse = Schemas['ModuleResponse']
export type LessonInput = Schemas['LessonInput']
export type LessonPatch = Schemas['LessonPatch']
export type QuizInput = Schemas['QuizInput']
export type AdminQuiz = Schemas['QuizResponse']
export type LessonResponse = Schemas['LessonResponse']
export type Quiz = Schemas['Quiz']
export type Question = Quiz['questions'][number]
export type AnswerOption = Schemas['AnswerOption']
export type SubmissionRequest = Schemas['SubmissionRequest']
export type Answer = SubmissionRequest['answers'][number]
export type SubmissionResult = Schemas['SubmissionResult']
export type QuestionResult = Schemas['QuestionResult']
export type ErrorResponse = Schemas['ErrorResponse']
export type MultipleChoiceQuestion = Schemas['MultipleChoiceQuestion']
export type FillInBlankQuestion = Schemas['FillInBlankQuestion']
export type FreeResponseQuestion = Schemas['FreeResponseQuestion']

export type CourseContextValue = {
  modules: ModuleSummary[] | null
  loading: boolean
  error: Error | null
  retry: () => void
  updateModuleOrder: (ids: number[]) => void
  updateModuleTitle: (moduleId: number, title: string) => void
}
