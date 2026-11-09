import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/context/auth-context-value'
import { CourseProvider } from '@/context/course-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import ModuleSidebar from '@/components/ModuleSidebar'
import AdminHome from './AdminHome'

type MockDragEndEvent = {
  canceled: boolean
  operation: {
    source: { id: number; index: number }
    target: { id: number }
  }
}

vi.mock('@dnd-kit/react', async () => {
  const React = await import('react')
  return {
    DragDropProvider: ({
      onDragEnd,
      children,
    }: {
      onDragEnd: (event: MockDragEndEvent) => void
      children: React.ReactNode
    }) =>
      React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          {
            onClick: () =>
              onDragEnd({
                canceled: false,
                operation: {
                  source: { id: 1, index: 1 },
                  target: { id: 2 },
                },
              }),
          },
          'Move first module down',
        ),
        children,
      ),
  }
})

vi.mock('@/components/admin/AdminModuleCard', async () => {
  const React = await import('react')
  return {
    default: ({
      module,
      index,
    }: {
      module: { title: string }
      index: number
    }) =>
      React.createElement('div', null, `Module ${index + 1}: ${module.title}`),
  }
})

vi.mock('@/components/admin/ModuleCreationDialog', () => ({
  ModuleCreationDialog: () => null,
}))

const modules = [
  { id: 1, title: 'First module', description: 'First', display_order: 0 },
  { id: 2, title: 'Second module', description: 'Second', display_order: 1 },
]

function renderAdminHome(reorderResponse: Response) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === '/api/modules') {
      return Promise.resolve(Response.json(modules))
    }
    if (String(input) === '/api/admin/modules/order') {
      return Promise.resolve(reorderResponse)
    }
    throw new Error(`Unexpected request: ${String(input)} ${init?.method ?? ''}`)
  })
  vi.stubGlobal('fetch', fetchMock)

  render(
    <AuthContext.Provider
      value={{
        state: {
          status: 'authenticated',
          user: {
            id: 1,
            email: 'admin@example.unc.edu',
            onyen: 'admin',
            display_name: 'Admin',
            role: 'admin',
            csrf_token: 'csrf-token',
          },
        },
        loggedOut: false,
        retry: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter>
        <CourseProvider>
          <SidebarProvider>
            <ModuleSidebar />
            <AdminHome />
          </SidebarProvider>
        </CourseProvider>
      </MemoryRouter>
    </AuthContext.Provider>,
  )

  return fetchMock
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
})

describe('admin module reorder', () => {
  it('updates sidebar order and numbering after a successful save', async () => {
    const fetchMock = renderAdminHome(Response.json({ ids: [2, 1] }))

    expect(await screen.findByText('1. First module')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Move first module down' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('1. Second module')).toBeInTheDocument()
      expect(screen.getByText('2. First module')).toBeInTheDocument()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/modules/order',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('keeps the sidebar order unchanged when saving fails', async () => {
    const fetchMock = renderAdminHome(
      Response.json(
        { error: { code: 'server_error', message: 'Save failed.' } },
        { status: 500 },
      ),
    )

    expect(await screen.findByText('1. First module')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Move first module down' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load this content',
    )
    expect(screen.getByText('1. First module')).toBeInTheDocument()
    expect(screen.getByText('2. Second module')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter(([input]) => String(input) === '/api/modules'),
    ).toHaveLength(1)
  })
})
