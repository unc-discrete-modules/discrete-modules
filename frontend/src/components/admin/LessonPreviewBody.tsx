/** A lesson laid out the way students see it, for previews. */

import LessonContent from '@/components/lesson/LessonContent'
import LessonHeader from '@/components/lesson/LessonHeader'
import LessonVideo from '@/components/lesson/LessonVideo'
import { splitLessonSections } from '@/lib/lesson-content'
import type { Module } from '@/types/types'

type LessonPreviewBodyProps = {
  title: string
  videoUrl: string | null
  body: string
  module?: Module
}

export default function LessonPreviewBody({
  title,
  videoUrl,
  body,
  module,
}: LessonPreviewBodyProps) {
  const sections = splitLessonSections(body)

  return (
    <div className="rounded-sm border-3 border-stone-200 bg-white px-12 py-10">
      <LessonHeader
        title={title}
        moduleId={module ? String(module.id) : undefined}
        lessonNumber={module ? module.lessons.length + 1 : undefined}
        objectives={sections.objectives}
      />
      <LessonVideo videoUrl={videoUrl} title={title} />
      <LessonContent body={sections.body} />
    </div>
  )
}
