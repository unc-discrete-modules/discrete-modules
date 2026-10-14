import { useContext } from 'react'
import { CourseContext } from '@/context/course-context-value'

export function useModules() {
  const ctx = useContext(CourseContext)
  if (!ctx) throw new Error('useModules must be used inside CourseProvider')
  return ctx
}
