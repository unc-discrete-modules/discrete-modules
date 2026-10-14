import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLesson } from '../lib/api'
import type { Lesson as LessonType } from '../types/api'

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: () => Promise<void>
    }
  }
}

export default function Lesson() {
  const { moduleId, lessonId } = useParams()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<LessonType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const parsedLessonId = Number(lessonId)

    if (!Number.isFinite(parsedLessonId)) {
      setError('Lesson not found')
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    getLesson(parsedLessonId)
      .then((data) => {
        if (!active) return
        setLesson(data)
      })
      .catch(() => {
        if (!active) return
        setLesson(null)
        setError('Unable to load this lesson.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [lessonId])

  useEffect(() => {
    if (!lesson) return
    window.MathJax?.typesetPromise?.().catch(() => undefined)
  }, [lesson?.id, lesson?.body])

  if (loading) {
    return <main className="p-6 text-lg">Loading lesson...</main>
  }

  if (error || !lesson) {
    return <main className="p-6 text-lg">{error ?? 'Lesson not found.'}</main>
  }

  const goToPreviousLesson = () => {
    if (lesson.previous_lesson_id == null) return
    navigate(`/modules/${moduleId}/lessons/${lesson.previous_lesson_id}`)
  }

  const goToNextLesson = () => {
    if (lesson.next_lesson_id == null) return
    navigate(`/modules/${moduleId}/lessons/${lesson.next_lesson_id}`)
  }

  const renderInlineText = (text: string) =>
    text
      .split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g)
      .filter(Boolean)
      .map((segment, index) => {
        if (segment.startsWith('$$') && segment.endsWith('$$')) {
          return <span key={index}>{segment}</span>
        }

        if (segment.startsWith('$') && segment.endsWith('$')) {
          return <span key={index}>{segment}</span>
        }

        return (
          <span key={index}>
            {segment.split('\n').map((line, lineIndex) => (
              <span key={lineIndex}>
                {line}
                {lineIndex < segment.split('\n').length - 1 ? <br /> : null}
              </span>
            ))}
          </span>
        )
      })

  const renderBody = (body: string) => {
    const blocks = body.split(/\n\s*\n/)

    return blocks.map((block, index) => {
      const lines = block.split('\n')
      const firstLine = lines[0] ?? ''

      if (firstLine.startsWith('### ')) {
        return (
          <h3 key={index} className="mt-6 text-2xl font-semibold text-slate-900">
            {renderInlineText(firstLine.slice(4))}
          </h3>
        )
      }

      if (firstLine.startsWith('## ')) {
        return (
          <h2 key={index} className="mt-6 text-3xl font-semibold text-slate-900">
            {renderInlineText(firstLine.slice(3))}
          </h2>
        )
      }

      if (firstLine.startsWith('# ')) {
        return (
          <h2 key={index} className="mt-6 text-3xl font-semibold text-slate-900">
            {renderInlineText(firstLine.slice(2))}
          </h2>
        )
      }

      if (lines.every((line) => line.startsWith('- '))) {
        return (
          <ul key={index} className="ml-6 list-disc space-y-2">
            {lines.map((line, listIndex) => (
              <li key={listIndex}>{renderInlineText(line.slice(2))}</li>
            ))}
          </ul>
        )
      }

      return (
        <p key={index} className="text-lg leading-8 text-slate-700">
          {renderInlineText(block)}
        </p>
      )
    })
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <p className="mb-3 text-sm text-slate-500">Overview</p>
      <h1 className="text-4xl font-semibold text-slate-900">{lesson.title}</h1>

      {lesson.video_url ? (
        <div className="mt-8 overflow-hidden rounded-2xl bg-slate-200">
          <div className="aspect-video">
            <iframe
              className="h-full w-full"
              src={lesson.video_url}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}

      <article className="mt-8 space-y-6">
        {renderBody(lesson.body)}
      </article>

      <div className="mt-10 flex gap-3">
        <button
          type="button"
          onClick={goToPreviousLesson}
          disabled={lesson.previous_lesson_id == null}
          className="rounded-lg border border-slate-300 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={goToNextLesson}
          disabled={lesson.next_lesson_id == null}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </main>
  )
}
