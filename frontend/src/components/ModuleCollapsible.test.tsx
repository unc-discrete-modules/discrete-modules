import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ModuleCollapsible from './ModuleCollapsible'
import { SidebarProvider } from '@/components/ui/sidebar'
import type { ModuleSummary } from '@/types/types'

const { useModule } = vi.hoisted(() => ({
  useModule: vi.fn(),
}))

vi.mock('@/hooks/use-modules', () => ({ useModule }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))

const moduleSummary: ModuleSummary = {
  id: 8,
  title: 'Sets',
  display_order: 0,
}

describe('ModuleCollapsible', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the module quiz beneath its lessons and marks it active', () => {
    useModule.mockReturnValue({
      module: {
        ...moduleSummary,
        quiz_id: 14,
        lessons: [{ id: 23, title: 'First lesson' }],
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/modules/8/quiz/14']}>
        <SidebarProvider>
          <Routes>
            <Route
              path="/modules/:moduleId/quiz/:quizId"
              element={
                <ModuleCollapsible
                  module={moduleSummary}
                  open
                  onOpenChange={vi.fn()}
                />
              }
            />
          </Routes>
        </SidebarProvider>
      </MemoryRouter>,
    )

    const lesson = screen.getByRole('link', { name: '1. First lesson' })
    const quiz = screen.getByRole('link', { name: 'Quiz 1' })

    expect(lesson).toHaveAttribute('href', '/modules/8/lessons/23')
    expect(quiz).toHaveAttribute('href', '/modules/8/quiz/14')
    expect(lesson.compareDocumentPosition(quiz)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(quiz).toHaveAttribute('data-active')
  })

  it('does not show a quiz link when the module has no quiz', () => {
    useModule.mockReturnValue({
      module: { ...moduleSummary, quiz_id: null, lessons: [] },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/modules/8']}>
        <SidebarProvider>
          <Routes>
            <Route
              path="/modules/:moduleId"
              element={
                <ModuleCollapsible
                  module={moduleSummary}
                  open
                  onOpenChange={vi.fn()}
                />
              }
            />
          </Routes>
        </SidebarProvider>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: 'Quiz' })).not.toBeInTheDocument()
    expect(screen.getByText('No lessons available.')).toBeInTheDocument()
  })
})
