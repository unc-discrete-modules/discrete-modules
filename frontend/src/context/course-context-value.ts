import { createContext } from 'react'
import type { CourseContextValue } from '@/types/types'

export const CourseContext = createContext<CourseContextValue | null>(null)
