import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type User } from '@/context/auth-context-value'
import LessonCreation from './LessonCreation'
import QuizCreation from './QuizCreation'

const module = {
  id: 12,
  title: 'Discrete Math',
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
          <Route path="/edit-module/:moduleId" element={<p>Module editor</p>} />
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

async function switchToUpload() {
  fireEvent.click(await screen.findByRole('button', { name: 'Upload a file' }))
}

async function chooseQuiz(file: File) {
  await switchToUpload()
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
    await switchToUpload()
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
    await switchToUpload()

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

    await switchToUpload()
    fireEvent.change(screen.getByLabelText('Lesson file'), {
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

    await switchToUpload()
    fireEvent.change(screen.getByLabelText('Lesson file'), {
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

    await switchToUpload()
    fireEvent.change(screen.getByLabelText('Lesson file'), {
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

    await switchToUpload()
    fireEvent.change(screen.getByLabelText('Lesson file'), {
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

    await switchToUpload()
    fireEvent.change(screen.getByLabelText('Lesson file'), {
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

    await switchToUpload()
    fireEvent.change(screen.getByLabelText('Lesson file'), {
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
    await switchToUpload()

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

  it('offers building the quiz in the editor or uploading a file', async () => {
    stubQuizApi()
    renderPage('/edit-module/12/create-quiz', 'admin')

    const build = await screen.findByRole('button', {
      name: 'Build in the editor',
    })
    const upload = screen.getByRole('button', { name: 'Upload a file' })
    expect(build).toHaveAttribute('aria-pressed', 'true')
    expect(upload).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('form', { name: 'Quiz builder' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /create/i })).toBeVisible()

    fireEvent.click(upload)

    expect(upload).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.queryByRole('form', { name: 'Quiz builder' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Quiz file')).toBeVisible()
  })

  it('offers writing the lesson in the editor or uploading a file', async () => {
    stubLessonApi()
    renderPage('/edit-module/12/create-lesson', 'admin')

    const build = await screen.findByRole('button', {
      name: 'Build in the editor',
    })
    const upload = screen.getByRole('button', { name: 'Upload a file' })
    expect(build).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('form', { name: 'Lesson builder' })).toBeVisible()

    fireEvent.click(upload)

    expect(upload).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.queryByRole('form', { name: 'Lesson builder' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Lesson file')).toBeVisible()
  })

  it('keeps what was written when switching to upload and back', async () => {
    stubLessonApi()
    renderPage('/edit-module/12/create-lesson', 'admin')
    fireEvent.change(await screen.findByLabelText('Title'), {
      target: { value: 'Draft title' },
    })

    await switchToUpload()
    fireEvent.click(screen.getByRole('button', { name: 'Build in the editor' }))

    expect(screen.getByLabelText('Title')).toHaveValue('Draft title')
  })

  it('writes a lesson, saves it, and numbers the next one after it', async () => {
    const fetchMock = stubLessonApi({
      create: () =>
        Response.json(lessonRow({ key: 'proofs', title: 'Proofs' }), {
          status: 201,
        }),
    })
    renderPage('/edit-module/12/create-lesson', 'admin')
    const form = await screen.findByRole('form', { name: 'Lesson builder' })
    const field = (name: string) => within(form).getByLabelText(name)

    fireEvent.change(field('Title'), { target: { value: 'Proofs' } })
    fireEvent.change(field('Lesson'), {
      target: { value: '## Welcome\n\nWe prove $x^2$ is odd.' },
    })
    expect(
      await within(form).findByRole('heading', {
        level: 1,
        name: 'Module 12: Lesson 1 - Proofs',
      }),
    ).toBeInTheDocument()
    fireEvent.click(within(form).getByRole('button', { name: /create/i }))

    expect(await within(form).findByRole('status')).toHaveTextContent(
      'Created "Proofs".',
    )
    const init = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    )?.[1]
    expect(fetchMock.mock.calls.find(([, i]) => i === init)?.[0]).toBe(
      '/api/admin/modules/12/lessons',
    )
    expect(init?.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-token' })
    expect(JSON.parse(init?.body as string)).toEqual({
      key: 'proofs',
      title: 'Proofs',
      body: '## Welcome\n\nWe prove $x^2$ is odd.',
      video_url: null,
    })

    fireEvent.change(field('Title'), { target: { value: 'Next' } })
    fireEvent.change(field('Lesson'), { target: { value: '## More' } })
    expect(
      await within(form).findByRole('heading', {
        level: 1,
        name: 'Module 12: Lesson 2 - Next',
      }),
    ).toBeInTheDocument()
  })

  it('brings back a deleted lesson that has the same key', async () => {
    const fetchMock = stubLessonApi({
      existing: [lessonRow({ archived: true, title: 'Old', body: 'Old' })],
    })
    renderPage('/edit-module/12/create-lesson', 'admin')
    const form = await screen.findByRole('form', { name: 'Lesson builder' })

    fireEvent.change(within(form).getByLabelText('Title'), {
      target: { value: 'Intro' },
    })
    fireEvent.change(within(form).getByLabelText('Lesson'), {
      target: { value: '## Rewritten' },
    })
    fireEvent.click(within(form).getByRole('button', { name: /create/i }))

    expect(await within(form).findByRole('status')).toBeInTheDocument()
    expect(writes(fetchMock)).toEqual([
      ['PATCH', '/api/admin/lessons/31'],
      ['POST', '/api/admin/lessons/31/restore'],
    ])
  })

  it('tells the admin to choose another key when one is in use', async () => {
    const fetchMock = stubLessonApi({ existing: [lessonRow()] })
    renderPage('/edit-module/12/create-lesson', 'admin')
    const form = await screen.findByRole('form', { name: 'Lesson builder' })

    fireEvent.change(within(form).getByLabelText('Title'), {
      target: { value: 'Intro' },
    })
    fireEvent.change(within(form).getByLabelText('Lesson'), {
      target: { value: '## Hi' },
    })
    fireEvent.click(within(form).getByRole('button', { name: /create/i }))

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'already has a lesson with the key "intro". Choose a different key.',
    )
    expect(within(form).getByLabelText('Title')).toHaveValue('Intro')
    expect(writes(fetchMock)).toEqual([])
  })

  it('does not call the API for an incomplete lesson', async () => {
    const fetchMock = stubLessonApi()
    renderPage('/edit-module/12/create-lesson', 'admin')
    const form = await screen.findByRole('form', { name: 'Lesson builder' })

    fireEvent.click(within(form).getByRole('button', { name: /create/i }))

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Fix the highlighted fields.',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps what was built when switching to upload and back', async () => {
    stubQuizApi()
    renderPage('/edit-module/12/create-quiz', 'admin')
    const prompt = await screen.findByLabelText('Question text')
    fireEvent.change(prompt, { target: { value: 'Which is $P$?' } })

    await switchToUpload()
    fireEvent.click(screen.getByRole('button', { name: 'Build in the editor' }))

    expect(screen.getByLabelText('Question text')).toHaveValue('Which is $P$?')
  })

  it('builds a quiz with all three question types and saves it', async () => {
    const fetchMock = stubQuizApi()
    renderPage('/edit-module/12/create-quiz', 'admin')
    const form = await screen.findByRole('form', { name: 'Quiz builder' })
    const inQuestion = (n: number) =>
      within(
        within(form).getByRole('group', {
          name: new RegExp(`^Question ${n}:`),
        }),
      )

    fireEvent.change(inQuestion(1).getByLabelText('Question text'), {
      target: { value: 'Which is $P$?' },
    })
    fireEvent.change(inQuestion(1).getByLabelText('Option 1 text'), {
      target: { value: '$x$ is even' },
    })
    fireEvent.change(inQuestion(1).getByLabelText('Option 2 text'), {
      target: { value: 'other' },
    })
    fireEvent.click(inQuestion(1).getByLabelText('Option 1 is correct'))

    fireEvent.click(
      within(form).getByRole('button', { name: 'Fill in the blank' }),
    )
    fireEvent.change(inQuestion(2).getByLabelText('Question text'), {
      target: { value: 'A single case is a proof by ______.' },
    })
    fireEvent.change(inQuestion(2).getByLabelText('Correct answer'), {
      target: { value: 'counterexample' },
    })

    fireEvent.click(within(form).getByRole('button', { name: 'Free response' }))
    fireEvent.change(inQuestion(3).getByLabelText('Question text'), {
      target: { value: 'Prove $x^2$ is odd.' },
    })
    fireEvent.change(inQuestion(3).getByLabelText('Model answer'), {
      target: { value: '1. $x = 2k + 1$' },
    })

    fireEvent.click(within(form).getByRole('button', { name: /create/i }))

    expect(await screen.findByText('Module editor')).toBeInTheDocument()
    const init = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    )?.[1]
    expect(init?.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-token' })
    const { questions } = JSON.parse(init?.body as string)
    expect(questions).toHaveLength(3)
    expect(new Set(questions.map((q: { key: string }) => q.key)).size).toBe(3)
    expect(questions[0].key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    // Keys are random, so they are checked above and left out here.
    expect(
      questions.map((question: Record<string, unknown>) =>
        Object.fromEntries(
          Object.entries(question).filter(([field]) => field !== 'key'),
        ),
      ),
    ).toEqual([
      {
        type: 'multiple_choice',
        prompt: 'Which is $P$?',
        options: [
          { text: '$x$ is even', correct: true },
          { text: 'other', correct: false },
        ],
      },
      {
        type: 'fill_in_blank',
        prompt: 'A single case is a proof by ______.',
        answer: 'counterexample',
      },
      {
        type: 'free_response',
        prompt: 'Prove $x^2$ is odd.',
        answer: '1. $x = 2k + 1$',
      },
    ])
  })

  it('does not send an incomplete quiz and says what to fix', async () => {
    const fetchMock = stubQuizApi()
    renderPage('/edit-module/12/create-quiz', 'admin')
    const form = await screen.findByRole('form', { name: 'Quiz builder' })

    fireEvent.click(within(form).getByRole('button', { name: /create/i }))

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Fix the highlighted questions.',
    )
    expect(within(form).getByText('Enter the question.')).toBeVisible()
    expect(
      within(form).getByText('Fill in every option, or remove the empty ones.'),
    ).toBeVisible()
    expect(writes(fetchMock)).toEqual([])
  })

  it('shows why the server could not save a built quiz and keeps it', async () => {
    stubQuizApi({
      create: () =>
        Response.json(
          {
            error: {
              code: 'conflict',
              message: 'Module is archived; restore it first',
            },
          },
          { status: 409 },
        ),
    })
    renderPage('/edit-module/12/create-quiz', 'admin')
    const form = await screen.findByRole('form', { name: 'Quiz builder' })
    fireEvent.change(within(form).getByLabelText('Question text'), {
      target: { value: 'Q' },
    })
    fireEvent.change(within(form).getByLabelText('Option 1 text'), {
      target: { value: 'A' },
    })
    fireEvent.change(within(form).getByLabelText('Option 2 text'), {
      target: { value: 'B' },
    })
    fireEvent.click(within(form).getByLabelText('Option 2 is correct'))

    fireEvent.click(within(form).getByRole('button', { name: /create/i }))

    expect(await within(form).findByRole('alert')).toHaveTextContent(
      'Module is archived; restore it first',
    )
    expect(within(form).getByLabelText('Question text')).toHaveValue('Q')
    expect(screen.queryByText('Module editor')).not.toBeInTheDocument()
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
