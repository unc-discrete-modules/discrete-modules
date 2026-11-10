import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type User } from '@/context/auth-context-value'
import LessonCreation from './LessonCreation'
import QuizCreation from './QuizCreation'

const module = {
  id: 12,
  title: 'Discrete Math',
  description: 'Practice',
  display_order: 0,
  quiz_id: null,
  lessons: [],
}

function renderPage(path: string, role: User['role']) {
  render(
    <AuthContext.Provider
      value={{
        state: {
          status: 'authenticated',
          user: {
            id: 1,
            email: 'user@example.unc.edu',
            onyen: 'user',
            display_name: 'User',
            role,
            csrf_token: 'csrf-token',
          },
        },
        loggedOut: false,
        retry: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/edit-module/:moduleId/create-lesson"
            element={<LessonCreation />}
          />
          <Route
            path="/edit-module/:moduleId/create-quiz"
            element={<QuizCreation />}
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('content creation pages', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('offers a Markdown upload for a lesson in the module', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(module))),
    )

    renderPage('/edit-module/12/create-lesson', 'admin')

    expect(
      await screen.findByRole('heading', { name: 'Add lesson' }),
    ).toBeInTheDocument()
    expect(screen.getByText('to Discrete Math')).toBeInTheDocument()
    expect(screen.getByLabelText('Lesson file')).toHaveAttribute(
      'accept',
      '.md',
    )
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/edit-module/12',
    )
  })

  it('offers a YAML upload for a quiz in the module', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(module))),
    )

    renderPage('/edit-module/12/create-quiz', 'admin')

    expect(
      await screen.findByRole('heading', { name: 'Add quiz' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Quiz file')).toHaveAttribute(
      'accept',
      '.yaml,.yml',
    )
  })

  it('turns students away without requesting the module', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderPage('/edit-module/12/create-lesson', 'student')

    expect(
      screen.getByText('You do not have access to this page.'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports an unknown module', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            { error: { code: 'not_found', message: 'x' } },
            { status: 404 },
          ),
        ),
      ),
    )

    renderPage('/edit-module/99/create-lesson', 'admin')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByLabelText('Lesson file')).not.toBeInTheDocument()
  })
})
