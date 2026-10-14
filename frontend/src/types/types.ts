export type Lesson = {
  id: number
  title: string
  body: string
  video_url: string | null
  previous_lesson_id: number | null
  next_lesson_id: number | null
}

export type LessonSummary = {
  id: number
  title: string
}

export type Module = {
  id: number
  title: string
  description: string
  display_order: number
  lessons: LessonSummary[]
}

export type CourseContextValue = {
  modules: Module[] | null
  loading: boolean
  error: Error | null
}
