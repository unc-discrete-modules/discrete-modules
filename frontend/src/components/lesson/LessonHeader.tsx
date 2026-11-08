import ReactMarkdown from 'react-markdown'
import { rehypePlugins, remarkPlugins, tableComponents } from './markdown'

type LessonHeaderProps = {
  title: string
  moduleId?: string
  // Position within the module; unknown until the module's lessons load.
  lessonNumber?: number
  objectives: string
}

export default function LessonHeader({
  title,
  moduleId,
  lessonNumber,
  objectives,
}: LessonHeaderProps) {
  const lessonLabel = lessonNumber == null ? null : `Lesson ${lessonNumber}`

  return (
    <header>
      <h1 className="text-4xl font-semibold text-slate-700">
        Module {moduleId}: {lessonLabel ? `${lessonLabel} - ` : ''}
        {title}
      </h1>
      <p className="mt-4 text-m text-slate-500">
        Dashboard / Module {moduleId}
        {lessonLabel ? ` / ${lessonLabel}` : ''}
      </p>
      <h2 className="mt-4 text-xl font-semibold text-slate-700">Overview</h2>
      {objectives ? (
        <div className="lesson-content mt-2 text-base leading-7 text-slate-700">
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={{
              ...tableComponents,
              ul: ({ children }) => (
                <ul className="ml-6 list-disc space-y-1">{children}</ul>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-slate-900">
                  {children}
                </strong>
              ),
            }}
          >
            {objectives}
          </ReactMarkdown>
        </div>
      ) : null}
    </header>
  )
}
