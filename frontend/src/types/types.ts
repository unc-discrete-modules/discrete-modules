export type Lesson = {
  id: number
  title: string
  body?: string
  video_url?: string
  previous_lesson_id?: number
  next_lesson_id?: 0
}

export type Module = {
  id: number
  title: string
  description: string
  display_order: number
  lessons: Lesson[]
}

export type CourseContextValue = {
  modules: Module[] | null
  loading: boolean
  error: Error | null
}
