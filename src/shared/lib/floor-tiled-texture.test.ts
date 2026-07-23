import { describe, expect, it } from 'vitest'
import { getFullModulesBounds } from './floor-tiled-texture'
import type { LayoutModule } from '@/shared/types'

function fullModule(x: number, y: number, size = 500): LayoutModule {
  return {
    id: `${x}-${y}`,
    row: 0,
    col: 0,
    x,
    y,
    widthMm: size,
    lengthMm: size,
    status: 'full',
    polygon: [
      { x, y },
      { x: x + size, y },
      { x: x + size, y: y + size },
      { x, y: y + size },
    ],
  }
}

describe('getFullModulesBounds', () => {
  it('returns bbox for 2×2 grid', () => {
    const modules = [
      fullModule(0, 0),
      fullModule(500, 0),
      fullModule(0, 500),
      fullModule(500, 500),
    ]
    expect(getFullModulesBounds(modules)).toEqual({
      x: 0,
      y: 0,
      widthMm: 1000,
      heightMm: 1000,
    })
  })

  it('ignores cut modules', () => {
    const modules: LayoutModule[] = [
      fullModule(0, 0),
      { ...fullModule(500, 0), status: 'cut' },
    ]
    expect(getFullModulesBounds(modules)).toEqual({
      x: 0,
      y: 0,
      widthMm: 500,
      heightMm: 500,
    })
  })
})
