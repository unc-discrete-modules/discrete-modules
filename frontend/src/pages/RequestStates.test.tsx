import '@testing-library/jest-dom/vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '@/context/auth-context-value'
import { CourseProvider } from '@/context/course-context'
import { useLesson } from '@/hooks/use-lesson'
import { useModule } from '@/hooks/use-modules'
import Home from './Home'
import Lesson from './Lesson'

const summary = {
  id: 1,
  title: 'Proofs',
  description: 'Practice',
  display_order: 0,
}
const moduleDetails = {
  ...summary,
  quiz_id: 3,
  lessons: [{ id: 1, title: 'Introduction' }],
}
const lesson = {
  id: 1,
  title: 'Introduction',
  body: 'A lesson about proofs.',
  previous_lesson_id: null,
  next_lesson_id: null,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

function renderHome() {
  return render(
    <AuthContext.Provider
      value={{
        state: { status: 'anonymous', user: null },
        loggedOut: false,
        retry: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter>
        <CourseProvider>
          <Home />
        </CourseProvider>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function renderLesson() {
  return render(
    <MemoryRouter initialEntries={['/modules/1/lessons/1']}>
      <Routes>
        <Route
          path="/modules/:moduleId/lessons/:lessonId"
          element={<Lesson />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('module request states', () => {
  it('shows loading then module cards', async () => {
    const pending = deferred<Response>()
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending.promise))
    renderHome()
    expect(screen.getByRole('status')).toHaveTextContent('Loading modules')
    await act(async () => pending.resolve(Response.json([summary])))
    expect(screen.getByRole('link', { name: /Proofs/ })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a network error, retries, then displays an empty state', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(Response.json([])),
    )
    renderHome()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Check your connection',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No modules available.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ignores canceled module responses after changing the requested module', async () => {
    const old = deferred<Response>()
    const fetch = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(Response.json({ ...moduleDetails, id: 2 }))
    vi.stubGlobal('fetch', fetch)
    const { result, rerender } = renderHook(({ id }) => useModule(id), {
      initialProps: { id: 1 },
    })
    rerender({ id: 2 })
    await waitFor(() => expect(result.current.module?.id).toBe(2))
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
    await act(async () => old.resolve(Response.json(moduleDetails)))
    expect(result.current.module?.id).toBe(2)
  })
})

describe('lesson request states', () => {
  it('shows loading and a readable not-found error, then retries successfully', async () => {
    const pending = deferred<Response>()
    let attempts = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) => {
        if (path === '/api/modules/1')
          return Promise.resolve(Response.json(moduleDetails))
        attempts += 1
        return attempts === 1
          ? pending.promise
          : Promise.resolve(Response.json(lesson))
      }),
    )
    renderLesson()
    expect(screen.getByRole('status')).toHaveTextContent('Loading lesson')
    await act(async () =>
      pending.resolve(
        Response.json(
          { error: { code: 'not_found', message: 'Lesson not found.' } },
          { status: 404 },
        ),
      ),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Lesson not found.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('heading', { name: /Introduction/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Take quiz' })).toBeEnabled()
  })

  it('keeps lesson content when navigation fails and supports retrying navigation', async () => {
    let attempts = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) => {
        if (path === '/api/lessons/1')
          return Promise.resolve(Response.json(lesson))
        attempts += 1
        return Promise.resolve(
          attempts === 1
            ? new Response('unavailable', { status: 503 })
            : Response.json(moduleDetails),
        )
      }),
    )
    renderLesson()
    expect(
      await screen.findByRole('heading', { name: /Introduction/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Please try again')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(
      await screen.findByRole('button', { name: 'Take quiz' }),
    ).toBeEnabled()
    expect(screen.getByText('A lesson about proofs.')).toBeInTheDocument()
  })

  it('shows navigation loading while keeping the lesson visible', async () => {
    const pending = deferred<Response>()
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) =>
        path === '/api/modules/1'
          ? pending.promise
          : Promise.resolve(Response.json(lesson)),
      ),
    )
    renderLesson()
    expect(
      await screen.findByRole('heading', { name: /Introduction/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading lesson navigation',
    )
    await act(async () => pending.resolve(Response.json(moduleDetails)))
    expect(screen.getByRole('button', { name: 'Take quiz' })).toBeEnabled()
  })

  it('does not let a canceled response overwrite a newer lesson', async () => {
    const old = deferred<Response>()
    const fetch = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(
        Response.json({ ...lesson, id: 2, title: 'New lesson' }),
      )
    vi.stubGlobal('fetch', fetch)
    const { result, rerender } = renderHook(({ id }) => useLesson(id), {
      initialProps: { id: '1' },
    })
    rerender({ id: '2' })
    await waitFor(() => expect(result.current.lesson?.id).toBe(2))
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
    await act(async () => old.resolve(Response.json(lesson)))
    expect(result.current.lesson?.title).toBe('New lesson')
  })

  it('cancels on unmount and rejects invalid lesson IDs without a request', () => {
    const fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    vi.stubGlobal('fetch', fetch)
    const { unmount } = renderHook(() => useLesson('1'))
    unmount()
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
    const { result } = renderHook(() => useLesson('invalid'))
    expect(result.current.error?.message).toBe('Lesson not found')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
