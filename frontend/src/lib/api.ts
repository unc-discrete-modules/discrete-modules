import type { Lesson } from '@/types/types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getLesson(lessonId: number): Promise<Lesson> {
  return requestJson<Lesson>(`/lessons/${lessonId}`)
}

export type ModuleQuiz = {
  id: number
}

export function getModuleQuiz(moduleId: number): Promise<ModuleQuiz> {
  return requestJson<ModuleQuiz>(`/modules/${moduleId}/quiz`)
}