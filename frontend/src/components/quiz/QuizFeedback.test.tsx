import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QuizFeedback from './QuizFeedback'
import type { Quiz, SubmissionResult } from '@/types/types'

const quiz: Quiz = {
  id: 4,
  questions: [
    {
      id: 1,
      type: 'multiple_choice',
      prompt: 'Pick the contrapositive of $P \\rightarrow Q$.',
      options: [
        { id: 10, text: 'Neither statement' },
        { id: 11, text: '$\\neg Q \\rightarrow \\neg P$' },
      ],
    },
    { id: 2, type: 'fill_in_blank', prompt: 'Proof by ______.' },
    { id: 3, type: 'free_response', prompt: 'Prove $x^2$ is odd.' },
  ],
}

const values = { 1: '10', 2: 'induction', 3: 'My own proof.' }

const result: SubmissionResult = {
  results: [
    {
      question_id: 1,
      correct: false,
      correct_answer: '$\\neg Q \\rightarrow \\neg P$',
      correct_option_id: 11,
    },
    { question_id: 2, correct: true, correct_answer: 'induction' },
    {
      question_id: 3,
      correct: null,
      correct_answer: '1. $x = 2k + 1$.\n2. $x^2$ is odd.',
    },
  ],
}

function renderFeedback(
  overrides: Partial<{ onRetry: () => void; onBack: () => void }> = {},
) {
  return render(
    <QuizFeedback
      quiz={quiz}
      values={values}
      result={result}
      onRetry={overrides.onRetry ?? vi.fn()}
      onBack={overrides.onBack ?? vi.fn()}
    />,
  )
}

function questionItem(number: number) {
  return screen.getAllByRole('listitem')[number - 1]
}

describe('QuizFeedback', () => {
  afterEach(cleanup)

  it('scores only the auto-graded questions', () => {
    renderFeedback()

    expect(
      screen.getByText('Score: 1 of 2 auto-graded questions correct'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Free response questions are not graded/),
    ).toBeVisible()
  })

  it('marks each answer with text, not color alone', () => {
    renderFeedback()

    expect(within(questionItem(1)).getByText('Incorrect')).toBeInTheDocument()
    expect(within(questionItem(2)).getByText('Correct')).toBeInTheDocument()
    expect(within(questionItem(3)).queryByText('Correct')).toBeNull()
    expect(within(questionItem(3)).queryByText('Incorrect')).toBeNull()
    expect(within(questionItem(3)).getByText(/Not graded/)).toBeInTheDocument()
  })

  it('shows the student answer and the correct answer for every question', () => {
    renderFeedback()

    const choice = questionItem(1)
    expect(within(choice).getByText('Neither statement')).toBeInTheDocument()
    expect(within(choice).getByText('Correct answer')).toBeInTheDocument()
    expect(choice.querySelectorAll('dd mjx-container')).toHaveLength(1)

    const blank = questionItem(2)
    expect(within(blank).getAllByText('induction')).toHaveLength(2)

    const essay = questionItem(3)
    expect(within(essay).getByText('My own proof.')).toBeInTheDocument()
    expect(within(essay).getByText('Model answer')).toBeInTheDocument()
  })

  it('renders LaTeX in the correct answers through MathJax', () => {
    renderFeedback()

    expect(questionItem(1).querySelectorAll('dd mjx-container')).toHaveLength(1)
    expect(questionItem(3).querySelectorAll('dd mjx-container')).toHaveLength(2)
    expect(questionItem(3).querySelectorAll('ol li')).toHaveLength(2)
  })

  it('offers retry and back to module actions', () => {
    const onRetry = vi.fn()
    const onBack = vi.fn()
    renderFeedback({ onRetry, onBack })

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back to module' }))

    expect(onRetry).toHaveBeenCalledOnce()
    expect(onBack).toHaveBeenCalledOnce()
  })
})
