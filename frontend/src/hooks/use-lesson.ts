import { useEffect, useState } from 'react'
import { getLesson } from '../lib/api'
import type { Lesson } from '../types/types'

export function useLesson(lessonId?: string) {
  const parsedLessonId = Number(lessonId)
  const validLessonId = Number.isSafeInteger(parsedLessonId) && parsedLessonId > 0
  const [result, setResult] = useState<{
    lessonId: number
    lesson: Lesson | null
    error: Error | null
  } | null>(null)

  useEffect(() => {
    if (!validLessonId) return

    let active = true

    getLesson(parsedLessonId)
      .then((data) => {
        if (!active) return
        setResult({ lessonId: parsedLessonId, lesson: data, error: null })
      })
      .catch(() => {
        if (!active) return
        setResult({
          lessonId: parsedLessonId,
          lesson: null,
          error: new Error('Unable to load this lesson.'),
        })
      })

    return () => {
      active = false
    }
  }, [parsedLessonId, validLessonId])

  if (!validLessonId) {
    return {
      lesson: null,
      loading: false,
      error: new Error('Lesson not found'),
    }
  }

  if (result?.lessonId !== parsedLessonId) {
    return { lesson: null, loading: true, error: null }
  }

  return { lesson: result.lesson, loading: false, error: result.error }
}