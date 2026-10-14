import { useEffect, useState } from 'react'
import { getLesson } from '@/lib/api'
import type { Lesson } from '@/types/types'

export function useLesson(lessonId?: string) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const parsedLessonId = Number(lessonId)

    if (!Number.isFinite(parsedLessonId)) {
      setLesson(null)
      setError(new Error('Lesson not found'))
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    getLesson(parsedLessonId)
      .then((data) => {
        if (!active) return
        setLesson(data)
      })
      .catch(() => {
        if (!active) return
        setLesson(null)
        setError(new Error('Unable to load this lesson.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [lessonId])

  return { lesson, loading, error }
}