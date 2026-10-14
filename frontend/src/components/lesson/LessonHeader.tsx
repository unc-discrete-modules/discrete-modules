type LessonHeaderProps = {
  title: string
  moduleId?: string
  lessonId?: string
}

export default function LessonHeader({
  title,
  moduleId,
  lessonId,
}: LessonHeaderProps) {
  return (
    <header>
      <h1 className="text-4xl font-semibold text-slate-700">
        Module {moduleId}: Lesson {lessonId} - {title}
      </h1>
      <p className="mt-4 text-m text-slate-500">
        Dashboard / Module {moduleId} / Lesson {lessonId}
      </p>
      <h2 className="mt-4 text-xl font-semibold text-slate-700">Overview</h2>
      <p className="mt-1 text-base text-slate-700">
        In this lesson, you will learn about {title.toLowerCase()}.
      </p>
    </header>
  )
}