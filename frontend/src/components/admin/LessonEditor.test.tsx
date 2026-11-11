import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LessonResponse, Module } from '@/types/types'
import LessonEditor from './LessonEditor'

const lesson: LessonResponse = {
  id: 31,
  module_id: 9,
  key: 'proofs-continued',
  title: 'Proofs Continued',
  body: '## Learning Objectives\n\n- Prove things\n\n## The idea\n\nWe prove $x^2$.',
  video_url: 'https://www.youtube.com/watch?v=abc123',
  position: 1,
  archived: false,
}

const module: Module = {
  id: 9,
  title: 'Proofs',
  description: 'Write proofs',
  display_order: 9,
  quiz_id: null,
  lessons: [
    { id: 20, title: 'Proofs' },
    { id: 31, title: 'Proofs Continued' },
  ],
}

// Answers a save with the lesson as the server would store it.
function stubSave(respond: (sent: Record<string, unknown>) => Response) {
  const fetchMock = vi.fn<typeof fetch>((_input, init) =>
    Promise.resolve(respond(JSON.parse(init?.body as string))),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const echo = (sent: Record<string, unknown>) =>
  Response.json({ ...lesson, ...sent })

function renderEditor(moduleData: Module | null = module) {
  render(
    <MemoryRouter initialEntries={['/edit-module/9/edit-lesson/31']}>
      <Routes>
        <Route
          path="/edit-module/:moduleId/edit-lesson/:lessonId"
          element={
            <LessonEditor
              lesson={lesson}
              module={moduleData}
              csrfToken="csrf"
            />
          }
        />
        <Route path="/edit-module/:moduleId" element={<p>Module editor</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const field = (label: string) => screen.getByLabelText(label)
const type = (label: string, value: string) =>
  fireEvent.change(field(label), { target: { value } })
// The button reads "Saving..." while a save is in flight.
const save = () => screen.getByRole('button', { name: /^Sav(e|ing)/ })
const view = (name: 'Edit' | 'Preview') => screen.getByRole('button', { name })

describe('LessonEditor', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('opens with the lesson loaded into its fields', () => {
    renderEditor()

    expect(field('Title')).toHaveValue('Proofs Continued')
    expect(field('Video link (optional)')).toHaveValue(lesson.video_url)
    expect(field('Lesson (Markdown)')).toHaveValue(lesson.body)
    expect(screen.getByText('proofs-continued')).toBeInTheDocument()
    expect(view('Edit')).toHaveAttribute('aria-pressed', 'true')
    expect(save()).toBeDisabled()
    expect(screen.queryByText('You have unsaved changes.')).toBeNull()
  })

  it('lets the Markdown be typed directly and flags unsaved changes', () => {
    renderEditor()

    type('Lesson (Markdown)', '## New heading\n\n**Bold** text')

    expect(field('Lesson (Markdown)')).toHaveValue(
      '## New heading\n\n**Bold** text',
    )
    expect(screen.getByText('You have unsaved changes.')).toBeVisible()
    expect(save()).toBeEnabled()
  })

  it('previews the lesson as students see it, with unsaved edits', () => {
    renderEditor()
    type('Title', 'Contrapositive')
    type('Lesson (Markdown)', '## Fresh\n\nWe prove $y^2$.')

    fireEvent.click(view('Preview'))

    const preview = screen.getByRole('region', { name: 'Preview' })
    expect(preview).toHaveTextContent('Module 9: Lesson 2 - Contrapositive')
    expect(screen.getByRole('heading', { name: 'Fresh' })).toBeVisible()
    expect(preview.querySelector('mjx-container')).toBeInTheDocument()
    expect(preview.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abc123',
    )
    expect(preview).not.toHaveTextContent('$y^2$')
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(view('Preview')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the overview section as students do', () => {
    renderEditor()

    fireEvent.click(view('Preview'))

    const preview = screen.getByRole('region', { name: 'Preview' })
    expect(preview).toHaveTextContent('Overview')
    expect(preview).toHaveTextContent('Prove things')
    expect(preview).not.toHaveTextContent('Learning Objectives')
  })

  it('goes back to editing with everything typed still there', () => {
    renderEditor()
    type('Title', 'Changed')
    fireEvent.click(view('Preview'))

    fireEvent.click(view('Edit'))

    expect(field('Title')).toHaveValue('Changed')
    expect(screen.getByText('You have unsaved changes.')).toBeVisible()
  })

  it('leaves the lesson number out of the preview until the module is known', () => {
    renderEditor(null)

    fireEvent.click(view('Preview'))

    expect(screen.getByRole('region', { name: 'Preview' })).toHaveTextContent(
      'Module 9: Proofs Continued',
    )
  })

  it('saves the changes, then treats them as saved', async () => {
    const fetchMock = stubSave(echo)
    renderEditor()
    type('Title', '  Contrapositive  ')
    type('Lesson (Markdown)', '\n## New\n\n')

    fireEvent.click(save())

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.')
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/admin/lessons/31')
    expect(init).toMatchObject({
      method: 'PATCH',
      headers: { 'X-CSRF-Token': 'csrf' },
    })
    expect(JSON.parse(init?.body as string)).toEqual({
      title: 'Contrapositive',
      body: '## New',
      video_url: lesson.video_url,
    })
    expect(save()).toBeDisabled()
    expect(screen.queryByText('You have unsaved changes.')).toBeNull()
    expect(field('Title')).toHaveValue('Contrapositive')
  })

  it('shows the Markdown as the server stored it', async () => {
    stubSave((sent) =>
      Response.json({ ...lesson, ...sent, body: '## Tidied\n' }),
    )
    renderEditor()
    type('Lesson (Markdown)', '## Tidied   \r\n')

    fireEvent.click(save())

    await screen.findByRole('status')
    expect(field('Lesson (Markdown)')).toHaveValue('## Tidied\n')
    expect(save()).toBeDisabled()
  })

  it('clears the video when its link is emptied', async () => {
    const fetchMock = stubSave(echo)
    renderEditor()
    type('Video link (optional)', '   ')

    fireEvent.click(save())

    await screen.findByRole('status')
    expect(
      JSON.parse(fetchMock.mock.calls[0][1]?.body as string),
    ).toMatchObject({ video_url: null })
  })

  it('saves from the preview too', async () => {
    const fetchMock = stubSave(echo)
    renderEditor()
    type('Title', 'Changed')
    fireEvent.click(view('Preview'))

    fireEvent.click(save())

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('asks for new changes to be saved again after saving', async () => {
    stubSave(echo)
    renderEditor()
    type('Title', 'One')
    fireEvent.click(save())
    await screen.findByRole('status')

    type('Title', 'Two')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(save()).toBeEnabled()
  })

  it('does not send a lesson with a missing title, and focuses the field', async () => {
    const fetchMock = stubSave(echo)
    renderEditor()
    type('Title', '   ')

    fireEvent.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fix the highlighted fields.',
    )
    expect(screen.getByText('Enter a title.')).toBeVisible()
    expect(field('Title')).toBeInvalid()
    await waitFor(() => expect(field('Title')).toHaveFocus())
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a video link that is not a web address', async () => {
    const fetchMock = stubSave(echo)
    renderEditor()
    type('Video link (optional)', 'youtube')

    fireEvent.click(save())

    expect(await screen.findByText(/full http\(s\) link/)).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('brings the admin back to the editing view to fix a problem', async () => {
    stubSave(echo)
    renderEditor()
    type('Lesson (Markdown)', '')
    fireEvent.click(view('Preview'))

    fireEvent.click(save())

    expect(await screen.findByText('Write the lesson.')).toBeVisible()
    expect(view('Edit')).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(field('Lesson (Markdown)')).toHaveFocus())
  })

  it('shows why saving failed and keeps the edits for another try', async () => {
    const fetchMock = stubSave(() =>
      Response.json(
        { error: { code: 'not_found', message: 'Lesson 31 not found' } },
        { status: 404 },
      ),
    )
    renderEditor()
    type('Title', 'Keep me')

    fireEvent.click(save())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Lesson 31 not found',
    )
    expect(field('Title')).toHaveValue('Keep me')
    expect(save()).toBeEnabled()
    expect(screen.queryByRole('status')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends one request while a save is in flight', async () => {
    let finish: () => void = () => {}
    const fetchMock = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          finish = () => resolve(Response.json({ ...lesson, title: 'One' }))
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderEditor()
    type('Title', 'One')

    fireEvent.click(save())
    await waitFor(() => expect(save()).toBeDisabled())
    fireEvent.submit(screen.getByRole('form', { name: 'Lesson editor' }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    finish()
    await screen.findByRole('status')
  })

  it('sends nothing when nothing changed', () => {
    const fetchMock = stubSave(echo)
    renderEditor()

    fireEvent.submit(screen.getByRole('form', { name: 'Lesson editor' }))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns to the module editor without asking when nothing is unsaved', () => {
    const confirm = vi.spyOn(window, 'confirm')
    renderEditor()

    fireEvent.click(
      screen.getByRole('link', { name: 'Back to module editing' }),
    )

    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByText('Module editor')).toBeInTheDocument()
  })

  it('asks before leaving with unsaved changes, and stays if declined', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderEditor()
    type('Title', 'Changed')

    fireEvent.click(
      screen.getByRole('link', { name: 'Back to module editing' }),
    )

    expect(confirm).toHaveBeenCalledWith('Leave without saving your changes?')
    expect(screen.queryByText('Module editor')).not.toBeInTheDocument()
    expect(field('Title')).toHaveValue('Changed')
  })

  it('leaves when the admin confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderEditor()
    type('Title', 'Changed')

    fireEvent.click(
      screen.getByRole('link', { name: 'Back to module editing' }),
    )

    expect(screen.getByText('Module editor')).toBeInTheDocument()
  })

  it('warns before the tab is closed only while changes are unsaved', () => {
    renderEditor()
    const closing = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(closing()).toBe(false)

    type('Title', 'Changed')
    expect(closing()).toBe(true)

    type('Title', lesson.title)
    expect(closing()).toBe(false)
  })
})
