import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_EXPIRED } from '@/api'
import {
  ApiError,
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  deleteQuiz,
  getLesson,
  getModule,
  getQuiz,
  listModuleLessons,
  listModules,
  restoreLesson,
  reorderLessons,
  reorderModules,
  submitQuiz,
  updateLesson,
  updateModule,
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

  it('saves lesson order with the authenticated admin endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ids: [3, 2] }))
    vi.stubGlobal('fetch', fetch)
    await expect(reorderLessons(12, [3, 2], 'csrf')).resolves.toEqual({
      ids: [3, 2],
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/modules/12/lessons/order',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf',
        },
        body: JSON.stringify({ ids: [3, 2] }),
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

  it('updates a module with the authenticated admin endpoint without changing its key', async () => {
    const updatedModule = {
      id: 12,
      key: 'discrete-math',
      title: 'Discrete Math',
      description: 'Updated introduction.',
      position: 0,
    }
    const fetch = vi.fn().mockResolvedValue(Response.json(updatedModule))
    vi.stubGlobal('fetch', fetch)
    await expect(
      updateModule('csrf', 12, 'Discrete Math', 'Updated introduction.'),
    ).resolves.toEqual(updatedModule)
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/modules/12',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf',
        },
        body: JSON.stringify({
          title: 'Discrete Math',
          description: 'Updated introduction.',
        }),
        credentials: 'same-origin',
      }),
    )
  })

  it('deletes a lesson with the authenticated admin endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    await expect(deleteLesson(14, 'csrf')).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/lessons/14',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'csrf' },
        credentials: 'same-origin',
      }),
    )
  })

  it('deletes a quiz with the authenticated admin endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    await expect(deleteQuiz(21, 'csrf')).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/quizzes/21',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'csrf' },
        credentials: 'same-origin',
      }),
    )
  })

  it('creates a lesson with the authenticated admin endpoint', async () => {
    const created = {
      id: 31,
      module_id: 12,
      key: 'proofs',
      title: 'Proofs',
      body: '## Hi',
      video_url: null,
      position: 2,
      archived: false,
    }
    const fetch = vi.fn().mockResolvedValue(Response.json(created))
    vi.stubGlobal('fetch', fetch)
    const lesson = {
      key: 'proofs',
      title: 'Proofs',
      body: '## Hi',
      video_url: null,
    }

    await expect(createLesson('csrf', 12, lesson)).resolves.toEqual(created)

    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/modules/12/lessons',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf',
        },
        body: JSON.stringify(lesson),
        credentials: 'same-origin',
      }),
    )
  })

  it('lists a module’s lessons, including archived ones, for admins', async () => {
    const row = {
      id: 31,
      module_id: 12,
      key: 'proofs',
      title: 'Proofs',
      body: '## Hi',
      video_url: null,
      position: 0,
      archived: true,
    }
    const fetch = vi.fn().mockResolvedValue(Response.json([row]))
    vi.stubGlobal('fetch', fetch)

    await expect(listModuleLessons(12, true)).resolves.toEqual([row])

    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/modules/12/lessons?include_archived=true',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })

  it('updates a lesson, clearing its video when asked', async () => {
    const row = {
      id: 31,
      module_id: 12,
      key: 'proofs',
      title: 'New',
      body: 'Body',
      video_url: null,
      position: 0,
      archived: true,
    }
    const fetch = vi.fn().mockResolvedValue(Response.json(row))
    vi.stubGlobal('fetch', fetch)
    const changes = { title: 'New', body: 'Body', video_url: null }

    await expect(updateLesson('csrf', 31, changes)).resolves.toEqual(row)

    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/lessons/31',
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf',
        },
        body: JSON.stringify(changes),
      }),
    )
  })

  it('restores an archived lesson', async () => {
    const row = {
      id: 31,
      module_id: 12,
      key: 'proofs',
      title: 'Proofs',
      body: 'Body',
      video_url: null,
      position: 0,
      archived: false,
    }
    const fetch = vi.fn().mockResolvedValue(Response.json(row))
    vi.stubGlobal('fetch', fetch)

    await expect(restoreLesson('csrf', 31)).resolves.toEqual(row)

    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/lessons/31/restore',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-CSRF-Token': 'csrf' },
      }),
    )
  })

  it('reports why a lesson could not be created', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: 'conflict',
              message: 'Module is archived; restore it first',
            },
          },
          { status: 409 },
        ),
      ),
    )

    await expect(
      createLesson('csrf', 12, { key: 'a', title: 'A', body: 'b' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Module is archived; restore it first',
    })
  })

  it('creates a module with the authenticated admin endpoint', async () => {
    const createdModule = {
      id: 12,
      key: 'discrete-math',
      title: 'Discrete Math',
      description: 'An introduction to discrete mathematics.',
      position: 0,
    }
    const fetch = vi.fn().mockResolvedValue(Response.json(createdModule))
    vi.stubGlobal('fetch', fetch)
    await expect(
      createModule(
        'csrf',
        'discrete-math',
        'Discrete Math',
        'An introduction to discrete mathematics.',
      ),
    ).resolves.toEqual(createdModule)
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/modules',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf',
        },
        body: JSON.stringify({
          key: 'discrete-math',
          title: 'Discrete Math',
          description: 'An introduction to discrete mathematics.',
        }),
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
