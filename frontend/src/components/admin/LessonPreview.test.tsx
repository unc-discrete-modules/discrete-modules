import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import LessonPreview from './LessonPreview'
import type { Module } from '@/types/types'

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

const text = `---
title: Contrapositive
video_url: https://www.youtube.com/watch?v=abc123
---

## Learning Objectives

- Prove with the **contrapositive**.

## The idea

We show $\\neg Q \\rightarrow \\neg P$ instead.

| Name | Formula |
| --- | --- |
| Identity | $p \\lor F \\equiv p$ |
`

describe('LessonPreview', () => {
  afterEach(cleanup)

  it('shows the lesson the way students see it', () => {
    const { container } = render(
      <LessonPreview
        file={{ name: '03-contrapositive.md', text }}
        module={module}
      />,
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Module 9: Lesson 3 - Contrapositive',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Dashboard / Module 9 / Lesson 3')).toBeVisible()
    expect(
      screen.getByText('contrapositive', { selector: 'strong' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'The idea' })).toBeVisible()
    expect(container.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/abc123',
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(container.querySelectorAll('mjx-container').length).toBeGreaterThan(
      1,
    )
  })

  it('keeps the raw front matter and syntax out of the page', () => {
    render(<LessonPreview file={{ name: 'a.md', text }} module={module} />)

    expect(screen.queryByText(/video_url/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Learning Objectives/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\\neg/)).not.toBeInTheDocument()
  })

  it('omits the video when the lesson has none', () => {
    const { container } = render(
      <LessonPreview
        file={{ name: 'a.md', text: '---\ntitle: Plain\n---\n\n## Body\n\nHi' }}
        module={module}
      />,
    )

    expect(container.querySelector('iframe')).not.toBeInTheDocument()
  })

  it('explains what is wrong with a file it cannot show', () => {
    render(
      <LessonPreview
        file={{ name: 'a.md', text: '## No front matter' }}
        module={module}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('front matter block')
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })
})
