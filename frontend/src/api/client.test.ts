import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_EXPIRED } from '@/api'
import {
  ApiError,
  deleteModule,
  getLesson,
  getModule,
  getQuiz,
  listModules,
  reorderModules,
  submitQuiz,
} from './client'
import type { Quiz, SubmissionRequest, SubmissionResult } from '@/types/types'

const moduleSummary = {
  id: 1,
  title: 'Proofs',
  description: 'Practice',
  display_order: 0,
}
const quiz: Quiz = {
  id: 3,
  questions: [
    {
      id: 1,
      type: 'multiple_choice',
      prompt: 'Choose',
      options: [
        { id: 4, text: 'A' },
        { id: 5, text: 'B' },
      ],
    },
    { id: 2, type: 'fill_in_blank', prompt: 'Fill' },
    { id: 3, type: 'free_response', prompt: 'Explain' },
  ],
}
const submission: SubmissionRequest = {
  answers: [
    { question_id: 1, type: 'multiple_choice', option_id: 4 },
    { question_id: 2, type: 'fill_in_blank', text: 'Yes' },
    { question_id: 3, type: 'free_response', text: 'Proof' },
  ],
}
const result: SubmissionResult = {
  results: [
    {
      question_id: 1,
      correct: true,
      correct_answer: 'A',
      correct_option_id: 4,
    },
    { question_id: 2, correct: false, correct_answer: 'No' },
    { question_id: 3, correct: null, correct_answer: 'Model proof' },
  ],
}

afterEach(() => vi.unstubAllGlobals())

describe('learning API client', () => {
  it.each([
    ['modules', () => listModules(), '/api/modules', [moduleSummary]],
    [
      'module',
      () => getModule(1),
      '/api/modules/1',
      { ...moduleSummary, quiz_id: 3, lessons: [{ id: 2, title: 'Intro' }] },
    ],
    [
      'lesson',
      () => getLesson(2),
      '/api/lessons/2',
      { id: 2, title: 'Intro', body: '$x$' },
    ],
    ['quiz', () => getQuiz(1), '/api/modules/1/quiz', quiz],
  ])(
    'fetches typed %s with session credentials',
    async (_name, call, url, body) => {
      const fetch = vi.fn().mockResolvedValue(Response.json(body))
      vi.stubGlobal('fetch', fetch)
      await expect(call()).resolves.toEqual(body)
      expect(fetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ credentials: 'same-origin' }),
      )
    },
  )

  it('submits all answer types and returns nullable self-check feedback', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(result))
    vi.stubGlobal('fetch', fetch)
    await expect(
      submitQuiz(3, submission, { csrfToken: 'csrf' }),
    ).resolves.toEqual(result)
    expect(fetch).toHaveBeenCalledWith(
      '/api/quizzes/3/submissions',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf' },
        body: JSON.stringify(submission),
        credentials: 'same-origin',
      }),
    )
  })

  it('saves module order with the authenticated admin endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ids: [2, 1] }))
    vi.stubGlobal('fetch', fetch)
    await expect(reorderModules([2, 1], 'csrf')).resolves.toEqual({
      ids: [2, 1],
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/modules/order',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf',
        },
        body: JSON.stringify({ ids: [2, 1] }),
        credentials: 'same-origin',
      }),
    )
  })

  it('deletes a module with the authenticated admin endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    await expect(deleteModule(12, 'csrf')).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/modules/12',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'csrf' },
        credentials: 'same-origin',
      }),
    )
  })

  it.each([403, 404, 422])(
    'preserves structured %s errors and validation details',
    async (status) => {
      const error = {
        code: 'invalid',
        message: 'Check this question.',
        details: [
          { loc: ['answers', 0], msg: 'Missing answer', type: 'missing' },
        ],
      }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(Response.json({ error }, { status })),
      )
      await expect(getLesson(1)).rejects.toMatchObject({
        name: 'ApiError',
        status,
        ...error,
      })
    },
  )

  it.each([
    [404, 'The requested content could not be found.'],
    [503, 'Unable to load this content. Please try again.'],
  ])('handles non-JSON %s errors', async (status, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>error</html>', { status })),
    )
    await expect(getLesson(1)).rejects.toMatchObject({ status, message })
  })

  it('does not expose server error details as a message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: 'internal', message: 'SQL traceback' } },
            { status: 500 },
          ),
        ),
    )
    await expect(getLesson(1)).rejects.toThrow('Unable to load this content.')
  })

  it('reports network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    await expect(getLesson(1)).rejects.toThrow('Check your connection')
  })

  it('reports invalid successful JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('invalid')))
    await expect(getLesson(1)).rejects.toBeInstanceOf(ApiError)
  })

  it('retains module response validation', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json([{ ...moduleSummary, id: 'bad' }])),
    )
    await expect(listModules()).rejects.toThrow('invalid response')
  })

  it('passes cancellation through without wrapping it as a network error', async () => {
    const controller = new AbortController()
    const aborted = new DOMException('Aborted', 'AbortError')
    const fetch = vi.fn().mockRejectedValue(aborted)
    vi.stubGlobal('fetch', fetch)
    controller.abort()
    await expect(getLesson(1, controller.signal)).rejects.toBe(aborted)
    expect(fetch).toHaveBeenCalledWith(
      '/api/lessons/1',
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('announces expired sessions before rejecting a 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({}, { status: 401 })),
    )
    const expired = vi.fn()
    window.addEventListener(SESSION_EXPIRED, expired)
    try {
      await expect(getLesson(1)).rejects.toMatchObject({ status: 401 })
      expect(expired).toHaveBeenCalledOnce()
    } finally {
      window.removeEventListener(SESSION_EXPIRED, expired)
    }
  })
})
