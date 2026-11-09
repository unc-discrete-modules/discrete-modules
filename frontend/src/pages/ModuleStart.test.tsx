import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import ModuleStart from './ModuleStart'
import type { Module } from '@/types/types'

const { useModule } = vi.hoisted(() => ({
  useModule: vi.fn(),
}))

vi.mock('@/hooks/use-modules', () => ({ useModule }))

const moduleDetails: Module = {
  id: 8,
  title: 'Sets',
  description: 'An introduction to sets.',
  display_order: 0,
  quiz_id: null,
  lessons: [],
}

function Location() {
  return <p data-testid="path">{useLocation().pathname}</p>
}

describe('ModuleStart', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the empty lesson message on the module page', () => {
    useModule.mockReturnValue({
      module: moduleDetails,
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/modules/8']}>
        <Routes>
          <Route path="/modules/:moduleId" element={<ModuleStart />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('No lessons available.')).toBeInTheDocument()
  })

  it('redirects modules with lessons to the first lesson', () => {
    useModule.mockReturnValue({
      module: {
        ...moduleDetails,
        lessons: [
          { id: 23, title: 'First lesson' },
          { id: 4, title: 'Second lesson' },
        ],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/modules/8']}>
        <Routes>
          <Route path="/modules/:moduleId" element={<ModuleStart />} />
          <Route
            path="/modules/:moduleId/lessons/:lessonId"
            element={<Location />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('path')).toHaveTextContent(
      '/modules/8/lessons/23',
    )
  })
})
