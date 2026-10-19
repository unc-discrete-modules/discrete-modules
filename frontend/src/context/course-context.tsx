// src/context/course-context.tsx
import { useEffect, useState } from 'react'
import { fetchModuleSummaries } from '@/api/modules'
import type { ModuleSummary } from '@/types/types'
import { CourseContext } from './course-context-value'

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<ModuleSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchModuleSummaries(controller.signal)
      .then(setModules)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason
              : new Error('Failed to load modules'),
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return (
    <CourseContext.Provider value={{ modules, loading, error }}>
      {children}
    </CourseContext.Provider>
  )
}
