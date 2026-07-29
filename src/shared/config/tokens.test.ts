import { describe, it, expect } from 'vitest'
import { KONVA_THEME, tokens, tokensToCssVariables } from '@/shared/config/tokens'

describe('design tokens', () => {
  it('KONVA_THEME берёт цвета из tokens', () => {
    expect(KONVA_THEME.contour).toBe(tokens.color.contour)
    expect(KONVA_THEME.working).toBe(tokens.color.working)
    expect(KONVA_THEME.moduleCut).toBe(tokens.color.moduleCut)
    expect(KONVA_THEME.text).toBe(tokens.color.textPrimary)
    expect(KONVA_THEME.canvasBackground).toBe(tokens.color.canvasBackground)
  })

  it('генерирует CSS-переменные для brand и motion', () => {
    const vars = tokensToCssVariables()
    expect(vars['--pf-color-primary']).toBe(tokens.color.brand)
    expect(vars['--pf-motion-normal']).toBe(tokens.motion.durationNormal)
    expect(vars['--pf-z-toast']).toBe(tokens.zIndex.toast)
    expect(vars['--pf-focus-ring-color']).toBe(tokens.focusRing.color)
  })
})
