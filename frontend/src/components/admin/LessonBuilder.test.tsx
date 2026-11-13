import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LessonInput, Module } from '@/types/types'
import LessonBuilder from './LessonBuilder'

const module: Module = {
  id: 9,
  title: 'Proofs',
  display_order: 9,
  quiz_id: null,
  lessons: [
    { id: 20, title: 'One' },
    { id: 21, title: 'Two' },
  ],
}

function renderBuilder(
  onSave: (lesson: LessonInput) => Promise<void> = vi
    .fn()
    .mockResolvedValue(undefined),
) {
  render(
    <MemoryRouter>
      <LessonBuilder
        module={module}
        cancelTo="/edit-module/9"
        onSave={onSave}
      />
    </MemoryRouter>,
  )
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const create = () => screen.getByRole('button', { name: /create/i })

function fillLesson(title = 'Proofs Continued') {
  type('Title', title)
  type('Lesson', '## Welcome\n\nWe prove $x^2$ is odd.')
}

describe('LessonBuilder', () => {
  afterEach(cleanup)

  it('shows no preview until something is written', () => {
    renderBuilder()

    expect(screen.queryByRole('region', { name: 'Preview' })).toBeNull()
  })

  it('previews the lesson as students will see it, as it is typed', async () => {
    renderBuilder()

    fillLesson()
    type('Video link (optional)', 'https://www.youtube.com/watch?v=abc123')

    const preview = await screen.findByRole('region', { name: 'Preview' })
    expect(preview).toHaveTextContent('Module 9: Lesson 3 - Proofs Continued')
    expect(preview.querySelector('mjx-container')).toBeInTheDocument()
    expect(preview.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abc123',
    )
    expect(preview).not.toHaveTextContent('$x^2$')
  })

  it('shows the overview section the way students see it', async () => {
    renderBuilder()

    type('Title', 'Intro')
    type(
      'Lesson',
      '## Learning Objectives\n\n- Prove things\n\n## The idea\n\nText',
    )

    const preview = await screen.findByRole('region', { name: 'Preview' })
    expect(preview).toHaveTextContent('Overview')
    expect(preview).toHaveTextContent('Prove things')
    expect(preview).not.toHaveTextContent('Learning Objectives')
  })

  it('does not embed a video link that is not a web address', async () => {
    renderBuilder()
    fillLesson()

    type('Video link (optional)', 'javascript:alert(1)')

    const preview = await screen.findByRole('region', { name: 'Preview' })
    expect(preview.querySelector('iframe')).toBeNull()
  })

  it('suggests the key from the title until the key is edited', () => {
    renderBuilder()

    type('Title', 'Proofs, Continued!')
    expect(screen.getByLabelText('Lesson key')).toHaveValue('proofs-continued')

    type('Lesson key', 'my-key')
    type('Title', 'Something else')
    expect(screen.getByLabelText('Lesson key')).toHaveValue('my-key')
  })

  it('sends the lesson once, then clears the form for the next one', async () => {
    let finish: () => void = () => {}
    const onSave = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    )
    renderBuilder(onSave)
    fillLesson()
    type('Video link (optional)', 'https://youtu.be/abc')

    fireEvent.click(create())
    await waitFor(() => expect(create()).toBeDisabled())
    fireEvent.submit(screen.getByRole('form', { name: 'Lesson builder' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      key: 'proofs-continued',
      title: 'Proofs Continued',
      body: '## Welcome\n\nWe prove $x^2$ is odd.',
      video_url: 'https://youtu.be/abc',
    })
    finish()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Created "Proofs Continued".',
    )
    expect(screen.getByLabelText('Title')).toHaveValue('')
    expect(screen.getByLabelText('Lesson key')).toHaveValue('')
    expect(screen.getByLabelText('Lesson')).toHaveValue('')
    expect(screen.getByLabelText('Video link (optional)')).toHaveValue('')
    // The preview trails the text by design, so it clears a moment later.
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Preview' })).toBeNull(),
    )

    type('Title', 'Next lesson')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('highlights every problem, focuses the first, and does not save', async () => {
    const onSave = vi.fn()
    renderBuilder(onSave)
    type('Video link (optional)', 'youtube')

    fireEvent.click(create())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fix the highlighted fields.',
    )
    expect(screen.getByText('Enter a title.')).toBeVisible()
    expect(screen.getByText('Enter a key.')).toBeVisible()
    expect(screen.getByText(/full http\(s\) link/)).toBeVisible()
    expect(screen.getByText('Write the lesson.')).toBeVisible()
    expect(screen.getByLabelText('Title')).toBeInvalid()
    expect(screen.getByLabelText('Title')).toHaveFocus()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects a key that is not lowercase words joined by hyphens', async () => {
    const onSave = vi.fn()
    renderBuilder(onSave)
    fillLesson()
    type('Lesson key', 'Not A Key')

    fireEvent.click(create())

    // The hint under the field says similar words, so match the error's.
    expect(await screen.findByText(/joined by single hyphens/)).toBeVisible()
    expect(screen.getByLabelText('Lesson key')).toHaveFocus()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows no problems before the first save attempt', () => {
    renderBuilder()

    expect(screen.queryByText('Enter a title.')).not.toBeInTheDocument()
  })

  it('shows why saving failed and keeps everything typed for a retry', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('This module already has that key.'))
      .mockResolvedValueOnce(undefined)
    renderBuilder(onSave)
    fillLesson('Keep me')

    fireEvent.click(create())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This module already has that key.',
    )
    expect(screen.getByLabelText('Title')).toHaveValue('Keep me')
    expect(screen.getByLabelText('Lesson')).toHaveValue(
      '## Welcome\n\nWe prove $x^2$ is odd.',
    )
    expect(create()).toBeEnabled()

    fireEvent.click(create())

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(onSave).toHaveBeenCalledTimes(2)
  })

  it('links Cancel back to the module editor', () => {
    renderBuilder()

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/edit-module/9',
    )
  })

  it('locks every field while saving so nothing typed is lost, then unlocks', async () => {
    let fail: (reason: Error) => void = () => {}
    const onSave = vi.fn(
      () => new Promise<void>((_resolve, reject) => (fail = reject)),
    )
    renderBuilder(onSave)
    fillLesson('Keep me')
    const fields = [
      'Title',
      'Lesson key',
      'Video link (optional)',
      'Lesson',
    ].map((label) => screen.getByLabelText(label))
    fields.forEach((input) => expect(input).toBeEnabled())

    fireEvent.click(create())
    await waitFor(() => expect(create()).toBeDisabled())

    fields.forEach((input) => expect(input).toBeDisabled())
    // A rejected save leaves the draft for another try, and it is editable.
    fail(new Error('Could not save'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save')
    fields.forEach((input) => expect(input).toBeEnabled())
    expect(screen.getByLabelText('Title')).toHaveValue('Keep me')
  })

  it('clears the form for the next lesson once the save finishes, with the fields open again', async () => {
    let finish: () => void = () => {}
    const onSave = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    )
    renderBuilder(onSave)
    fillLesson()

    fireEvent.click(create())
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeDisabled())
    finish()

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeEnabled()
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })
})
