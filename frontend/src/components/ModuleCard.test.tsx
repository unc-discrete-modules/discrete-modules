import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ModuleCard from './ModuleCard'
import type { ModuleSummary } from '@/types/types'

const { useModule } = vi.hoisted(() => ({
  useModule: vi.fn(),
}))

vi.mock('@/hooks/use-modules', () => ({ useModule }))

const moduleSummary: ModuleSummary = {
  id: 8,
  title: 'Sets',
  display_order: 0,
}

describe('ModuleCard', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('links to the first lesson in the module lesson list', () => {
    useModule.mockReturnValue({
      module: {
        ...moduleSummary,
        quiz_id: null,
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
      <MemoryRouter>
        <ModuleCard module={moduleSummary} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/modules/8/lessons/23',
    )
    expect(screen.queryByText('No lessons available.')).not.toBeInTheDocument()
  })

  it('links to the module page when it has no lessons without showing a message', () => {
    useModule.mockReturnValue({
      module: { ...moduleSummary, quiz_id: null, lessons: [] },
      loading: false,
      error: null,
      retry: vi.fn(),
    })

    render(
      <MemoryRouter>
        <ModuleCard module={moduleSummary} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/modules/8')
    expect(screen.queryByText('No lessons available.')).not.toBeInTheDocument()
  })
})
