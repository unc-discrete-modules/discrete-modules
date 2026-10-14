export type Lesson = {
  id: number
  title: string
  body: string
  video_url: string | null
  previous_lesson_id: number | null
  next_lesson_id: number | null
}