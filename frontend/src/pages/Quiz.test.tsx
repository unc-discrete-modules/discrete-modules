import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context-value'
import Quiz from './Quiz'

const quiz = {
  id: 4,
  questions: [
    {
      id: 1,
      type: 'multiple_choice',
      prompt: 'Pick $P$.',
      options: [
        { id: 10, text: '$P$' },
        { id: 11, text: '$Q$' },
      ],
    },
    { id: 2, type: 'fill_in_blank', prompt: 'Proof by ______.' },
    { id: 3, type: 'free_response', prompt: 'Prove it.' },
  ],
}

const module = {
  id: 9,
  title: 'Proofs',
  description: '',
  display_order: 9,
  quiz_id: 4,
  lessons: [
    { id: 20, title: 'One' },
    { id: 21, title: 'Two' },
  ],
}

const result = {
  results: [
    {
      question_id: 1,
      correct: true,
      correct_answer: '$P$',
      correct_option_id: 10,
    },
    { question_id: 2, correct: false, correct_answer: 'contrapositive' },
    { question_id: 3, correct: null, correct_answer: 'Because.' },
  ],
}

function json(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function Location() {
  const location = useLocation()
  return (
    <p data-testid="location">
      {location.pathname} {JSON.stringify(location.state)}
    </p>
  )
}

function stubApi(submit: () => Promise<Response> = () => json(result)) {
  const fetch = vi.fn((path: string, init?: RequestInit) => {
    if (init?.method === 'POST') return submit()
    if (path === '/api/modules/9/quiz') return json(quiz)
    if (path === '/api/modules/9') return json(module)
    return json({}, 404)
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

function renderQuiz(path = '/modules/9/quiz/4') {
  render(
    <AuthContext.Provider
      value={{
        state: {
          status: 'authenticated',
          user: {
            id: 1,
            email: 'student@example.unc.edu',
            onyen: 'student',
            display_name: 'Student',
            role: 'student',
            csrf_token: 'csrf',
          },
        },
        loggedOut: false,
        retry: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/modules/:moduleId/quiz/:quizId" element={<Quiz />} />
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function postCalls(fetch: ReturnType<typeof stubApi>) {
  return fetch.mock.calls.filter(([, init]) => init?.method === 'POST')
}

async function answerEverything() {
  await screen.findByText('Question 1')
  fireEvent.click(screen.getAllByRole('radio')[1])
  const [blank, essay] = screen.getAllByRole('textbox')
  fireEvent.change(blank, { target: { value: 'contrapositive' } })
  fireEvent.change(essay, { target: { value: 'Because.' } })
}

describe('Quiz page', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders every question in order', async () => {
    stubApi()
    renderQuiz()

    expect(await screen.findByText('Question 1')).toBeInTheDocument()
    expect(screen.getByText('Question 2')).toBeInTheDocument()
    expect(screen.getByText('Question 3')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
  })

  it('reports a quiz that does not belong to the module as not found', async () => {
    stubApi()
    renderQuiz('/modules/9/quiz/999')

    expect(await screen.findByText('Quiz not found.')).toBeInTheDocument()
    expect(screen.queryByText('Question 1')).not.toBeInTheDocument()
  })

  it('does not submit while a question is unanswered', async () => {
    const fetch = stubApi()
    renderQuiz()
    await screen.findByText('Question 1')

    fireEvent.click(screen.getAllByRole('radio')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Answer every question before submitting. Unanswered: 2, 3.',
    )
    expect(postCalls(fetch)).toHaveLength(0)
    expect(document.getElementById('question-2')).toHaveFocus()
  })

  it('treats whitespace-only text as unanswered', async () => {
    const fetch = stubApi()
    renderQuiz()
    await answerEverything()

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unanswered: 2.')
    expect(postCalls(fetch)).toHaveLength(0)
  })

  it('submits all answers and shows the results in place', async () => {
    const fetch = stubApi()
    renderQuiz()
    await answerEverything()

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    const heading = await screen.findByRole('heading', {
      name: 'Quiz results',
    })
    // Focus moves in an effect just after the heading appears.
    await waitFor(() => expect(heading).toHaveFocus())
    expect(screen.getByText(/Score: 1 of 2/)).toBeInTheDocument()
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
    const [path, init] = postCalls(fetch)[0]
    expect(path).toBe('/api/quizzes/4/submissions')
    // The backend rejects state-changing requests without the session's token.
    expect(init?.headers).toMatchObject({ 'X-CSRF-Token': 'csrf' })
    expect(JSON.parse(init?.body as string)).toEqual({
      answers: [
        { question_id: 1, type: 'multiple_choice', option_id: 11 },
        { question_id: 2, type: 'fill_in_blank', text: 'contrapositive' },
        { question_id: 3, type: 'free_response', text: 'Because.' },
      ],
    })
  })

  it('never lets the browser submit the form natively, which would reload the page', async () => {
    stubApi()
    renderQuiz()
    await screen.findByText('Question 1')
    const form = document.querySelector('form') as HTMLFormElement

    // dispatchEvent returns false when the handler called preventDefault.
    expect(fireEvent.submit(form)).toBe(false)

    await answerEverything()
    expect(fireEvent.submit(form)).toBe(false)
    await screen.findByRole('heading', { name: 'Quiz results' })
  })

  it('starts a blank attempt when retrying from the results', async () => {
    stubApi()
    renderQuiz()
    await answerEverything()
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await screen.findByRole('heading', { name: 'Quiz results' })

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Question 1')).toBeInTheDocument()
    screen.getAllByRole('radio').forEach((radio) => {
      expect(radio).not.toBeChecked()
    })
    screen.getAllByRole('textbox').forEach((box) => {
      expect(box).toHaveValue('')
    })
  })

  it('returns to the first lesson of the module from the results', async () => {
    stubApi()
    renderQuiz()
    await answerEverything()
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await screen.findByRole('heading', { name: 'Quiz results' })

    fireEvent.click(screen.getByRole('button', { name: 'Back to module' }))

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/modules/9/lessons/20',
    )
  })

  it('keeps the answers and allows retrying after a failed submission', async () => {
    stubApi(() => json({}, 500))
    renderQuiz()
    await answerEverything()

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to submit your answers.',
    )
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled()
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('contrapositive')
  })

  it('offers a retry when the quiz cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json({}, 500)),
    )
    renderQuiz()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load this content.',
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
  })

  it('returns to the last lesson of the module', async () => {
    stubApi()
    renderQuiz()
    await screen.findByText('Question 1')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/modules/9/lessons/21',
    )
  })
})
