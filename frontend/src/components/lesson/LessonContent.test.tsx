import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import LessonContent from './LessonContent'

const body = `| Name | Formula |
| --- | --- |
| Identity | $p \\lor F \\equiv p$ |
`

describe('LessonContent', () => {
  afterEach(cleanup)

  it('renders GitHub-flavoured tables with math in cells', () => {
    const { container } = render(<LessonContent body={body} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(
      screen.getAllByRole('columnheader').map((cell) => cell.textContent),
    ).toEqual(['Name', 'Formula'])
    expect(screen.getByRole('cell', { name: 'Identity' })).toBeInTheDocument()
    expect(container.querySelectorAll('td mjx-container')).toHaveLength(1)
  })
})
