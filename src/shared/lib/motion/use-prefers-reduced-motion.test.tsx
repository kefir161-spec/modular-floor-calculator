import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePrefersReducedMotion } from '@/shared/lib/motion/use-prefers-reduced-motion'

function Probe() {
  const reduced = usePrefersReducedMotion()
  return <div data-testid="motion">{reduced ? 'reduced' : 'full'}</div>
}

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: matches && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

describe('usePrefersReducedMotion', () => {
  afterEach(() => {
    stubMatchMedia(false)
  })

  it('по умолчанию false', () => {
    stubMatchMedia(false)
    render(<Probe />)
    expect(screen.getByTestId('motion')).toHaveTextContent('full')
  })

  it('true при prefers-reduced-motion: reduce', () => {
    stubMatchMedia(true)
    render(<Probe />)
    expect(screen.getByTestId('motion')).toHaveTextContent('reduced')
  })
})
