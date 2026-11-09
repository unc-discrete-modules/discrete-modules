import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { apiFetch } from './api'

const user = { id: 1, email: 'student@example.unc.edu', csrf_token: 'csrf' }
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status })

describe('Authentication', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('checks the session before requesting course data', () => {
    const fetch = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetch)
    render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session',
    )
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]).toEqual(
      expect.arrayContaining(['/api/auth/me']),
    )
    expect(
      screen.queryByRole('heading', { name: /Welcome back,/ }),
    ).not.toBeInTheDocument()
  })

  it('sends anonymous deep links through login without loading course data', async () => {
    window.history.replaceState({}, '', '/modules/2/lessons/3?view=video#demo')
    const fetch = vi.fn().mockResolvedValue(json({}, 401))
    vi.stubGlobal('fetch', fetch)
    render(<App />)
    const signIn = await screen.findByRole('link', { name: 'Sign in with UNC' })
    const destination = new URL(
      signIn.getAttribute('href')!,
      window.location.origin,
    )
    expect(destination.pathname).toBe('/api/auth/login')
    expect(destination.searchParams.get('return_to')).toBe(
      '/modules/2/lessons/3?view=video#demo',
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('loads the learning application after an authenticated session check', async () => {
    const fetch = vi.fn((path: string) =>
      Promise.resolve(json(path === '/api/auth/me' ? user : [])),
    )
    vi.stubGlobal('fetch', fetch)
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: /Welcome back,/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Click on a card to begin.')).toBeInTheDocument()
    expect(screen.getByText(user.email)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/modules',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })

  it('offers a retry after a session service failure', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({}, 401))
    vi.stubGlobal('fetch', fetch)
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'couldn’t check your session',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('link', { name: 'Sign in with UNC' }),
    ).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('shows a safe SSO failure with a retry link', async () => {
    window.history.replaceState({}, '', '/login?error=sso_failed')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 401)))
    render(<App />)
    expect(
      await screen.findByRole('link', { name: 'Sign in with UNC' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'couldn’t complete UNC sign-in',
    )
  })

  it('returns an authenticated user from login to the saved page', async () => {
    window.history.replaceState({}, '', '/login?return_to=%2Fmodules%2F2')
    const fetch = vi.fn((path: string) => {
      if (path === '/api/auth/me') {
        return Promise.resolve(json(user))
      }
      if (path === '/api/modules') {
        return Promise.resolve(
          json([
            {
              id: 2,
              title: 'Module 2',
              description: 'Test module',
              display_order: 0,
            },
          ]),
        )
      }
      if (path === '/api/modules/2') {
        return Promise.resolve(
          json({
            id: 2,
            title: 'Module 2',
            description: 'Test module',
            display_order: 0,
            quiz_id: null,
            lessons: [],
          }),
        )
      }
      return Promise.resolve(json([]))
    })
    vi.stubGlobal(
      'fetch',
      fetch,
    )
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: 'Module 2' }),
    ).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/modules/2',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })

  it('signs out with CSRF protection and clears the learning view', async () => {
    const fetch = vi.fn((path: string) =>
      Promise.resolve(
        path === '/api/auth/logout'
          ? new Response(null, { status: 204 })
          : json(path === '/api/auth/me' ? user : []),
      ),
    )
    vi.stubGlobal('fetch', fetch)
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(
      await screen.findByRole('link', { name: 'Sign in with UNC' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'UNC single sign-on session may still be active',
    )
    expect(screen.queryByText(user.email)).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-CSRF-Token': 'csrf' },
        credentials: 'same-origin',
      }),
    )
  })

  it('keeps the account visible when logout fails and allows retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) =>
        Promise.resolve(
          path === '/api/auth/logout'
            ? json({}, 503)
            : json(path === '/api/auth/me' ? user : []),
        ),
      ),
    )
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not sign out',
    )
    expect(screen.getByText(user.email)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled()
  })

  it('clears private state and returns to login when an API session expires', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) =>
        Promise.resolve(
          path === '/api/lessons/1'
            ? json({}, 401)
            : json(path === '/api/auth/me' ? user : []),
        ),
      ),
    )
    render(<App />)
    await screen.findByRole('heading', { name: /Welcome back,/ })
    await act(async () => {
      await apiFetch('/lessons/1')
    })
    expect(
      await screen.findByRole('link', { name: 'Sign in with UNC' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(user.email)).not.toBeInTheDocument()
  })

  it('does not offer an external return destination', async () => {
    window.history.replaceState({}, '', '/login?return_to=%2F%2Fevil.example')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 401)))
    render(<App />)
    const link = await screen.findByRole('link', { name: 'Sign in with UNC' })
    expect(link).toHaveAttribute('href', '/api/auth/login?return_to=%2F')
  })
})

describe('Demo login', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it.each([true, false])(
    'signs in as the demo user and preserves the requested page (DEV=%s)',
    async (development) => {
      window.history.replaceState({}, '', '/login?return_to=%2Fmodules%2F2')
      vi.stubEnv('DEV', development)
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      )
      let loggedIn = false
      const fetch = vi.fn((path: string) => {
        if (path === '/api/auth/dev-login') {
          loggedIn = true
          return Promise.resolve(new Response(null, { status: 204 }))
        }
        return Promise.resolve(
          path === '/api/auth/me'
            ? json(
                { ...user, email: 'demo@example.test' },
                loggedIn ? 200 : 401,
              )
            : json([]),
        )
      })
      vi.stubGlobal('fetch', fetch)
      render(<App />)
      fireEvent.click(
        await screen.findByRole('button', { name: 'Sign in as demo user' }),
      )
      expect(await screen.findByText('demo@example.test')).toBeInTheDocument()
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/dev-login',
        expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
      )
    },
  )

  it('offers a development-only admin demo sign in', async () => {
    vi.stubEnv('DEV', true)
    const fetch = vi.fn((path: string) =>
      Promise.resolve(
        path === '/api/auth/dev-login?admin=true'
          ? new Response(null, { status: 204 })
          : json({}, 401),
      ),
    )
    vi.stubGlobal('fetch', fetch)
    render(<App />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Sign in as demo admin' }),
    )
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/dev-login?admin=true',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
    )
  })

  it('shows the demo button in production', async () => {
    window.history.replaceState({}, '', '/login')
    vi.stubEnv('DEV', false)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 401)))
    render(<App />)
    await screen.findByRole('link', { name: 'Sign in with UNC' })
    expect(
      screen.queryByRole('button', { name: 'Sign in as demo admin' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sign in as demo user' }),
    ).toBeInTheDocument()
  })

  it('shows a retryable error when demo login fails', async () => {
    window.history.replaceState({}, '', '/login')
    vi.stubEnv('DEV', true)
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) =>
        Promise.resolve(json({}, path === '/api/auth/me' ? 401 : 503)),
      ),
    )
    render(<App />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Sign in as demo user' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not sign in as the demo user',
    )
    expect(
      screen.getByRole('button', { name: 'Sign in as demo user' }),
    ).toBeEnabled()
  })
})
