import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('renders the login page', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Welcome to Discrete Modules' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Login with UNC SSO' }),
    ).toBeInTheDocument()
  })
})
