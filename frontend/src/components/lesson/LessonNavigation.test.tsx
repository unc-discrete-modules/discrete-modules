import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import LessonNavigation from './LessonNavigation'

function Location() {
  return <p data-testid="path">{useLocation().pathname}</p>
}

function renderNavigation(
  previousLessonId: number | null,
  nextLessonId: number | null,
  quizId: number | null,
) {
  render(
    <MemoryRouter initialEntries={['/modules/3/lessons/7']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <LessonNavigation
                moduleId="3"
                previousLessonId={previousLessonId}
                nextLessonId={nextLessonId}
                quizId={quizId}
              />
              <Location />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LessonNavigation', () => {
  afterEach(cleanup)

  it('moves to the previous and next lessons', () => {
    renderNavigation(6, 8, 5)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/modules/3/lessons/8')

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/modules/3/lessons/6')
  })

  it('leads to the module quiz after the last lesson', () => {
    renderNavigation(6, null, 5)

    fireEvent.click(screen.getByRole('button', { name: 'Take quiz' }))

    expect(screen.getByTestId('path')).toHaveTextContent('/modules/3/quiz/5')
  })

  it('disables both buttons for a single lesson without a quiz', () => {
    renderNavigation(null, null, null)

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })
})
