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

const lessonRow = (overrides: Record<string, unknown> = {}) => ({
  id: 31,
  module_id: 12,
  key: 'intro',
  title: 'Intro',
  body: '## Welcome',
  video_url: null,
  position: 0,
  archived: false,
  ...overrides,
})

const conflict = (message: string) =>
  Response.json({ error: { code: 'conflict', message } }, { status: 409 })

// Routes the requests lesson creation makes: the module, the admin lesson
// list (with archived lessons), and the create, update and restore calls.
function stubLessonApi({
  existing = [],
  create = () => Response.json(lessonRow(), { status: 201 }),
}: {
  existing?: ReturnType<typeof lessonRow>[]
  create?: () => Response
} = {}) {
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const path = String(input)
    const method = init?.method ?? 'GET'
    if (path === '/api/modules/12')
      return Promise.resolve(Response.json(module))
    if (method === 'GET' && path.startsWith('/api/admin/modules/12/lessons')) {
      return Promise.resolve(Response.json(existing))
    }
    if (method === 'POST' && path === '/api/admin/modules/12/lessons') {
      return Promise.resolve(create())
    }
    if (method === 'PATCH' && path === '/api/admin/lessons/31') {
      return Promise.resolve(Response.json(lessonRow({ archived: true })))
    }
    if (method === 'POST' && path === '/api/admin/lessons/31/restore') {
      return Promise.resolve(Response.json(lessonRow()))
    }
    throw new Error(`Unexpected request: ${method} ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const writes = (fetchMock: ReturnType<typeof stubLessonApi>) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method && init.method !== 'GET')
    .map(([path, init]) => [init?.method, path])

const lessonFile = (title: string, name: string) =>
  new File([`---\ntitle: ${title}\n---\n\n## Welcome`], name)

const quizRow = (archived = false) => ({
  id: 5,
  module_id: 12,
  archived,
  questions: [],
})

const quizYaml = `questions:
  - key: identify-p
    type: multiple_choice
    prompt: Which is $P$?
    options:
      - text: "$x$ is even"
        correct: true
      - text: other
`

const quizFile = (text = quizYaml, name = 'quiz.yaml') => new File([text], name)

// Routes the requests quiz creation makes. `existing` is what the admin quiz
// endpoint holds for the module: nothing, or an active or archived quiz.
function stubQuizApi({
  existing = null,
  create = () => Response.json(quizRow(), { status: 201 }),
}: {
  existing?: ReturnType<typeof quizRow> | null
  create?: () => Response
} = {}) {
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const path = String(input)
    const method = init?.method ?? 'GET'
    if (path === '/api/modules/12')
      return Promise.resolve(Response.json(module))
    if (method === 'GET' && path.startsWith('/api/admin/modules/12/quiz')) {
      return Promise.resolve(
        existing
          ? Response.json(existing)
          : Response.json(
              { error: { code: 'not_found', message: 'Quiz not found' } },
              { status: 404 },
            ),
      )
    }
    if (method === 'POST' && path === '/api/admin/modules/12/quiz') {
      return Promise.resolve(create())
    }
    if (method === 'PUT' && path === '/api/admin/quizzes/5') {
      return Promise.resolve(Response.json(quizRow(true)))
    }
    if (method === 'POST' && path === '/api/admin/quizzes/5/restore') {
      return Promise.resolve(Response.json(quizRow()))
    }
    throw new Error(`Unexpected request: ${method} ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function chooseQuiz(file: File) {
  fireEvent.change(await screen.findByLabelText('Quiz file'), {
    target: { files: [file] },
  })
  await screen.findByLabelText('File contents')
  fireEvent.click(screen.getByRole('button', { name: /create/i }))
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
    const fetchMock = stubLessonApi()
    renderPage('/edit-module/12/create-lesson', 'admin')

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

  it('brings back a deleted lesson with the edited file as its content', async () => {
    const fetchMock = stubLessonApi({
      existing: [
        lessonRow({ archived: true, title: 'Old title', body: 'Old' }),
      ],
    })
    renderPage('/edit-module/12/create-lesson', 'admin')

    fireEvent.change(await screen.findByLabelText('Lesson file'), {
      target: { files: [lessonFile('Edited title', '01-intro.md')] },
    })
    await screen.findByRole('region', { name: 'Preview' })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Created 01-intro.md.',
    )
    // Content is saved first, so a failure leaves the lesson archived.
    expect(writes(fetchMock)).toEqual([
      ['PATCH', '/api/admin/lessons/31'],
      ['POST', '/api/admin/lessons/31/restore'],
    ])
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'PATCH',
    )?.[1]
    expect(patch?.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-token' })
    expect(JSON.parse(patch?.body as string)).toEqual({
      title: 'Edited title',
      body: '## Welcome',
      video_url: null,
    })
  })

  it('explains that the key belongs to a lesson that is still in the module', async () => {
    const fetchMock = stubLessonApi({ existing: [lessonRow()] })
    renderPage('/edit-module/12/create-lesson', 'admin')

    fireEvent.change(await screen.findByLabelText('Lesson file'), {
      target: { files: [lessonFile('Intro', '01-intro.md')] },
    })
    await screen.findByRole('region', { name: 'Preview' })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'already has a lesson with the key "intro"',
    )
    expect(writes(fetchMock)).toEqual([])
  })

  it('refuses a lesson whose file name cannot be a key, without calling the API', async () => {
    const fetchMock = stubLessonApi()
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
    stubLessonApi({
      create: () => conflict('Module is archived; restore it first'),
    })
    renderPage('/edit-module/12/create-lesson', 'admin')

    fireEvent.change(await screen.findByLabelText('Lesson file'), {
      target: { files: [lessonFile('A', '01-a.md')] },
    })
    await screen.findByRole('region', { name: 'Preview' })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Module is archived; restore it first',
    )
    expect(screen.getByRole('region', { name: 'Preview' })).toBeInTheDocument()
  })

  it('creates the quiz from the file', async () => {
    const fetchMock = stubQuizApi()
    renderPage('/edit-module/12/create-quiz', 'admin')

    await chooseQuiz(quizFile())

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Created quiz.yaml.',
    )
    expect(writes(fetchMock)).toEqual([['POST', '/api/admin/modules/12/quiz']])
    const init = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    )?.[1]
    expect(init?.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-token' })
    expect(JSON.parse(init?.body as string)).toEqual({
      questions: [
        {
          key: 'identify-p',
          type: 'multiple_choice',
          prompt: 'Which is $P$?',
          options: [{ text: '$x$ is even', correct: true }, { text: 'other' }],
        },
      ],
    })
  })

  it('brings back a deleted quiz with the uploaded questions', async () => {
    const fetchMock = stubQuizApi({ existing: quizRow(true) })
    renderPage('/edit-module/12/create-quiz', 'admin')

    await chooseQuiz(quizFile())

    expect(await screen.findByRole('status')).toBeInTheDocument()
    // Questions are saved first, so a failure leaves the quiz archived.
    expect(writes(fetchMock)).toEqual([
      ['PUT', '/api/admin/quizzes/5'],
      ['POST', '/api/admin/quizzes/5/restore'],
    ])
  })

  it('explains that the module already has a quiz', async () => {
    const fetchMock = stubQuizApi({ existing: quizRow(false) })
    renderPage('/edit-module/12/create-quiz', 'admin')

    await chooseQuiz(quizFile())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'already has a quiz. Delete it in the module editor',
    )
    expect(writes(fetchMock)).toEqual([])
  })

  it('points to the question and field the server rejects', async () => {
    stubQuizApi({
      create: () =>
        Response.json(
          {
            error: {
              code: 'validation_error',
              message: 'Request validation failed',
              details: [
                {
                  loc: ['body', 'questions', 1, 'options'],
                  msg: 'Value error, Exactly one option must be correct',
                  type: 'value_error',
                },
                { loc: ['body', 'questions'], msg: 'Too short', type: 'x' },
              ],
            },
          },
          { status: 422 },
        ),
    })
    renderPage('/edit-module/12/create-quiz', 'admin')

    await chooseQuiz(quizFile())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Question 2 (options): Value error, Exactly one option must be correct',
    )
    expect(alert).toHaveTextContent('Too short')
    expect(screen.getByLabelText('File contents')).toBeInTheDocument()
  })

  it('refuses a file that is not a quiz without calling the API', async () => {
    const fetchMock = stubQuizApi()
    renderPage('/edit-module/12/create-quiz', 'admin')

    await chooseQuiz(quizFile('not: a quiz'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'needs a questions list',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
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

  it.each([
    ['lesson', 'create-lesson'],
    ['quiz', 'create-quiz'],
  ])('links the %s page back to editing the module', async (_name, route) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(module))),
    )

    renderPage(`/edit-module/12/${route}`, 'admin')

    expect(
      await screen.findByRole('link', { name: 'Back to module editing' }),
    ).toHaveAttribute('href', '/edit-module/12')
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
