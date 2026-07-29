import { describe, expect, it } from 'vitest'
import { getFullModulesBounds, resolveFloorTexturePixelsPerMm } from './floor-tiled-texture'
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

  it('игнорирует подрезки', () => {
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

describe('resolveFloorTexturePixelsPerMm', () => {
  const bounds = (widthMm: number, heightMm: number) => ({ x: 0, y: 0, widthMm, heightMm })

  it('берёт натуральную плотность фото для небольшой комнаты', () => {
    expect(resolveFloorTexturePixelsPerMm(940, 500, bounds(1000, 1000))).toBeCloseTo(1.88, 5)
  })

  it('ограничивает размер холста на больших помещениях', () => {
    const pixelsPerMm = resolveFloorTexturePixelsPerMm(940, 500, bounds(20000, 30000))

    expect(pixelsPerMm).toBeLessThan(1.88)
    expect(20000 * pixelsPerMm).toBeLessThanOrEqual(2048)
    expect(30000 * pixelsPerMm).toBeLessThanOrEqual(2048)
  })

  it('не делит на ноль при вырожденных данных', () => {
    expect(resolveFloorTexturePixelsPerMm(940, 0, bounds(0, 0))).toBeGreaterThan(0)
  })
})
