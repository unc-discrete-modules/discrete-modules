import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createQuestion, type DraftQuestion } from '@/lib/quiz-draft'
import { drag } from '@/test/dnd-mock'
import QuestionListEditor from './QuestionListEditor'

vi.mock('@dnd-kit/react', async () =>
  (await import('@/test/dnd-mock')).reactModule(),
)
vi.mock('@dnd-kit/react/sortable', async () =>
  (await import('@/test/dnd-mock')).sortableModule(),
)

const make = (
  id: string,
  type: DraftQuestion['type'],
  prompt: string,
): DraftQuestion => ({ ...createQuestion(type), id, prompt })

const first = make('first', 'multiple_choice', 'Which is $P$?')
const second = make('second', 'fill_in_blank', 'A proof by ______.')
const third = make('third', 'free_response', 'Prove it.\nUse two columns.')

// Keeps the questions in state, as the builder and the editor do.
function Harness({
  initial,
  onChange,
}: {
  initial: DraftQuestion[]
  onChange?: (questions: DraftQuestion[]) => void
}) {
  const [questions, setQuestions] = useState(initial)
  return (
    <QuestionListEditor
      questions={questions}
      showProblems={false}
      onChange={(next) => {
        onChange?.(next)
        setQuestions(next)
      }}
    />
  )
}

const ids = (onChange: ReturnType<typeof vi.fn>) =>
  (onChange.mock.lastCall?.[0] as DraftQuestion[]).map((q) => q.id)

describe('QuestionListEditor reordering', () => {
  afterEach(cleanup)

  it('needs two questions before they can be reordered', () => {
    const { rerender } = render(
      <QuestionListEditor
        questions={[first]}
        showProblems={false}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeDisabled()

    rerender(
      <QuestionListEditor
        questions={[first, second]}
        showProblems={false}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Reorder' })).toBeEnabled()
  })

  it('shows short rows with drag handles while reordering', () => {
    render(<Harness initial={[first, second, third]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))

    expect(screen.getByRole('button', { name: 'Done' })).toBeVisible()
    expect(screen.getByText('Question 1: Multiple choice')).toBeVisible()
    expect(screen.getByText('Which is $P$?')).toBeVisible()
    expect(screen.getByText('Question 2: Fill in the blank')).toBeVisible()
    for (const n of [1, 2, 3]) {
      expect(
        screen.getByRole('button', { name: `Reorder question ${n}` }),
      ).toBeVisible()
    }
  })

  it('hides the editors and the add buttons while reordering', () => {
    render(<Harness initial={[first, second]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))

    expect(screen.queryByLabelText('Question text')).toBeNull()
    expect(screen.queryByRole('group', { name: /^Question/ })).toBeNull()
    expect(screen.queryByText('Add question:')).toBeNull()
    expect(screen.getByText(/Drag the handles/)).toBeVisible()
  })

  it('summarizes a question by its first line only', () => {
    render(<Harness initial={[third, make('empty', 'free_response', '  ')]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))

    expect(screen.getByText('Prove it.')).toBeVisible()
    expect(screen.queryByText(/Use two columns/)).toBeNull()
    expect(screen.getByText('(no question text yet)')).toBeVisible()
  })

  it('moves a question when it is dropped in a new place', () => {
    const onChange = vi.fn()
    render(<Harness initial={[first, second, third]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))

    drag('third', 0)

    expect(ids(onChange)).toEqual(['third', 'first', 'second'])
    expect(screen.getByText('Question 1: Free response')).toBeInTheDocument()
  })

  it('moves a question down as well as up', () => {
    const onChange = vi.fn()
    render(<Harness initial={[first, second, third]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))

    drag('first', 2)

    expect(ids(onChange)).toEqual(['second', 'third', 'first'])
  })

  it.each([
    ['a cancelled drag', () => drag('third', 0, true)],
    ['a drop in the same place', () => drag('second', 1)],
    ['an unknown question', () => drag('nope', 0)],
    ['a drop past the end', () => drag('first', 9)],
    ['a drop before the start', () => drag('first', -1)],
    ['an item that is not a question id', () => drag(7, 0)],
  ])('ignores %s', (_name, act) => {
    const onChange = vi.fn()
    render(<Harness initial={[first, second, third]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))

    act()

    expect(onChange).not.toHaveBeenCalled()
  })

  it('brings the editors back, in the new order, with their content', () => {
    render(<Harness initial={[first, second, third]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    drag('third', 0)

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    const groups = screen.getAllByRole('group', { name: /^Question \d+:/ })
    expect(groups.map((g) => g.id)).toEqual([
      'question-third',
      'question-first',
      'question-second',
    ])
    expect(within(groups[0]).getByLabelText('Question text')).toHaveValue(
      'Prove it.\nUse two columns.',
    )
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeVisible()
    expect(screen.getByText('Add question:')).toBeVisible()
  })

  it('does not submit a form around it when the button is used', () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={submit}>
        <QuestionListEditor
          questions={[first, second]}
          showProblems={false}
          onChange={vi.fn()}
        />
      </form>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(submit).not.toHaveBeenCalled()
  })

  it('has no move up or down buttons any more', () => {
    render(<Harness initial={[first, second]} />)

    expect(screen.queryByRole('button', { name: /Move question/ })).toBeNull()
  })

  it('ignores a drop that arrives after the list was locked', () => {
    const onChange = vi.fn()
    const props = {
      questions: [first, second, third],
      showProblems: false,
      onChange,
    }
    const { rerender } = render(<QuestionListEditor {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))

    // A drag was under way when saving started and the list was locked.
    rerender(<QuestionListEditor {...props} disabled />)
    drag('third', 0)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('accepts drops again once it is unlocked', () => {
    const onChange = vi.fn()
    const props = {
      questions: [first, second, third],
      showProblems: false,
      onChange,
    }
    const { rerender } = render(<QuestionListEditor {...props} disabled />)

    rerender(<QuestionListEditor {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    drag('third', 0)

    expect(ids(onChange)).toEqual(['third', 'first', 'second'])
  })

  it('locks the editors and the reorder controls while disabled', () => {
    render(
      <QuestionListEditor
        questions={[first, second]}
        showProblems={false}
        onChange={vi.fn()}
        disabled
      />,
    )

    expect(screen.getAllByLabelText('Question text')[0]).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Free response' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Remove question 1' }),
    ).toBeDisabled()
  })
})
