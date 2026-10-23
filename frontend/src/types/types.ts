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
  has_quiz: boolean
  lessons: Lesson[]
}

export type CourseContextValue = {
  modules: ModuleSummary[] | null
  loading: boolean
  error: Error | null
}
