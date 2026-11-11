import { useEffect, useState } from 'react'
import { getAdminQuiz } from '@/api/client'
import type { AdminQuiz } from '@/types/types'

type QuizResult = {
  moduleId: number
  attempt: number
  quiz: AdminQuiz | null
  error: Error | null
}

// Loads a module's quiz with its answer keys. Archived questions come back
// too, so callers should skip them.
export function useAdminQuiz(moduleId: number, enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<QuizResult | null>(null)

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()

    getAdminQuiz(moduleId, true, controller.signal)
      .then((quiz) => {
        if (!controller.signal.aborted) {
          setResult({ moduleId, attempt, quiz, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            moduleId,
            attempt,
            quiz: null,
            error:
              error instanceof Error ? error : new Error('Failed to load quiz'),
          })
        }
      })

    return () => controller.abort()
  }, [attempt, enabled, moduleId])

  const currentResult =
    result?.moduleId === moduleId && result.attempt === attempt ? result : null

  return {
    quiz: currentResult?.quiz ?? null,
    loading: enabled && currentResult === null,
    error: currentResult?.error ?? null,
    retry: () => setAttempt((current) => current + 1),
  }
}
