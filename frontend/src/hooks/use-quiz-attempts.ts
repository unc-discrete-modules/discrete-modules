import { useEffect, useState } from 'react'
import { getQuizAttempts } from '@/api/client'
import type { AttemptSummary } from '@/types/types'

type AttemptsResult = {
  quizId: number
  attempt: number
  attempts: AttemptSummary[] | null
  error: Error | null
}

export function useQuizAttempts(quizId: number) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<AttemptsResult | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    getQuizAttempts(quizId, controller.signal)
      .then((attempts) => {
        setResult({ quizId, attempt, attempts, error: null })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            quizId,
            attempt,
            attempts: null,
            error:
              error instanceof Error
                ? error
                : new Error('Failed to load past attempts'),
          })
        }
      })

    return () => controller.abort()
  }, [attempt, quizId])

  const current =
    result?.quizId === quizId && result.attempt === attempt ? result : null

  return {
    attempts: current?.attempts ?? null,
    loading: current === null,
    error: current?.error ?? null,
    retry: () => setAttempt((value) => value + 1),
  }
}
