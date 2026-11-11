/** Page where an admin adds a lesson to a module from a Markdown file. */

import ContentUploadPage from '@/components/admin/ContentUploadPage'
import LessonPreview from '@/components/admin/LessonPreview'
import type { CreateLesson } from '@/components/admin/upload-types'
import { createLesson } from '@/api/client'
import { lessonKeyFromFileName, parseLessonFile } from '@/lib/lesson-content'

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
  const created = await createLesson(csrfToken, module.id, {
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
