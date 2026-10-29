import { useEffect, useState } from 'react'
import { getLesson } from '@/api/client'
import type { Lesson } from '../types/types'

export function useLesson(lessonId?: string) {
  const parsedLessonId = Number(lessonId)
  const validLessonId =
    Number.isSafeInteger(parsedLessonId) && parsedLessonId > 0
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    attempt: number
    lessonId: number
    lesson: Lesson | null
    error: Error | null
  } | null>(null)

  useEffect(() => {
    if (!validLessonId) return

    const controller = new AbortController()

    getLesson(parsedLessonId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setResult({
          attempt,
          lessonId: parsedLessonId,
          lesson: data,
          error: null,
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setResult({
          attempt,
          lessonId: parsedLessonId,
          lesson: null,
          error:
            error instanceof Error
              ? error
              : new Error('Unable to load this lesson.'),
        })
      })

    return () => {
      controller.abort()
    }
  }, [attempt, parsedLessonId, validLessonId])

  const retry = () => setAttempt((value) => value + 1)

  if (!validLessonId) {
    return {
      lesson: null,
      loading: false,
      error: new Error('Lesson not found'),
      retry: undefined,
    }
  }

  if (result?.lessonId !== parsedLessonId || result.attempt !== attempt) {
    return { lesson: null, loading: true, error: null, retry }
  }

  return { lesson: result.lesson, loading: false, error: result.error, retry }
}
