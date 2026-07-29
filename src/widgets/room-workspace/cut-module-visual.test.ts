import { describe, it, expect } from 'vitest'
import type { LayoutModule } from '@/shared/types'
import {
  edgeOnModulePerimeter,
  getCutOutlineEdges,
  getHatchLines,
  getSawCutEdges,
} from './cut-module-visual'

function cutMod(overrides: Partial<LayoutModule>): LayoutModule {
  return {
    id: 'c1',
    row: 0,
    col: 0,
    x: 0,
    y: 0,
    widthMm: 500,
    lengthMm: 500,
    status: 'cut',
    polygon: [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 500 },
      { x: 0, y: 500 },
    ],
    ...overrides,
  }
}

describe('getCutOutlineEdges', () => {
  it('west strip: only outer wall edge, no joint toward whole tile', () => {
    const mod = cutMod({ x: -400, y: 0 })
    const edges = getCutOutlineEdges(mod, { x: 5, y: 0, width: 95, height: 500 })
    expect(edges).toHaveLength(1)
    expect(edges[0]).toEqual({ x1: 0, y1: 0, x2: 0, y2: 500 })
  })

  it('east strip: only outer wall edge, no joint toward whole tile', () => {
    const mod = cutMod({ x: 3100, y: 0 })
    const edges = getCutOutlineEdges(mod, { x: 3100, y: 0, width: 95, height: 500 })
    expect(edges).toHaveLength(1)
    expect(edges[0]).toEqual({ x1: 95, y1: 0, x2: 95, y2: 500 })
  })

  it('bottom strip: only outer bottom edge, no joint toward whole tile above', () => {
    const mod = cutMod({ x: 0, y: 4000 })
    const edges = getCutOutlineEdges(mod, { x: 0, y: 4000, width: 500, height: 95 })
    expect(edges).toHaveLength(1)
    expect(edges[0]).toEqual({ x1: 0, y1: 95, x2: 500, y2: 95 })
  })
})

describe('getSawCutEdges', () => {
  it('полоска слева: рез — вертикаль внутри модуля', () => {
    const mod = cutMod({
      x: 0,
      y: 0,
      polygon: [
        { x: 0, y: 0 },
        { x: 500, y: 0 },
        { x: 500, y: 500 },
        { x: 0, y: 500 },
      ],
    })
    // оставлен кусок x=0..120
    const clipped = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 500 },
      { x: 0, y: 500 },
    ]
    const saw = getSawCutEdges(clipped, mod)
    expect(saw.length).toBeGreaterThanOrEqual(1)
    expect(
      saw.some(
        (e) =>
          Math.abs(e.x1 - 120) < 1 &&
          Math.abs(e.x2 - 120) < 1 &&
          Math.min(e.y1, e.y2) < 1 &&
          Math.max(e.y1, e.y2) > 499,
      ),
    ).toBe(true)
    // периметр модуля (левая/верх/низ) не считается резом
    expect(
      saw.every((e) => !edgeOnModulePerimeter({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 }, mod)),
    ).toBe(true)
  })

  it('вырез препятствием: есть внутренние рёбра реза', () => {
    const mod = cutMod({})
    // L-образный остаток модуля (вырезан правый нижний угол)
    const clipped = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 200 },
      { x: 200, y: 200 },
      { x: 200, y: 500 },
      { x: 0, y: 500 },
    ]
    const saw = getSawCutEdges(clipped, mod)
    expect(saw.length).toBeGreaterThanOrEqual(2)
  })
})

describe('getHatchLines', () => {
  it('даёт диагонали внутри прямоугольника', () => {
    const lines = getHatchLines(200, 100, 40)
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(line.x1).toBeGreaterThanOrEqual(0)
      expect(line.x2).toBeLessThanOrEqual(200)
      expect(line.y1).toBeGreaterThanOrEqual(0)
      expect(line.y2).toBeLessThanOrEqual(100)
    }
  })
})
