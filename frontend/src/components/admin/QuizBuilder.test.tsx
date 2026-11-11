import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { drag } from '@/test/dnd-mock'
import QuizBuilder from './QuizBuilder'

vi.mock('@dnd-kit/react', async () =>
  (await import('@/test/dnd-mock')).reactModule(),
)
vi.mock('@dnd-kit/react/sortable', async () =>
  (await import('@/test/dnd-mock')).sortableModule(),
)

function renderBuilder(
  onSave: (quiz: unknown) => Promise<void> = vi
    .fn()
    .mockResolvedValue(undefined),
  onSaved: () => void = vi.fn(),
) {
  render(
    <MemoryRouter>
      <QuizBuilder
        cancelTo="/edit-module/3"
        onSave={onSave}
        onSaved={onSaved}
      />
    </MemoryRouter>,
  )
}

const question = (n: number) =>
  within(screen.getByRole('group', { name: new RegExp(`^Question ${n}:`) }))

const addQuestion = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }))

function fillChoice(n: number, prompt = 'Which?') {
  fireEvent.change(question(n).getByLabelText('Question text'), {
    target: { value: prompt },
  })
  fireEvent.change(question(n).getByLabelText('Option 1 text'), {
    target: { value: 'One' },
  })
  fireEvent.change(question(n).getByLabelText('Option 2 text'), {
    target: { value: 'Two' },
  })
  fireEvent.click(question(n).getByLabelText('Option 1 is correct'))
}

describe('QuizBuilder', () => {
  afterEach(cleanup)

  it('starts with one multiple choice question', () => {
    renderBuilder()

    expect(
      screen.getAllByRole('group', { name: /^Question \d+:/ }),
    ).toHaveLength(1)
    expect(
      screen.getByRole('group', { name: 'Question 1: Multiple choice' }),
    ).toBeInTheDocument()
    expect(question(1).getAllByRole('radio')).toHaveLength(2)
  })

  it('marks exactly one option correct at a time', () => {
    renderBuilder()

    fireEvent.click(question(1).getByLabelText('Option 1 is correct'))
    fireEvent.click(question(1).getByLabelText('Option 2 is correct'))

    expect(question(1).getByLabelText('Option 1 is correct')).not.toBeChecked()
    expect(question(1).getByLabelText('Option 2 is correct')).toBeChecked()
  })

  it('adds and removes options within the allowed range', () => {
    renderBuilder()
    const removeFirst = () => question(1).getByLabelText('Remove option 1')
    expect(removeFirst()).toBeDisabled()

    fireEvent.click(question(1).getByRole('button', { name: 'Add option' }))
    expect(question(1).getAllByRole('radio')).toHaveLength(3)
    expect(removeFirst()).toBeEnabled()

    fireEvent.click(removeFirst())
    expect(question(1).getAllByRole('radio')).toHaveLength(2)
  })

  it('stops adding options at 26', () => {
    renderBuilder()
    const add = question(1).getByRole('button', { name: 'Add option' })

    for (let i = 0; i < 30; i++) fireEvent.click(add)

    expect(question(1).getAllByRole('radio')).toHaveLength(26)
    expect(add).toBeDisabled()
  })

  it('shows a single line for the blank and a larger box for the free response', () => {
    renderBuilder()
    addQuestion('Fill in the blank')
    addQuestion('Free response')

    expect(question(2).getByLabelText('Correct answer').tagName).toBe('INPUT')
    expect(question(3).getByLabelText('Model answer').tagName).toBe('TEXTAREA')
    expect(question(2).queryAllByRole('radio')).toHaveLength(0)
  })

  it('moves focus to the text of a newly added question', async () => {
    renderBuilder()

    addQuestion('Free response')

    await waitFor(() =>
      expect(question(2).getByLabelText('Question text')).toHaveFocus(),
    )
  })

  it('reorders questions by dragging, keeping what was typed', () => {
    renderBuilder()
    fireEvent.change(question(1).getByLabelText('Question text'), {
      target: { value: 'First' },
    })
    addQuestion('Free response')
    fireEvent.change(question(2).getByLabelText('Question text'), {
      target: { value: 'Second' },
    })
    const secondId = screen
      .getByRole('group', { name: /^Question 2:/ })
      .id.replace('question-', '')

    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    drag(secondId, 0)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(question(1).getByLabelText('Question text')).toHaveValue('Second')
    expect(
      screen.getByRole('group', { name: 'Question 1: Free response' }),
    ).toBeInTheDocument()
    expect(question(2).getByLabelText('Question text')).toHaveValue('First')
  })

  it('removes a question and renumbers the rest', () => {
    renderBuilder()
    addQuestion('Fill in the blank')
    fireEvent.change(question(2).getByLabelText('Question text'), {
      target: { value: 'Keep me' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove question 1' }))

    expect(
      screen.getAllByRole('group', { name: /^Question \d+:/ }),
    ).toHaveLength(1)
    expect(
      screen.getByRole('group', { name: 'Question 1: Fill in the blank' }),
    ).toBeInTheDocument()
    expect(question(1).getByLabelText('Question text')).toHaveValue('Keep me')
  })

  it('needs at least one question to save', async () => {
    const onSave = vi.fn()
    renderBuilder(onSave)
    fireEvent.click(screen.getByRole('button', { name: 'Remove question 1' }))
    expect(screen.getByText('No questions yet. Add one below.')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Add at least one question.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('highlights every problem and focuses the first bad question', async () => {
    const onSave = vi.fn()
    renderBuilder(onSave)
    fillChoice(1)
    addQuestion('Fill in the blank')
    addQuestion('Free response')

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fix the highlighted questions.',
    )
    expect(question(1).queryByText(/Enter/)).not.toBeInTheDocument()
    expect(question(2).getByText('Enter the question.')).toBeVisible()
    expect(question(2).getByText('Enter the correct answer.')).toBeVisible()
    expect(question(3).getByText('Enter a model answer.')).toBeVisible()
    expect(question(2).getByLabelText('Question text')).toBeInvalid()
    expect(screen.getByRole('group', { name: /^Question 2:/ })).toHaveFocus()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows no problems before the first save attempt', () => {
    renderBuilder()

    expect(screen.queryByText('Enter the question.')).not.toBeInTheDocument()
  })

  it('saves once, then reports success to the page', async () => {
    let finish: () => void = () => {}
    const onSave = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    )
    const onSaved = vi.fn()
    renderBuilder(onSave, onSaved)
    fillChoice(1)
    const create = screen.getByRole('button', { name: /create/i })

    fireEvent.click(create)
    await waitFor(() => expect(create).toBeDisabled())
    fireEvent.submit(screen.getByRole('form', { name: 'Quiz builder' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSaved).not.toHaveBeenCalled()
    finish()
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })

  it('shows why saving failed and keeps the quiz so it can be retried', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('Module already has a quiz'))
      .mockResolvedValueOnce(undefined)
    const onSaved = vi.fn()
    renderBuilder(onSave, onSaved)
    fillChoice(1, 'Keep this')

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Module already has a quiz',
    )
    expect(question(1).getByLabelText('Question text')).toHaveValue('Keep this')
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /create/i })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledTimes(2)
  })

  it('links Cancel back to the module editor', () => {
    renderBuilder()

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/edit-module/3',
    )
  })

  it('locks the questions while saving, and unlocks them if saving fails', async () => {
    let fail: (reason: Error) => void = () => {}
    const onSave = vi.fn(
      () => new Promise<void>((_resolve, reject) => (fail = reject)),
    )
    renderBuilder(onSave)
    fillChoice(1, 'Keep this')
    const create = screen.getByRole('button', { name: /create/i })

    fireEvent.click(create)
    await waitFor(() => expect(create).toBeDisabled())

    expect(question(1).getByLabelText('Question text')).toBeDisabled()
    expect(question(1).getByLabelText('Option 1 text')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Free response' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeDisabled()
    fail(new Error('Could not save'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save')
    expect(question(1).getByLabelText('Question text')).toBeEnabled()
    expect(question(1).getByLabelText('Question text')).toHaveValue('Keep this')
  })
})
