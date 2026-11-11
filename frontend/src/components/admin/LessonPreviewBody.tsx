/** A lesson laid out the way students see it, for previews. */

import LessonContent from '@/components/lesson/LessonContent'
import LessonHeader from '@/components/lesson/LessonHeader'
import LessonVideo from '@/components/lesson/LessonVideo'
import { splitLessonSections } from '@/lib/lesson-content'

type LessonPreviewBodyProps = {
  title: string
  videoUrl: string | null
  body: string
  // Shown in the heading when known, as on the student page.
  moduleId?: number
  lessonNumber?: number
}

export default function LessonPreviewBody({
  title,
  videoUrl,
  body,
  moduleId,
  lessonNumber,
}: LessonPreviewBodyProps) {
  const sections = splitLessonSections(body)

  return (
    <div className="rounded-sm border-3 border-stone-200 bg-white px-12 py-10">
      <LessonHeader
        title={title}
        moduleId={moduleId === undefined ? undefined : String(moduleId)}
        lessonNumber={lessonNumber}
        objectives={sections.objectives}
      />
      <LessonVideo videoUrl={videoUrl} title={title} />
      <LessonContent body={sections.body} />
    </div>
  )
}
