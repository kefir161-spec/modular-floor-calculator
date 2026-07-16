import { describe, it, expect } from 'vitest'
import type { LayoutModule } from '@/shared/types'
import { getCutOutlineEdges } from './cut-module-visual'

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
    polygon: [],
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
