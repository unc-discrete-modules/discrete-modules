/** Renders an uploaded lesson file the way students will see it. */

import { parseLessonFile } from '@/lib/lesson-content'
import LessonPreviewBody from './LessonPreviewBody'
import type { PreviewProps } from './upload-types'

export default function LessonPreview({ file, module }: PreviewProps) {
  const parsed = parseLessonFile(file.text)
  if ('error' in parsed) {
    return (
      <p role="alert" className="text-sm text-red-700">
        {parsed.error}
      </p>
    )
  }

  const { lesson } = parsed
  return (
    <LessonPreviewBody
      title={lesson.title}
      videoUrl={lesson.videoUrl}
      body={lesson.body}
      moduleId={module?.id}
      // New lessons are added after the module's existing ones.
      lessonNumber={module ? module.lessons.length + 1 : undefined}
    />
  )
}
