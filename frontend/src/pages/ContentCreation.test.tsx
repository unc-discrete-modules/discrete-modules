import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type User } from '@/context/auth-context-value'
import LessonCreation from './LessonCreation'
import QuizCreation from './QuizCreation'

const module = {
  id: 12,
  title: 'Discrete Math',
  description: 'Practice',
  display_order: 0,
  quiz_id: null,
  lessons: [],
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
            path="/edit-module/:moduleId/create-lesson"
            element={<LessonCreation />}
          />
          <Route
            path="/edit-module/:moduleId/create-quiz"
            element={<QuizCreation />}
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('content creation pages', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('offers a Markdown upload for a lesson in the module', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(module))),
    )

    renderPage('/edit-module/12/create-lesson', 'admin')

    expect(
      await screen.findByRole('heading', { name: 'Add lesson' }),
    ).toBeInTheDocument()
    expect(screen.getByText('to Discrete Math')).toBeInTheDocument()
    expect(screen.getByLabelText('Lesson file')).toHaveAttribute(
      'accept',
      '.md',
    )
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/edit-module/12',
    )
  })

  it('offers a YAML upload for a quiz in the module', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(module))),
    )

    renderPage('/edit-module/12/create-quiz', 'admin')

    expect(
      await screen.findByRole('heading', { name: 'Add quiz' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Quiz file')).toHaveAttribute(
      'accept',
      '.yaml,.yml',
    )
  })

  it('previews an uploaded lesson as students will see it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(module))),
    )
    renderPage('/edit-module/12/create-lesson', 'admin')

    fireEvent.change(await screen.findByLabelText('Lesson file'), {
      target: {
        files: [
          new File(
            ['---\ntitle: Intro\n---\n\n## Welcome\n\nWe prove $x^2$ is odd.'],
            '01-intro.md',
          ),
        ],
      },
    })

    const preview = await screen.findByRole('region', { name: 'Preview' })
    expect(preview).toHaveTextContent('01-intro.md')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Module 12: Lesson 1 - Intro',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeVisible()
    expect(preview.querySelector('mjx-container')).toBeInTheDocument()
    expect(preview).not.toHaveTextContent('title: Intro')
  })

  it('creates the lesson from the file and previews the next one in order', async () => {
    const created = {
      id: 31,
      module_id: 12,
      key: 'intro',
      title: 'Intro',
      body: '## Welcome',
      video_url: null,
      position: 0,
      archived: false,
    }
    const fetchMock = vi.fn<typeof fetch>((input) =>
      Promise.resolve(
        String(input) === '/api/admin/modules/12/lessons'
          ? Response.json(created, { status: 201 })
          : Response.json(module),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage('/edit-module/12/create-lesson', 'admin')
    const lessonFile = (title: string, name: string) =>
      new File([`---\ntitle: ${title}\n---\n\n## Welcome`], name)

    fireEvent.change(await screen.findByLabelText('Lesson file'), {
      target: { files: [lessonFile('Intro', '01-intro.md')] },
    })
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Module 12: Lesson 1 - Intro',
      }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Created 01-intro.md.',
    )
    const [path, init] =
      fetchMock.mock.calls.find(([, init]) => init?.method === 'POST') ?? []
    expect(path).toBe('/api/admin/modules/12/lessons')
    expect(init?.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-token' })
    expect(JSON.parse(init?.body as string)).toEqual({
      key: 'intro',
      title: 'Intro',
      body: '## Welcome',
      video_url: null,
    })

    fireEvent.change(screen.getByLabelText('Lesson file'), {
      target: { files: [lessonFile('Next', '02-next.md')] },
    })
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Module 12: Lesson 2 - Next',
      }),
    ).toBeInTheDocument()
  })

  it('refuses a lesson whose file name cannot be a key, without calling the API', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json(module)))
    vi.stubGlobal('fetch', fetchMock)
    renderPage('/edit-module/12/create-lesson', 'admin')

    fireEvent.change(await screen.findByLabelText('Lesson file'), {
      target: {
        files: [new File(['---\ntitle: A\n---\n\nBody'], 'My Lesson.md')],
      },
    })
    await screen.findByRole('region', { name: 'Preview' })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The file name must be lowercase words joined by hyphens',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports the server error when a lesson cannot be created', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) =>
        Promise.resolve(
          String(input) === '/api/admin/modules/12/lessons'
            ? Response.json(
                {
                  error: {
                    code: 'conflict',
                    message: 'Module is archived; restore it first',
                  },
                },
                { status: 409 },
              )
            : Response.json(module),
        ),
      ),
    )
    renderPage('/edit-module/12/create-lesson', 'admin')

    fireEvent.change(await screen.findByLabelText('Lesson file'), {
      target: {
        files: [new File(['---\ntitle: A\n---\n\nBody'], '01-a.md')],
      },
    })
    await screen.findByRole('region', { name: 'Preview' })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Module is archived; restore it first',
    )
    expect(screen.getByRole('region', { name: 'Preview' })).toBeInTheDocument()
  })

  it('keeps Create disabled on the quiz page until quizzes can be created', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(module))),
    )
    renderPage('/edit-module/12/create-quiz', 'admin')

    fireEvent.change(await screen.findByLabelText('Quiz file'), {
      target: { files: [new File(['questions: []'], 'quiz.yaml')] },
    })

    await screen.findByLabelText('File contents')
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })

  it('previews an uploaded quiz as plain text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(module))),
    )
    renderPage('/edit-module/12/create-quiz', 'admin')

    fireEvent.change(await screen.findByLabelText('Quiz file'), {
      target: { files: [new File(['questions: []'], 'quiz.yaml')] },
    })

    expect(await screen.findByLabelText('File contents')).toHaveTextContent(
      'questions: []',
    )
  })

  it('turns students away without requesting the module', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderPage('/edit-module/12/create-lesson', 'student')

    expect(
      screen.getByText('You do not have access to this page.'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports an unknown module', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            { error: { code: 'not_found', message: 'x' } },
            { status: 404 },
          ),
        ),
      ),
    )

    renderPage('/edit-module/99/create-lesson', 'admin')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByLabelText('Lesson file')).not.toBeInTheDocument()
  })
})
