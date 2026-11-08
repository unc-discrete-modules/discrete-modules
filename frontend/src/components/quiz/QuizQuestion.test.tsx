import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QuizQuestion from './QuizQuestion'
import type { Question } from '@/types/types'

const multipleChoice: Question = {
  id: 1,
  type: 'multiple_choice',
  prompt: 'Which is the contrapositive of $P \\rightarrow Q$?',
  options: [
    { id: 10, text: '$Q \\rightarrow P$' },
    { id: 11, text: '$\\neg Q \\rightarrow \\neg P$' },
  ],
}

function renderQuestion(question: Question, value = '') {
  const onChange = vi.fn()
  const { container } = render(
    <QuizQuestion
      question={question}
      number={3}
      value={value}
      invalid={false}
      onChange={onChange}
    />,
  )
  return { container, onChange }
}

describe('QuizQuestion', () => {
  afterEach(cleanup)

  it('renders multiple choice as radio options with LaTeX in prompt and options', () => {
    const { container, onChange } = renderQuestion(multipleChoice)

    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(container.querySelectorAll('mjx-container')).toHaveLength(3)
    expect(container.querySelectorAll('legend mjx-container')).toHaveLength(1)

    fireEvent.click(screen.getAllByRole('radio')[1])
    expect(onChange).toHaveBeenCalledWith('11')
  })

  it('checks the option matching the current value', () => {
    renderQuestion(multipleChoice, '10')

    const [first, second] = screen.getAllByRole('radio')
    expect(first).toBeChecked()
    expect(second).not.toBeChecked()
  })

  it('renders fill in the blank as a short text input', () => {
    const { container, onChange } = renderQuestion({
      id: 2,
      type: 'fill_in_blank',
      prompt: 'A proof that assumes $\\neg Q$ is a proof by ______.',
    })

    expect(container.querySelector('mjx-container')).toBeInTheDocument()
    expect(container).toHaveTextContent('______')
    fireEvent.change(screen.getByRole('textbox', { name: /question 3/i }), {
      target: { value: 'contrapositive' },
    })
    expect(onChange).toHaveBeenCalledWith('contrapositive')
  })

  it('renders free response as a textarea', () => {
    const { onChange } = renderQuestion({
      id: 3,
      type: 'free_response',
      prompt: 'Prove that $x^2$ is odd.',
    })

    const textarea = screen.getByRole('textbox', { name: /question 3/i })
    expect(textarea.tagName).toBe('TEXTAREA')
    fireEvent.change(textarea, { target: { value: 'Because.' } })
    expect(onChange).toHaveBeenCalledWith('Because.')
  })
})
