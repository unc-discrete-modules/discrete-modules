import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminQuiz } from '@/types/types'
import { drag } from '@/test/dnd-mock'
import QuizEditor from './QuizEditor'

vi.mock('@dnd-kit/react', async () =>
  (await import('@/test/dnd-mock')).reactModule(),
)
vi.mock('@dnd-kit/react/sortable', async () =>
  (await import('@/test/dnd-mock')).sortableModule(),
)

const quiz: AdminQuiz = {
  id: 5,
  module_id: 9,
  archived: false,
  questions: [
    {
      id: 101,
      key: 'identify-p',
      type: 'multiple_choice',
      prompt: 'Which is $P$?',
      answer: null,
      archived: false,
      options: [
        { text: '$x$ is even', correct: true },
        { text: 'other', correct: false },
      ],
    },
    {
      id: 102,
      key: 'disprove',
      type: 'fill_in_blank',
      prompt: 'A single case is a proof by ______.',
      answer: 'counterexample',
      archived: false,
      options: null,
    },
    {
      id: 103,
      key: 'odd-square',
      type: 'free_response',
      prompt: 'Prove $x^2$ is odd.',
      answer: 'Model answer.',
      archived: false,
      options: null,
    },
    {
      id: 104,
      key: 'removed-earlier',
      type: 'fill_in_blank',
      prompt: 'Already removed.',
      answer: 'x',
      archived: true,
      options: null,
    },
  ],
}

// Answers a save with the quiz as the server would return it.
function stubSave(respond: (sent: { questions: unknown[] }) => Response) {
  const fetchMock = vi.fn<typeof fetch>((_input, init) =>
    Promise.resolve(respond(JSON.parse(init?.body as string))),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// What the API returns once it has stored the questions that were sent.
const stored = (sent: { questions: unknown[] }) =>
  Response.json({
    ...quiz,
    questions: (
      sent.questions as {
        key: string
        type: string
        prompt: string
        answer?: string
        options?: { text: string; correct: boolean }[]
      }[]
    ).map((question, index) => ({
      id: 200 + index,
      archived: false,
      answer: question.answer ?? null,
      options: question.options ?? null,
      key: question.key,
      type: question.type,
      prompt: question.prompt,
    })),
  })

function renderEditor() {
  render(
    <MemoryRouter initialEntries={['/edit-module/9/edit-quiz/5']}>
      <Routes>
        <Route
          path="/edit-module/:moduleId/edit-quiz/:quizId"
          element={<QuizEditor quiz={quiz} csrfToken="csrf" />}
        />
        <Route path="/edit-module/:moduleId" element={<p>Module editor</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const question = (n: number) =>
  within(screen.getByRole('group', { name: new RegExp(`^Question ${n}:`) }))
const save = () => screen.getByRole('button', { name: /^Sav(e|ing)/ })
const sentQuestions = (fetchMock: ReturnType<typeof stubSave>) =>
  JSON.parse(fetchMock.mock.calls[0][1]?.body as string).questions as {
    key: string
    [field: string]: unknown
  }[]

describe('QuizEditor', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens with the quiz loaded: every question, type and answer key', () => {
    renderEditor()

    expect(
      screen.getAllByRole('group', { name: /^Question \d+:/ }),
    ).toHaveLength(3)
    expect(
      screen.getByRole('group', { name: 'Question 1: Multiple choice' }),
    ).toBeInTheDocument()
    expect(question(1).getByLabelText('Question text')).toHaveValue(
      'Which is $P$?',
    )
    expect(question(1).getByLabelText('Option 1 text')).toHaveValue(
      '$x$ is even',
    )
    expect(question(1).getByLabelText('Option 1 is correct')).toBeChecked()
    expect(question(1).getByLabelText('Option 2 is correct')).not.toBeChecked()
    expect(question(2).getByLabelText('Correct answer')).toHaveValue(
      'counterexample',
    )
    expect(question(3).getByLabelText('Model answer')).toHaveValue(
      'Model answer.',
    )
    expect(screen.queryByDisplayValue('Already removed.')).toBeNull()
    expect(save()).toBeDisabled()
    expect(screen.queryByText('You have unsaved changes.')).toBeNull()
  })

  it('saves edits with every question keeping its key', async () => {
    const fetchMock = stubSave(stored)
    renderEditor()
    fireEvent.change(question(1).getByLabelText('Question text'), {
      target: { value: 'Which is $Q$?' },
    })
    fireEvent.change(question(1).getByLabelText('Option 2 text'), {
      target: { value: 'something else' },
    })
    fireEvent.click(question(1).getByLabelText('Option 2 is correct'))
    fireEvent.change(question(2).getByLabelText('Correct answer'), {
      target: { value: 'contradiction' },
    })

    expect(screen.getByText('You have unsaved changes.')).toBeVisible()
    fireEvent.click(save())

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.')
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/admin/quizzes/5')
    expect(init).toMatchObject({
      method: 'PUT',
      headers: { 'X-CSRF-Token': 'csrf' },
    })
    expect(sentQuestions(fetchMock)).toEqual([
      {
        key: 'identify-p',
        type: 'multiple_choice',
        prompt: 'Which is $Q$?',
        options: [
          { text: '$x$ is even', correct: false },
          { text: 'something else', correct: true },
        ],
      },
      {
        key: 'disprove',
        type: 'fill_in_blank',
        prompt: 'A single case is a proof by ______.',
        answer: 'contradiction',
      },
      {
        key: 'odd-square',
        type: 'free_response',
        prompt: 'Prove $x^2$ is odd.',
        answer: 'Model answer.',
      },
    ])
    expect(save()).toBeDisabled()
    expect(screen.queryByText('You have unsaved changes.')).toBeNull()
  })

  it('saves a new question order', async () => {
    const fetchMock = stubSave(stored)
    renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    drag('odd-square', 1)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(
      screen.getByRole('group', { name: 'Question 2: Free response' }),
    ).toBeInTheDocument()
    expect(save()).toBeEnabled()
    fireEvent.click(save())

    await screen.findByRole('status')
    expect(sentQuestions(fetchMock).map((q) => q.key)).toEqual([
      'identify-p',
      'odd-square',
      'disprove',
    ])
  })

  it('leaves out a removed question, which the server then archives', async () => {
    const fetchMock = stubSave(stored)
    renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Remove question 2' }))
    fireEvent.click(save())

    await screen.findByRole('status')
    expect(sentQuestions(fetchMock).map((q) => q.key)).toEqual([
      'identify-p',
      'odd-square',
    ])
  })

  it('adds a question with a new key and leaves the others as they were', async () => {
    const fetchMock = stubSave(stored)
    renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Free response' }))
    fireEvent.change(question(4).getByLabelText('Question text'), {
      target: { value: 'Explain.' },
    })
    fireEvent.change(question(4).getByLabelText('Model answer'), {
      target: { value: 'Because.' },
    })
    fireEvent.click(save())

    await screen.findByRole('status')
    const sent = sentQuestions(fetchMock)
    expect(sent.slice(0, 3).map((q) => q.key)).toEqual([
      'identify-p',
      'disprove',
      'odd-square',
    ])
    expect(sent[3].key).toMatch(/^q-[a-z0-9-]+$/)
    expect(sent[3]).toMatchObject({ type: 'free_response', answer: 'Because.' })
  })

  it('is clean again when an edit is undone', () => {
    renderEditor()
    const prompt = question(1).getByLabelText('Question text')

    fireEvent.change(prompt, { target: { value: 'Different' } })
    expect(save()).toBeEnabled()
    fireEvent.change(prompt, { target: { value: 'Which is $P$?' } })

    expect(save()).toBeDisabled()
    expect(screen.queryByText('You have unsaved changes.')).toBeNull()
  })

  it('needs another save after more edits', async () => {
    stubSave(stored)
    renderEditor()
    fireEvent.change(question(2).getByLabelText('Correct answer'), {
      target: { value: 'one' },
    })
    fireEvent.click(save())
    await screen.findByRole('status')

    fireEvent.change(question(2).getByLabelText('Correct answer'), {
      target: { value: 'two' },
    })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(save()).toBeEnabled()
  })

  it('does not send an incomplete quiz and focuses the question to fix', async () => {
    const fetchMock = stubSave(stored)
    renderEditor()
    fireEvent.change(question(2).getByLabelText('Correct answer'), {
      target: { value: '  ' },
    })

    fireEvent.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fix the highlighted questions.',
    )
    expect(question(2).getByText('Enter the correct answer.')).toBeVisible()
    expect(screen.getByRole('group', { name: /^Question 2:/ })).toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('will not save a quiz with no questions, and says how to remove it', async () => {
    const fetchMock = stubSave(stored)
    renderEditor()
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Remove question 1' }))
    }
    expect(screen.getByText('No questions yet. Add one below.')).toBeVisible()

    fireEvent.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A quiz needs at least one question. To remove the quiz, delete it in the module editor.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('points to the question the server rejects', async () => {
    stubSave(() =>
      Response.json(
        {
          error: {
            code: 'validation_error',
            message: 'Request validation failed',
            details: [
              {
                loc: ['body', 'questions', 0, 'options'],
                msg: 'Value error, Exactly one option must be correct',
                type: 'value_error',
              },
            ],
          },
        },
        { status: 422 },
      ),
    )
    renderEditor()
    fireEvent.change(question(1).getByLabelText('Question text'), {
      target: { value: 'Changed' },
    })

    fireEvent.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Question 1 (options): Value error, Exactly one option must be correct',
    )
    expect(question(1).getByLabelText('Question text')).toHaveValue('Changed')
    expect(save()).toBeEnabled()
  })

  it('shows why saving failed and keeps the edits', async () => {
    stubSave(() =>
      Response.json(
        { error: { code: 'not_found', message: 'Quiz 5 not found' } },
        { status: 404 },
      ),
    )
    renderEditor()
    fireEvent.change(question(3).getByLabelText('Model answer'), {
      target: { value: 'Keep me' },
    })

    fireEvent.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Quiz 5 not found',
    )
    expect(question(3).getByLabelText('Model answer')).toHaveValue('Keep me')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('sends one request while a save is in flight', async () => {
    let finish: () => void = () => {}
    const fetchMock = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          finish = () => resolve(stored({ questions: [] }))
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderEditor()
    fireEvent.change(question(2).getByLabelText('Correct answer'), {
      target: { value: 'one' },
    })

    fireEvent.click(save())
    await waitFor(() => expect(save()).toBeDisabled())
    fireEvent.submit(screen.getByRole('form', { name: 'Quiz editor' }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    finish()
    await screen.findByRole('status')
  })

  it('sends nothing when nothing changed', () => {
    const fetchMock = stubSave(stored)
    renderEditor()

    fireEvent.submit(screen.getByRole('form', { name: 'Quiz editor' }))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('asks before leaving with unsaved changes, and stays if declined', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderEditor()
    fireEvent.change(question(2).getByLabelText('Correct answer'), {
      target: { value: 'changed' },
    })

    fireEvent.click(
      screen.getByRole('link', { name: 'Back to module editing' }),
    )

    expect(confirm).toHaveBeenCalledWith('Leave without saving your changes?')
    expect(screen.queryByText('Module editor')).not.toBeInTheDocument()
  })

  it('leaves without asking when nothing is unsaved', () => {
    const confirm = vi.spyOn(window, 'confirm')
    renderEditor()

    fireEvent.click(
      screen.getByRole('link', { name: 'Back to module editing' }),
    )

    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByText('Module editor')).toBeInTheDocument()
  })

  it('warns before the tab is closed only while changes are unsaved', () => {
    renderEditor()
    const closing = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(closing()).toBe(false)

    fireEvent.change(question(2).getByLabelText('Correct answer'), {
      target: { value: 'changed' },
    })
    expect(closing()).toBe(true)
  })

  it('locks the questions while saving, so edits made meanwhile are not replaced', async () => {
    let finish: () => void = () => {}
    const fetchMock = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          finish = () => resolve(stored(JSON.parse('{"questions":[]}')))
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderEditor()
    fireEvent.change(question(2).getByLabelText('Correct answer'), {
      target: { value: 'one' },
    })

    fireEvent.click(save())
    await waitFor(() => expect(save()).toBeDisabled())

    expect(question(1).getByLabelText('Question text')).toBeDisabled()
    expect(question(2).getByLabelText('Correct answer')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Remove question 1' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Free response' })).toBeDisabled()
    finish()
    await screen.findByRole('status')
    expect(screen.getByRole('button', { name: 'Free response' })).toBeEnabled()
  })

  it('unlocks the questions when saving fails, with the edits kept', async () => {
    stubSave(() =>
      Response.json(
        { error: { code: 'not_found', message: 'Quiz 5 not found' } },
        { status: 404 },
      ),
    )
    renderEditor()
    fireEvent.change(question(2).getByLabelText('Correct answer'), {
      target: { value: 'Keep me' },
    })

    fireEvent.click(save())

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(question(2).getByLabelText('Correct answer')).toBeEnabled()
    expect(question(2).getByLabelText('Correct answer')).toHaveValue('Keep me')
  })
})
