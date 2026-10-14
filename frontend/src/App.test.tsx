import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the home page greeting and module cards', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )

    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /Welcome back,/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Click on a card to begin.')).toBeInTheDocument()
  })
})
