import { useEffect, useState } from 'react'
import { completeLesson, getMyProgress } from '@/api/client'
import type { ModuleProgress } from '@/types/types'
import { ProgressContext } from './progress-context-value'

export function ProgressProvider({
  children,
  csrfToken,
}: {
  children: React.ReactNode
  csrfToken: string
}) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    attempt: number
    progress: ModuleProgress[] | null
    error: Error | null
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getMyProgress(controller.signal)
      .then((progress) => {
        if (!controller.signal.aborted)
          setResult({ attempt, progress, error: null })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            attempt,
            progress: null,
            error:
              error instanceof Error
                ? error
                : new Error('Unable to load progress.'),
          })
      })
    return () => controller.abort()
  }, [attempt])

  const current = result?.attempt === attempt ? result : null
  async function complete(moduleId: number, lessonId: number) {
    await completeLesson(lessonId, csrfToken)
    setResult((previous) =>
      previous?.attempt === attempt && previous.progress
        ? {
            ...previous,
            progress: previous.progress.map((item) =>
              item.module_id === moduleId &&
              !item.completed_lesson_ids.includes(lessonId)
                ? {
                    ...item,
                    completed_lesson_ids: [
                      ...item.completed_lesson_ids,
                      lessonId,
                    ],
                  }
                : item,
            ),
          }
        : previous,
    )
  }

  return (
    <ProgressContext.Provider
      value={{
        progress: current?.progress ?? null,
        loading: current === null,
        error: current?.error ?? null,
        retry: () => setAttempt((value) => value + 1),
        complete,
      }}
    >
      {children}
    </ProgressContext.Provider>
  )
}
