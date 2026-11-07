import { useContext, useEffect, useState } from 'react'
import { CourseContext } from '@/context/course-context-value'
import { getModule } from '@/api/client'
import type { Module } from '@/types/types'

export function useModules() {
  const ctx = useContext(CourseContext)
  if (!ctx) throw new Error('useModules must be used inside CourseProvider')
  return ctx
}

type ModuleResult = {
  moduleId: number
  attempt: number
  module: Module | null
  error: Error | null
}

export function useModule(moduleId: number, enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<ModuleResult | null>(null)

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()

    getModule(moduleId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setResult({ moduleId, attempt, module: value, error: null })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            moduleId,
            attempt,
            module: null,
            error:
              error instanceof Error
                ? error
                : new Error('Failed to load module'),
          })
        }
      })

    return () => controller.abort()
  }, [attempt, enabled, moduleId])

  const currentResult =
    result?.moduleId === moduleId && result.attempt === attempt ? result : null

  return {
    module: currentResult?.module ?? null,
    loading: enabled && currentResult === null,
    error: currentResult?.error ?? null,
    retry: () => setAttempt((current) => current + 1),
  }
}
