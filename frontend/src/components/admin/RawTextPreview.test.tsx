import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import RawTextPreview from './RawTextPreview'

describe('RawTextPreview', () => {
  afterEach(cleanup)

  it('shows short files in full', () => {
    render(<RawTextPreview file={{ name: 'q.yaml', text: 'questions: []' }} />)

    expect(screen.getByLabelText('File contents')).toHaveTextContent(
      'questions: []',
    )
  })

  it('truncates long files', () => {
    render(
      <RawTextPreview file={{ name: 'q.yaml', text: 'a'.repeat(5_000) }} />,
    )

    expect(screen.getByLabelText('File contents').textContent).toHaveLength(
      2_002,
    )
  })
})
