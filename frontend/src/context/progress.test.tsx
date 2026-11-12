import '@testing-library/jest-dom/vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProgressProvider } from './progress-context'
import { useProgress } from './progress-context-value'
import ModuleCard from '@/components/ModuleCard'
import ModuleCollapsible from '@/components/ModuleCollapsible'
import { SidebarProvider } from '@/components/ui/sidebar'
import Lesson from '@/pages/Lesson'

const { getMyProgress, completeLesson } = vi.hoisted(() => ({
  getMyProgress: vi.fn(),
  completeLesson: vi.fn(),
}))
vi.mock('@/api/client', () => ({ getMyProgress, completeLesson }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
const moduleDetails = {
  id: 8,
  title: 'Sets',
  display_order: 0,
  quiz_id: 9,
  lessons: [
    { id: 23, title: 'First' },
    { id: 4, title: 'Second' },
  ],
}
vi.mock('@/hooks/use-modules', () => ({
  useModule: () => ({
    module: moduleDetails,
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}))
vi.mock('@/hooks/use-lesson', () => ({
  useLesson: () => ({
    lesson: {
      id: 4,
      title: 'Second',
      body: 'Lesson body',
      previous_lesson_id: 23,
      next_lesson_id: null,
    },
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}))
const row = {
  module_id: 8,
  lesson_count: 2,
  completed_lesson_ids: [23],
  best_quiz_attempt: { score: 1, max_score: 1 },
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function RetryProgress() {
  const progress = useProgress()
  return progress?.error ? (
    <button onClick={progress.retry}>Retry progress</button>
  ) : null
}
function view(key = 'user-1') {
  return (
    <ProgressProvider key={key} csrfToken={key}>
      <MemoryRouter initialEntries={['/modules/8/lessons/4']}>
        <SidebarProvider>
          <Routes>
            <Route
              path="/modules/:moduleId/lessons/:lessonId"
              element={
                <>
                  <RetryProgress />
                  <ModuleCard module={moduleDetails} />
                  <ModuleCollapsible
                    module={moduleDetails}
                    open
                    onOpenChange={vi.fn()}
                  />
                  <Lesson />
                </>
              }
            />
          </Routes>
        </SidebarProvider>
      </MemoryRouter>
    </ProgressProvider>
  )
}
beforeEach(() => {
  getMyProgress.mockResolvedValue([row])
  completeLesson.mockReset()
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
describe('shared lesson progress', () => {
  it('resumes at the first incomplete lesson and updates all views after completion', async () => {
    const pending = deferred<{ lesson_id: number; completed_at: number }>()
    completeLesson.mockReturnValue(pending.promise)
    render(view())
    expect(await screen.findByText('50%')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Module 1: Sets/ }),
    ).toHaveAttribute('href', '/modules/8/lessons/4')
    expect(screen.getByLabelText('1 of 2 lessons complete')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Second.*To do/ }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }))
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    expect(completeLesson).toHaveBeenCalledWith(4, 'user-1')
    await act(async () => pending.resolve({ lesson_id: 4, completed_at: 1 }))
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByLabelText('2 of 2 lessons complete')).toBeInTheDocument()
    expect(screen.getByText('Lesson complete')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2. Second' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Module 1: Sets/ }),
    ).toHaveAttribute('href', '/modules/8/lessons/23')
  })
  it('retains progress and allows retry after a failed completion', async () => {
    completeLesson
      .mockRejectedValueOnce(new Error('Save failed'))
      .mockResolvedValueOnce({ lesson_id: 4, completed_at: 1 })
    render(view())
    fireEvent.click(
      await screen.findByRole('button', { name: 'Mark complete' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed')
    expect(screen.getByText('50%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }))
    expect(await screen.findByText('Lesson complete')).toBeInTheDocument()
  })
  it('does not restore progress from a previous session after a user change', async () => {
    const old = deferred<(typeof row)[]>()
    getMyProgress
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce([{ ...row, completed_lesson_ids: [] }])
    const { rerender } = render(view('user-1'))
    rerender(view('user-2'))
    expect(await screen.findByText('0%')).toBeInTheDocument()
    await act(async () => old.resolve([row]))
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })
  it('shows a neutral state for modules without lessons', async () => {
    getMyProgress.mockResolvedValueOnce([
      { ...row, lesson_count: 0, completed_lesson_ids: [] },
    ])
    render(view())
    expect((await screen.findAllByText('No lessons')).length).toBe(2)
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })
  it('shows unavailable progress without blocking lessons and recovers after retry', async () => {
    getMyProgress
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([row])
    render(view())
    expect(await screen.findByText('Progress unavailable')).toBeInTheDocument()
    expect(screen.getByText('Lesson body')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Mark complete' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry progress' }))
    await waitFor(() => expect(screen.getByText('50%')).toBeInTheDocument())
  })
})
