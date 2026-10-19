// src/context/course-context.tsx
import { useEffect, useState } from 'react'
import { fetchModuleSummaries } from '@/api/modules'
import type { ModuleSummary } from '@/types/types'
import { CourseContext } from './course-context-value'
import { apiFetch } from '@/api'

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<ModuleSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch('/modules', { signal: controller.signal })
      .then((resp) => {
        if (!resp.ok) throw new Error(`Failed: ${resp.status}`)
        return resp.json()
      })
      .then((data) => {
        if (!controller.signal.aborted) setModules(data)
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setError(error)
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
