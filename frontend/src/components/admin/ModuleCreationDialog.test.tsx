import '@testing-library/jest-dom/vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context-value'
import { CourseContext } from '@/context/course-context-value'
import { ModuleCreationDialog } from './ModuleCreationDialog'

describe('ModuleCreationDialog', () => {
  it('creates a module and refreshes the module list', async () => {
    const retry = vi.fn()
    const fetch = vi.fn().mockResolvedValue(
      Response.json(
        {
          id: 12,
          key: 'logic-proofs',
          title: 'Logic & Proofs',
          description: 'Default description.',
          position: 0,
        },
        { status: 201 },
      ),
    )
    vi.stubGlobal('fetch', fetch)

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
        <CourseContext.Provider
          value={{ modules: [], loading: false, error: null, retry }}
        >
          <ModuleCreationDialog />
        </CourseContext.Provider>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    const dialog = within(screen.getByRole('dialog'))
    fireEvent.change(dialog.getByLabelText('Module Name'), {
      target: { value: 'Logic & Proofs' },
    })
    fireEvent.click(dialog.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(retry).toHaveBeenCalledOnce())
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin/modules',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'csrf-token',
        },
        body: JSON.stringify({
          key: 'logic-proofs',
          title: 'Logic & Proofs',
          description: 'Default description.',
        }),
        credentials: 'same-origin',
      }),
    )
  })
})
