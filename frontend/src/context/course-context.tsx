import { useEffect, useState } from 'react'
import { listModules } from '@/api/client'
import type { ModuleSummary } from '@/types/types'
import { CourseContext } from './course-context-value'

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    attempt: number
    modules: ModuleSummary[] | null
    error: Error | null
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listModules(controller.signal)
      .then((modules) => {
        if (!controller.signal.aborted)
          setResult({ attempt, modules, error: null })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            attempt,
            modules: null,
            error:
              error instanceof Error
                ? error
                : new Error('Unable to load modules.'),
          })
        }
      })
    return () => controller.abort()
  }, [attempt])

  const current = result?.attempt === attempt ? result : null
  return (
    <CourseContext.Provider
      value={{
        modules: current?.modules ?? null,
        loading: current === null,
        error: current?.error ?? null,
        retry: () => setAttempt((value) => value + 1),
      }}
    >
      {children}
    </CourseContext.Provider>
  )
}
