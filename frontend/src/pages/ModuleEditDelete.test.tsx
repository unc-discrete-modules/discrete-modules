import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context-value'
import { CourseContext } from '@/context/course-context-value'
import ModuleEdit from './ModuleEdit'

vi.mock('@dnd-kit/react', async () => {
  const React = await import('react')
  return {
    DragDropProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
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

type Lesson = { id: number; title: string }

// Serves the module from a mutable list, so deleting changes what the next
// load returns, as it does on the server.
function stubApi(
  lessons: Lesson[],
  { quizId = 3, failDelete }: { quizId?: number; failDelete?: Response } = {},
) {
  const state = { lessons: [...lessons], quizId: quizId as number | null }
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const path = String(input)
    if (init?.method === 'DELETE') {
      if (failDelete) return Promise.resolve(failDelete)
      const id = Number(path.split('/').pop())
      if (path.startsWith('/api/admin/lessons/')) {
        state.lessons = state.lessons.filter((lesson) => lesson.id !== id)
      } else {
        state.quizId = null
      }
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    if (path === '/api/modules/12') {
      return Promise.resolve(
        Response.json({
          id: 12,
          title: 'Discrete Math',
          description: 'Practice',
          display_order: 0,
          quiz_id: state.quizId,
          lessons: state.lessons,
        }),
      )
    }
    throw new Error(`Unexpected request: ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderModuleEdit() {
  render(
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
    </CourseContext.Provider>,
  )
}

// The Delete trigger sits in the row that contains the given name.
function deleteTriggerFor(name: string) {
  const row = screen.getByText(name).closest('div.flex') as HTMLElement
  return within(row).getByRole('button', { name: 'Delete' })
}

async function confirmDelete() {
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
}

const lessons = [
  { id: 1, title: 'First lesson' },
  { id: 2, title: 'Second lesson' },
]

describe('deleting module content', () => {
  it('deletes a lesson after confirmation and removes it from the list', async () => {
    const fetchMock = stubApi(lessons)
    renderModuleEdit()
    await screen.findByText('First lesson')

    fireEvent.click(deleteTriggerFor('First lesson'))
    expect(
      await screen.findByText('Are you sure you want to delete this lesson?'),
    ).toBeInTheDocument()
    await confirmDelete()

    // The module reloads after a delete; the page is briefly replaced by a
    // loading message, so wait until the refreshed list is showing.
    await waitFor(() => {
      expect(screen.queryByText('First lesson')).not.toBeInTheDocument()
      expect(screen.getByText('Second lesson')).toBeInTheDocument()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/lessons/1',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'csrf-token' },
      }),
    )
  })

  it('does nothing when the confirmation is cancelled', async () => {
    const fetchMock = stubApi(lessons)
    renderModuleEdit()
    await screen.findByText('First lesson')

    fireEvent.click(deleteTriggerFor('First lesson'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('First lesson')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE'),
    ).toBe(false)
  })

  it('shows why a lesson could not be deleted and keeps it', async () => {
    stubApi(lessons, {
      failDelete: Response.json(
        { error: { code: 'not_found', message: 'Lesson 1 not found' } },
        { status: 404 },
      ),
    })
    renderModuleEdit()
    await screen.findByText('First lesson')

    fireEvent.click(deleteTriggerFor('First lesson'))
    await confirmDelete()

    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Lesson 1 not found',
    )
    expect(screen.getByText('First lesson')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

  it('deletes the quiz through the same row', async () => {
    const fetchMock = stubApi(lessons, { quizId: 3 })
    renderModuleEdit()
    await screen.findByText('Quiz 1')

    fireEvent.click(deleteTriggerFor('Quiz 1'))
    expect(
      await screen.findByText('Are you sure you want to delete this quiz?'),
    ).toBeInTheDocument()
    await confirmDelete()

    await waitFor(() => {
      expect(screen.queryByText('Quiz 1')).not.toBeInTheDocument()
      expect(screen.getByText('First lesson')).toBeInTheDocument()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/quizzes/3',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
