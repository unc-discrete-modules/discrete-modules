import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import LessonHeader from './LessonHeader'

describe('LessonHeader', () => {
  afterEach(cleanup)

  it('numbers the lesson by its position in the module', () => {
    render(
      <LessonHeader
        title="Proofs Continued"
        moduleId="9"
        lessonNumber={2}
        objectives=""
      />,
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Module 9: Lesson 2 - Proofs Continued',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Dashboard / Module 9 / Lesson 2')).toBeVisible()
  })

  it('omits the lesson number until it is known', () => {
    render(<LessonHeader title="Proofs Continued" moduleId="9" objectives="" />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Module 9: Proofs Continued',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Dashboard / Module 9')).toBeVisible()
  })
})
