import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type User } from '@/context/auth-context-value'
import LessonEdit from './LessonEdit'
import QuizEdit from './QuizEdit'

const lessonRow = (overrides: Record<string, unknown> = {}) => ({
  id: 31,
  module_id: 12,
  key: 'proofs',
  title: 'Proofs',
  body: '## Welcome',
  video_url: null,
  position: 1,
  archived: false,
  ...overrides,
})

const moduleRow = {
  id: 12,
  title: 'Discrete Math',
  description: 'Practice',
  display_order: 0,
  quiz_id: null,
  lessons: [
    { id: 30, title: 'Intro' },
    { id: 31, title: 'Proofs' },
  ],
}

function stubApi(
  lesson: Response | (() => Response) = () => Response.json(lessonRow()),
) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const path = String(input)
    if (path === '/api/admin/lessons/31') {
      return Promise.resolve(typeof lesson === 'function' ? lesson() : lesson)
    }
    if (path === '/api/modules/12') {
      return Promise.resolve(Response.json(moduleRow))
    }
    throw new Error(`Unexpected request: ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage(path: string, role: User['role']) {
  render(
    <AuthContext.Provider
      value={{
        state: {
          status: 'authenticated',
          user: {
            id: 1,
            email: 'user@example.unc.edu',
            onyen: 'user',
            display_name: 'User',
            role,
            csrf_token: 'csrf-token',
          },
        },
        loggedOut: false,
        retry: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/edit-module/:moduleId/edit-lesson/:lessonId"
            element={<LessonEdit />}
          />
          <Route
            path="/edit-module/:moduleId/edit-quiz/:quizId"
            element={<QuizEdit />}
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('lesson editing page', () => {
  it('loads the lesson that was clicked into the editor', async () => {
    const fetchMock = stubApi()
    renderPage('/edit-module/12/edit-lesson/31', 'admin')

    expect(await screen.findByLabelText('Title')).toHaveValue('Proofs')
    expect(screen.getByLabelText('Lesson (Markdown)')).toHaveValue('## Welcome')
    expect(
      screen.getByRole('heading', { name: 'Edit lesson' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to module editing' }),
    ).toHaveAttribute('href', '/edit-module/12')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/lessons/31',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })

  it('numbers the lesson in the preview by its place in the module', async () => {
    stubApi()
    renderPage('/edit-module/12/edit-lesson/31', 'admin')
    await screen.findByLabelText('Title')

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Module 12: Lesson 2 - Proofs',
      }),
    ).toBeInTheDocument()
  })

  it('shows a loading message first', () => {
    stubApi()
    renderPage('/edit-module/12/edit-lesson/31', 'admin')

    expect(screen.getByRole('status')).toHaveTextContent('Loading lesson...')
  })

  it('offers a retry when the lesson cannot be loaded', async () => {
    const fetchMock = stubApi(
      Response.json(
        { error: { code: 'not_found', message: 'Lesson 31 not found' } },
        { status: 404 },
      ),
    )
    renderPage('/edit-module/12/edit-lesson/31', 'admin')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Lesson 31 not found',
    )
    const retry = screen.getByRole('button', { name: 'Try again' })
    const callsBefore = fetchMock.mock.calls.length

    fireEvent.click(retry)

    await screen.findByRole('status')
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('does not edit a lesson under another module', async () => {
    stubApi(() => Response.json(lessonRow({ module_id: 99 })))
    renderPage('/edit-module/12/edit-lesson/31', 'admin')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Lesson not found.',
    )
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
  })

  it('explains that a deleted lesson has to be restored first', async () => {
    stubApi(() => Response.json(lessonRow({ archived: true })))
    renderPage('/edit-module/12/edit-lesson/31', 'admin')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This lesson was deleted.',
    )
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
  })

  it('rejects an address that is not a lesson without asking the server', () => {
    const fetchMock = stubApi()
    renderPage('/edit-module/12/edit-lesson/abc', 'admin')

    expect(screen.getByRole('alert')).toHaveTextContent('Lesson not found.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('turns students away without requesting anything', () => {
    const fetchMock = stubApi()
    renderPage('/edit-module/12/edit-lesson/31', 'student')

    expect(
      screen.getByText('You do not have access to this page.'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

const quizRow = (overrides: Record<string, unknown> = {}) => ({
  id: 5,
  module_id: 12,
  archived: false,
  questions: [
    {
      id: 1,
      key: 'disprove',
      type: 'fill_in_blank',
      prompt: 'By ______.',
      answer: 'counterexample',
      archived: false,
      options: null,
    },
  ],
  ...overrides,
})

function stubQuizApi(
  quiz: Response | (() => Response) = () => Response.json(quizRow()),
) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const path = String(input)
    if (path === '/api/admin/modules/12/quiz?include_archived=true') {
      return Promise.resolve(typeof quiz === 'function' ? quiz() : quiz)
    }
    throw new Error(`Unexpected request: ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('quiz editing page', () => {
  it("loads the module's quiz into the editor", async () => {
    stubQuizApi()
    renderPage('/edit-module/12/edit-quiz/5', 'admin')

    expect(await screen.findByLabelText('Correct answer')).toHaveValue(
      'counterexample',
    )
    expect(
      screen.getByRole('heading', { name: 'Edit quiz' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to module editing' }),
    ).toHaveAttribute('href', '/edit-module/12')
  })

  it('shows a loading message first', () => {
    stubQuizApi()
    renderPage('/edit-module/12/edit-quiz/5', 'admin')

    expect(screen.getByRole('status')).toHaveTextContent('Loading quiz...')
  })

  it('offers a retry when the quiz cannot be loaded', async () => {
    const fetchMock = stubQuizApi(
      Response.json(
        { error: { code: 'not_found', message: 'Quiz not found' } },
        { status: 404 },
      ),
    )
    renderPage('/edit-module/12/edit-quiz/5', 'admin')

    expect(await screen.findByRole('alert')).toHaveTextContent('Quiz not found')
    const callsBefore = fetchMock.mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await screen.findByRole('status')
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('does not open a quiz whose id is not the same as in the address', async () => {
    stubQuizApi(() => Response.json(quizRow({ id: 6 })))
    renderPage('/edit-module/12/edit-quiz/5', 'admin')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Quiz not found.',
    )
    expect(screen.queryByLabelText('Correct answer')).not.toBeInTheDocument()
  })

  it('explains that a deleted quiz has to be restored first', async () => {
    stubQuizApi(() => Response.json(quizRow({ archived: true })))
    renderPage('/edit-module/12/edit-quiz/5', 'admin')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This quiz was deleted.',
    )
    expect(screen.queryByLabelText('Correct answer')).not.toBeInTheDocument()
  })

  it('rejects an address that is not a quiz without asking the server', () => {
    const fetchMock = stubQuizApi()
    renderPage('/edit-module/12/edit-quiz/abc', 'admin')

    expect(screen.getByRole('alert')).toHaveTextContent('Quiz not found.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('turns students away without requesting anything', () => {
    const fetchMock = stubQuizApi()
    renderPage('/edit-module/12/edit-quiz/5', 'student')

    expect(
      screen.getByText('You do not have access to this page.'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
