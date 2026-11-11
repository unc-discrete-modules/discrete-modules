import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '@/context/auth-context-value'
import { CourseContext } from '@/context/course-context-value'
import ModuleEdit from './ModuleEdit'

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
          'Move first lesson down',
        ),
        children,
      ),
  }
})

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({
    ref: () => {},
    handleRef: () => {},
    isDragging: false,
  }),
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderModuleEdit() {
  return (
    <CourseContext.Provider
      value={{
        modules: [],
        loading: false,
        error: null,
        retry: vi.fn(),
        updateModuleOrder: vi.fn(),
        updateModuleTitle: vi.fn(),
      }}
    >
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
        <MemoryRouter initialEntries={['/edit-module/12']}>
          <Routes>
            <Route path="/edit-module/:moduleId" element={<ModuleEdit />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </CourseContext.Provider>
  )
}

describe('module lesson reorder', () => {
  it('saves the module name and reflects the updated title', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/modules/12') {
        return Promise.resolve(
          Response.json({
            id: 12,
            title: 'Discrete Math',
            description: 'Practice',
            display_order: 0,
            quiz_id: 3,
            lessons: [],
          }),
        )
      }
      if (String(input) === '/api/admin/modules/12') {
        return Promise.resolve(
          Response.json({
            id: 12,
            key: 'discrete-math',
            title: 'Combinatorics',
            description: 'Practice',
            position: 0,
          }),
        )
      }
      throw new Error(`Unexpected request: ${String(input)}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(renderModuleEdit())

    const nameInput = await screen.findByRole('textbox', { name: 'Module Name' })
    expect(nameInput).toHaveValue('Discrete Math')
    fireEvent.change(nameInput, { target: { value: 'Combinatorics' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0])

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/modules/12',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            title: 'Combinatorics',
            description: 'Practice',
          }),
        }),
      )
    })
    expect(nameInput).toHaveValue('Combinatorics')
  })

  it('renders the current module lessons and saves their reordered IDs', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/modules/12') {
        return Promise.resolve(
          Response.json({
            id: 12,
            title: 'Discrete Math',
            description: 'Practice',
            display_order: 0,
            quiz_id: 3,
            lessons: [
              { id: 1, title: 'First lesson' },
              { id: 2, title: 'Second lesson' },
            ],
          }),
        )
      }
      if (String(input) === '/api/admin/modules/12/lessons/order') {
        return Promise.resolve(Response.json({ ids: [2, 1] }))
      }
      throw new Error(`Unexpected request: ${String(input)}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(renderModuleEdit())

    expect(await screen.findByText('First lesson')).toBeInTheDocument()
    expect(screen.getByText('Second lesson')).toBeInTheDocument()
    expect(screen.getByText('Quiz 1')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Reorder' })[0])
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Move first lesson down' })[0],
    )
    expect(
      screen.getByText('Second lesson').compareDocumentPosition(
        screen.getByText('First lesson'),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Reorder lesson First lesson' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[1])

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/modules/12/lessons/order',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ ids: [2, 1] }),
        }),
      )
    })
    expect(
      screen.getAllByRole('button', { name: 'Reorder' })[0],
    ).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Reorder' })[1])
    expect(
      screen.getByRole('button', { name: 'Reorder quiz Quiz 1' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[1])
    expect(
      screen.queryByRole('button', { name: 'Reorder quiz Quiz 1' }),
    ).not.toBeInTheDocument()
  })
})

describe('save errors', () => {
  const failingApi = (failingPath: string) =>
    vi.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/modules/12') {
        return Promise.resolve(
          Response.json({
            id: 12,
            title: 'Discrete Math',
            description: 'Practice',
            display_order: 0,
            quiz_id: null,
            lessons: [
              { id: 1, title: 'First lesson' },
              { id: 2, title: 'Second lesson' },
            ],
          }),
        )
      }
      if (String(input) === failingPath) {
        return Promise.resolve(Response.json({}, { status: 500 }))
      }
      throw new Error(`Unexpected request: ${String(input)}`)
    })

  it('shows a failed module name save only beside the name', async () => {
    vi.stubGlobal('fetch', failingApi('/api/admin/modules/12'))
    render(renderModuleEdit())
    const nameInput = await screen.findByRole('textbox', { name: 'Module Name' })

    fireEvent.change(nameInput, { target: { value: 'Combinatorics' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0])

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Unable to save module name.')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(
      alert.compareDocumentPosition(screen.getByText('Lessons')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('shows a failed lesson order save only in the lessons area', async () => {
    vi.stubGlobal('fetch', failingApi('/api/admin/modules/12/lessons/order'))
    render(renderModuleEdit())
    await screen.findByText('First lesson')

    fireEvent.click(screen.getAllByRole('button', { name: 'Reorder' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[1])

    const alert = await screen.findByRole('alert')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(alert).not.toHaveTextContent('module name')
    expect(
      screen.getByText('Lessons').compareDocumentPosition(alert) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
