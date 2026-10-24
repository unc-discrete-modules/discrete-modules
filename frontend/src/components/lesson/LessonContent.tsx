import ReactMarkdown from 'react-markdown'
import { rehypePlugins, remarkPlugins, tableComponents } from './markdown'

type LessonContentProps = {
  body: string
}

export default function LessonContent({ body }: LessonContentProps) {
  return (
    <article className="lesson-content mt-5 space-y-3 text-base leading-8 text-slate-700">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          ...tableComponents,
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="my-4 h-auto max-w-md" />
          ),
          h1: ({ children }) => (
            <h1 className="mt-8 text-3xl font-semibold text-slate-900">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 text-2xl font-semibold text-slate-900">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 text-xl font-semibold text-slate-900">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-base leading-7 text-slate-700">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="ml-6 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-6 list-decimal space-y-1">{children}</ol>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </article>
  )
}
