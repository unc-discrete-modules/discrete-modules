import { useEffect, useState } from 'react'
import { getQuiz } from '@/api/client'
import type { Quiz } from '@/types/types'

type QuizResult = {
  moduleId: number
  attempt: number
  quiz: Quiz | null
  error: Error | null
}

export function useQuiz(moduleId: number, enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<QuizResult | null>(null)

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()

    getQuiz(moduleId, controller.signal)
      .then((quiz) => {
        setResult({ moduleId, attempt, quiz, error: null })
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
