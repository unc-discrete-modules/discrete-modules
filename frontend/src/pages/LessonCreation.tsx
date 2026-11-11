/** Page where an admin adds a lesson to a module from a Markdown file. */

import ContentUploadPage from '@/components/admin/ContentUploadPage'
import LessonPreview from '@/components/admin/LessonPreview'
import type { CreateLesson } from '@/components/admin/upload-types'
import {
  createLesson,
  listModuleLessons,
  restoreLesson,
  updateLesson,
} from '@/api/client'
import type { LessonInput } from '@/types/types'
import { lessonKeyFromFileName, parseLessonFile } from '@/lib/lesson-content'

// Deleted lessons are only archived and keep their key, so uploading a file
// with that key brings the lesson back with the file's content, which is how
// an edited file is added again. The content is saved before the lesson is
// restored, so a failure part-way leaves it archived and a retry finishes it.
async function addLesson(
  csrfToken: string,
  moduleId: number,
  lesson: LessonInput,
) {
  const lessons = await listModuleLessons(moduleId, true)
  const existing = lessons.find((item) => item.key === lesson.key)
  if (!existing) return createLesson(csrfToken, moduleId, lesson)

  if (!existing.archived) {
    throw new Error(
      `This module already has a lesson with the key "${lesson.key}". Rename the file to add a new lesson.`,
    )
  }
  await updateLesson(csrfToken, existing.id, {
    title: lesson.title,
    body: lesson.body,
    video_url: lesson.video_url,
  })
  return restoreLesson(csrfToken, existing.id)
}

const createLessonFromFile: CreateLesson = async (
  file,
  { module, csrfToken },
) => {
  const parsed = parseLessonFile(file.text)
  if ('error' in parsed) throw new Error(parsed.error)

  const key = lessonKeyFromFileName(file.name)
  if (!key) {
    throw new Error(
      'The file name must be lowercase words joined by hyphens, such as 01-proofs.md.',
    )
  }

  const { lesson } = parsed
  const created = await addLesson(csrfToken, module.id, {
    key,
    title: lesson.title,
    body: lesson.body,
    video_url: lesson.videoUrl,
  })
  return { id: created.id, title: created.title }
}

export default function LessonCreation() {
  return (
    <ContentUploadPage
      contentName="lesson"
      extensions={['.md']}
      formatHint="A Markdown file that starts with a front matter block containing a title and an optional video_url."
      Preview={LessonPreview}
      onCreate={createLessonFromFile}
    />
  )
}
