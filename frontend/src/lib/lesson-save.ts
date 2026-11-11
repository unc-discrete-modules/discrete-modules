import {
  createLesson,
  listModuleLessons,
  restoreLesson,
  updateLesson,
} from '@/api/client'
import type { LessonInput, LessonResponse } from '@/types/types'

// Deleted lessons are only archived and keep their key, so adding a lesson
// with that key brings the lesson back with the new content, which is how an
// edited lesson is added again. The content is saved before the lesson is
// restored, so a failure part-way leaves it archived and a retry finishes it.
// `duplicateHint` completes the message shown when the key is still in use.
export async function saveLesson(
  csrfToken: string,
  moduleId: number,
  lesson: LessonInput,
  duplicateHint: string,
): Promise<LessonResponse> {
  const lessons = await listModuleLessons(moduleId, true)
  const existing = lessons.find((item) => item.key === lesson.key)
  if (!existing) return createLesson(csrfToken, moduleId, lesson)

  if (!existing.archived) {
    throw new Error(
      `This module already has a lesson with the key "${lesson.key}". ${duplicateHint}`,
    )
  }
  await updateLesson(csrfToken, existing.id, {
    title: lesson.title,
    body: lesson.body,
    video_url: lesson.video_url,
  })
  return restoreLesson(csrfToken, existing.id)
}
