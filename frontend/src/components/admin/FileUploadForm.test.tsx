import '@testing-library/jest-dom/vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FileUploadForm from './FileUploadForm'
import type { PreviewProps, UploadedFile } from './upload-types'

function Preview({ file }: PreviewProps) {
  return <p>Previewing {file.name}</p>
}

function renderForm(
  onCreate?: (file: UploadedFile) => Promise<unknown> | void,
) {
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

// A file whose read the test finishes by hand, to put reads in any order.
function slowFile(name: string) {
  const file = new File(['unused'], name)
  let finish: (text: string) => void = () => {}
  let fail: () => void = () => {}
  Object.defineProperty(file, 'text', {
    value: () =>
      new Promise<string>((resolve, reject) => {
        finish = resolve
        fail = () => reject(new Error('read failed'))
      }),
  })
  return {
    file,
    finish: (text: string) => act(async () => finish(text)),
    fail: () => act(async () => fail()),
  }
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

  it('confirms a created file, clears the form, and allows another', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    renderForm(onCreate)
    choose(new File(['# One'], 'one.md'))
    await screen.findByText('Previewing one.md')

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Created one.md.',
    )
    expect(screen.queryByText('Previewing one.md')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Lesson file')).toHaveValue('')
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()

    choose(new File(['# Two'], 'two.md'))
    await screen.findByText('Previewing two.md')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeEnabled()
  })

  it('shows why creating failed and keeps the file for another try', async () => {
    const onCreate = vi
      .fn()
      .mockRejectedValueOnce(new Error('A lesson with this key exists.'))
      .mockResolvedValueOnce(undefined)
    renderForm(onCreate)
    choose(new File(['# One'], 'one.md'))
    await screen.findByText('Previewing one.md')

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A lesson with this key exists.',
    )
    expect(screen.getByText('Previewing one.md')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Created one.md.',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not send the file twice while a create is in flight', async () => {
    let finish: () => void = () => {}
    const onCreate = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    )
    renderForm(onCreate)
    choose(new File(['# One'], 'one.md'))
    await screen.findByText('Previewing one.md')
    const create = screen.getByRole('button', { name: /create/i })

    fireEvent.click(create)
    await waitFor(() => expect(create).toBeDisabled())
    fireEvent.submit(create.closest('form') as HTMLFormElement)

    expect(onCreate).toHaveBeenCalledTimes(1)
    finish()
    await screen.findByRole('status')
  })

  it('links Cancel back to the module editor', () => {
    renderForm()

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/edit-module/3',
    )
  })

  describe('when reads finish out of order', () => {
    it('shows only the current file when an earlier slow read finishes late', async () => {
      renderForm(vi.fn())
      const first = slowFile('first.md')
      const second = slowFile('second.md')
      choose(first.file)
      choose(second.file)

      await second.finish('# Two')
      expect(await screen.findByText('Previewing second.md')).toBeVisible()
      await first.finish('# One')

      expect(screen.getByText('Previewing second.md')).toBeVisible()
      expect(screen.queryByText('Previewing first.md')).not.toBeInTheDocument()
    })

    it('shows only the current file when the reads finish in order', async () => {
      renderForm(vi.fn())
      const first = slowFile('first.md')
      const second = slowFile('second.md')
      choose(first.file)
      choose(second.file)

      await first.finish('# One')
      expect(screen.queryByText('Previewing first.md')).not.toBeInTheDocument()
      await second.finish('# Two')

      expect(await screen.findByText('Previewing second.md')).toBeVisible()
      expect(screen.queryByText('Previewing first.md')).not.toBeInTheDocument()
    })

    it('hands Create the current file, not the one whose read finished last', async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined)
      renderForm(onCreate)
      const first = slowFile('first.md')
      const second = slowFile('second.md')
      choose(first.file)
      choose(second.file)
      await second.finish('# Two')
      await screen.findByText('Previewing second.md')
      await first.finish('# One')

      fireEvent.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
      expect(onCreate).toHaveBeenCalledWith({
        name: 'second.md',
        text: '# Two',
      })
    })

    it('ignores an earlier read that fails after another file was chosen', async () => {
      renderForm(vi.fn())
      const first = slowFile('first.md')
      const second = slowFile('second.md')
      choose(first.file)
      choose(second.file)
      await second.finish('# Two')
      await screen.findByText('Previewing second.md')

      await first.fail()

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByText('Previewing second.md')).toBeVisible()
    })

    it('still reports a failed read of the file that is current', async () => {
      renderForm(vi.fn())
      const only = slowFile('only.md')
      choose(only.file)

      await only.fail()

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Could not read that file.',
      )
      expect(screen.queryByText('Previewing only.md')).not.toBeInTheDocument()
    })

    it('shows nothing when the file was removed before its read finished', async () => {
      renderForm(vi.fn())
      const slow = slowFile('slow.md')
      choose(slow.file)
      fireEvent.change(screen.getByLabelText('Lesson file'), {
        target: { files: [] },
      })

      await slow.finish('# Late')

      expect(screen.queryByText('Previewing slow.md')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
    })

    it('ignores a late read that would replace a rejected file with a preview', async () => {
      renderForm(vi.fn())
      const slow = slowFile('slow.md')
      choose(slow.file)
      choose(new File(['questions: []'], 'quiz.yaml'))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Choose a .md file.',
      )

      await slow.finish('# Late')

      expect(screen.queryByText('Previewing slow.md')).not.toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('Choose a .md file.')
    })
  })
})
