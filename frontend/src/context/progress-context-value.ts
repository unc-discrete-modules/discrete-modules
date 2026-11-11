import { createContext, useContext } from 'react'
import type { ModuleProgress } from '@/types/types'

export type ProgressContextValue = {
  progress: ModuleProgress[] | null
  loading: boolean
  error: Error | null
  retry: () => void
  complete: (moduleId: number, lessonId: number) => Promise<void>
}

export const ProgressContext = createContext<ProgressContextValue | null>(null)
export function useProgress() {
  return useContext(ProgressContext)
}
