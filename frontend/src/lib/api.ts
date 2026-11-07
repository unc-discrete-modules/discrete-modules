import { apiFetch } from '@/api'
import type { Lesson } from '@/types/types'

async function requestJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getLesson(lessonId: number): Promise<Lesson> {
  return requestJson<Lesson>(`/lessons/${lessonId}`)
}
