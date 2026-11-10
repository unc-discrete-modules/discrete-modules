import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FileUploadForm from './FileUploadForm'
import type { PreviewProps, UploadedFile } from './upload-types'

function Preview({ file }: PreviewProps) {
  return <p>Previewing {file.name}</p>
}

function renderForm(onCreate?: (file: UploadedFile) => void) {
  return render(
    <MemoryRouter>
      <FileUploadForm
        fileLabel="Lesson file"
        extensions={['.md']}
        formatHint="A Markdown file."
        cancelTo="/edit-module/3"
        Preview={Preview}
        onCreate={onCreate}
      />
    </MemoryRouter>,
  )
}

function choose(file: File) {
  fireEvent.change(screen.getByLabelText('Lesson file'), {
    target: { files: [file] },
  })
}

describe('FileUploadForm', () => {
  afterEach(cleanup)

  it('shows no preview until a file is chosen', () => {
    renderForm()

    expect(
      screen.queryByRole('heading', { name: 'Preview' }),
    ).not.toBeInTheDocument()
  })

  it('shows a Preview section for the chosen file', async () => {
    renderForm()

    choose(new File(['# Hi'], '01-intro.md'))

    const section = await screen.findByRole('region', { name: 'Preview' })
    expect(section).toHaveTextContent('01-intro.md')
    expect(section).toHaveTextContent('Previewing 01-intro.md')
  })

  it('hands the whole file text to Create', async () => {
    const onCreate = vi.fn()
    renderForm(onCreate)
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
    const text = `---\ntitle: Intro\n---\n\n${'a'.repeat(5_000)}`

    choose(new File([text], '01-intro.md'))

    await screen.findByText('Previewing 01-intro.md')
    const create = screen.getByRole('button', { name: /create/i })
    expect(create).toBeEnabled()
    fireEvent.click(create)
    expect(onCreate).toHaveBeenCalledWith({ name: '01-intro.md', text })
  })

  it('keeps Create disabled when the page provides no handler', async () => {
    renderForm()

    choose(new File(['# Hi'], 'intro.md'))

    await screen.findByText('Previewing intro.md')
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })

  it('rejects files with the wrong extension', async () => {
    renderForm(vi.fn())

    choose(new File(['questions: []'], 'quiz.yaml'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a .md file.',
    )
    expect(
      screen.queryByRole('heading', { name: 'Preview' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })

  it('rejects files that are too large', async () => {
    renderForm(vi.fn())

    choose(new File(['x'.repeat(1_000_001)], 'huge.md'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That file is too large.',
    )
  })

  it('replaces the preview when another file is chosen', async () => {
    renderForm(vi.fn())
    choose(new File(['# One'], 'one.md'))
    await screen.findByText('Previewing one.md')

    choose(new File(['# Two'], 'two.md'))

    expect(await screen.findByText('Previewing two.md')).toBeInTheDocument()
    expect(screen.queryByText('Previewing one.md')).not.toBeInTheDocument()
  })

  it('clears the preview when the file is removed', async () => {
    renderForm(vi.fn())
    choose(new File(['# Hi'], 'intro.md'))
    await screen.findByText('Previewing intro.md')

    fireEvent.change(screen.getByLabelText('Lesson file'), {
      target: { files: [] },
    })

    expect(screen.queryByText('Previewing intro.md')).not.toBeInTheDocument()
  })

  it('links Cancel back to the module editor', () => {
    renderForm()

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/edit-module/3',
    )
  })
})
