// src/context/course-context.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { type Module, type CourseContextValue } from '@/types/types'

console.log('yo', import.meta.env.VITE_API_URL)
const CourseContext = createContext<CourseContextValue | null>(null)

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<Module[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/modules`)
      .then((resp) => {
        if (!resp.ok) throw new Error(`Failed: ${resp.status}`)
        return resp.json()
      })
      .then(setModules)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return (
    <CourseContext.Provider value={{ modules, loading, error }}>
      {children}
    </CourseContext.Provider>
  )
}

export function useModules() {
  const ctx = useContext(CourseContext)
  if (!ctx) throw new Error('useModules must be used inside CourseProvider')
  return ctx
}
