import { useEffect, useState } from 'react'
import { getAdminLesson } from '@/api/client'
import type { LessonResponse } from '@/types/types'

type LessonResult = {
  lessonId: number
  attempt: number
  lesson: LessonResponse | null
  error: Error | null
}

export function useAdminLesson(lessonId: number, enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<LessonResult | null>(null)

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()

    getAdminLesson(lessonId, controller.signal)
      .then((lesson) => {
        if (!controller.signal.aborted) {
          setResult({ lessonId, attempt, lesson, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            lessonId,
            attempt,
            lesson: null,
            error:
              error instanceof Error
                ? error
                : new Error('Failed to load lesson'),
          })
        }
      })

    return () => controller.abort()
  }, [attempt, enabled, lessonId])

  const currentResult =
    result?.lessonId === lessonId && result.attempt === attempt ? result : null

  return {
    lesson: currentResult?.lesson ?? null,
    loading: enabled && currentResult === null,
    error: currentResult?.error ?? null,
    retry: () => setAttempt((current) => current + 1),
  }
}
