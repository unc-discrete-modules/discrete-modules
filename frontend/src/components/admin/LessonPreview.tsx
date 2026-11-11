/** Renders an uploaded lesson file the way students will see it. */

import LessonContent from '@/components/lesson/LessonContent'
import LessonHeader from '@/components/lesson/LessonHeader'
import LessonVideo from '@/components/lesson/LessonVideo'
import { parseLessonFile, splitLessonSections } from '@/lib/lesson-content'
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
  const { objectives, body } = splitLessonSections(lesson.body)

  return (
    <div className="rounded-sm border-3 border-stone-200 bg-white px-12 py-10">
      <LessonHeader
        title={lesson.title}
        moduleId={module ? String(module.id) : undefined}
        // New lessons are added after the module's existing ones.
        lessonNumber={module ? module.lessons.length + 1 : undefined}
        objectives={objectives}
      />
      <LessonVideo videoUrl={lesson.videoUrl} title={lesson.title} />
      <LessonContent body={body} />
    </div>
  )
}
