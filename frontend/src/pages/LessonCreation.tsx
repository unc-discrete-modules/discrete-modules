/** Page where an admin adds a lesson to a module, written in the editor or from a Markdown file. */

import ContentUploadPage from '@/components/admin/ContentUploadPage'
import LessonBuilder from '@/components/admin/LessonBuilder'
import LessonPreview from '@/components/admin/LessonPreview'
import type {
  BuilderProps,
  CreateContent,
} from '@/components/admin/upload-types'
import { lessonKeyFromFileName, parseLessonFile } from '@/lib/lesson-content'
import { saveLesson } from '@/lib/lesson-save'

const createLessonFromFile: CreateContent = async (
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
  const created = await saveLesson(
    csrfToken,
    module.id,
    {
      key,
      title: lesson.title,
      body: lesson.body,
      video_url: lesson.videoUrl,
    },
    'Rename the file to add a new lesson.',
  )
  return { id: created.id, title: created.title }
}

function LessonBuilderPanel({
  module,
  csrfToken,
  onLessonAdded,
}: BuilderProps) {
  return (
    <LessonBuilder
      module={module}
      cancelTo={`/edit-module/${module.id}`}
      onSave={async (lesson) => {
        const created = await saveLesson(
          csrfToken,
          module.id,
          lesson,
          'Choose a different key.',
        )
        onLessonAdded({ id: created.id, title: created.title })
      }}
    />
  )
}

export default function LessonCreation() {
  return (
    <ContentUploadPage
      contentName="lesson"
      extensions={['.md']}
      formatHint="A Markdown file that starts with a front matter block containing a title and an optional video_url."
      Preview={LessonPreview}
      Builder={LessonBuilderPanel}
      onCreate={createLessonFromFile}
    />
  )
}
