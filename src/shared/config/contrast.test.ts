import { describe, it, expect } from 'vitest'
import { tokens } from '@/shared/config/tokens'

/** Относительная яркость sRGB (WCAG) */
function luminance(hex: string): number {
  const raw = hex.replace('#', '')
  const n = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const r = Number.parseInt(n.slice(0, 2), 16) / 255
  const g = Number.parseInt(n.slice(2, 4), 16) / 255
  const b = Number.parseInt(n.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg)
  const b = luminance(bg)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('WCAG AA contrast tokens', () => {
  const surfaces = [tokens.color.surface, tokens.color.pageBackground, tokens.color.canvasBackground]

  it('основной текст ≥ 4.5:1 на поверхностях', () => {
    for (const bg of surfaces) {
      expect(contrast(tokens.color.textPrimary, bg)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('вторичный и muted текст ≥ 4.5:1 на surface', () => {
    expect(contrast(tokens.color.textSecondary, tokens.color.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tokens.color.textMuted, tokens.color.surface)).toBeGreaterThanOrEqual(4.5)
  })

  it('текст на фирменном зелёном ≥ 4.5:1', () => {
    expect(contrast(tokens.color.onBrand, tokens.color.brand)).toBeGreaterThanOrEqual(4.5)
  })

  it('brandText ≥ 4.5:1 на surface', () => {
    expect(contrast(tokens.color.brandText, tokens.color.surface)).toBeGreaterThanOrEqual(4.5)
  })
})
