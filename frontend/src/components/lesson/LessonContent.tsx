import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: () => Promise<void>
    }
  }
}

type LessonContentProps = {
  body: string
}

export default function LessonContent({ body }: LessonContentProps) {
  useEffect(() => {
    window.MathJax?.typesetPromise?.().catch(() => undefined)
  }, [body])

  return (
    <article className="mt-5 space-y-6 text-base leading-8 text-slate-700">
      <ReactMarkdown>{body}</ReactMarkdown>
    </article>
  )
}