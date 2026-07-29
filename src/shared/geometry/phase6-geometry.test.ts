import { describe, it, expect } from 'vitest'
import {
  insertVertexOnEdge,
  removeVertex,
  snapPointOrtho,
  snapVertexDrag,
} from '@/shared/geometry/polygon-edit'
import { createRectanglePolygon, isPolygonValid } from '@/shared/geometry/polygon'
import {
  createDefaultObstacle,
  obstacleToPolygon,
  totalOpeningsLengthMm,
  layableAreaSqMm,
  obstacleWallOffsets,
  placeObstacleByWallOffsets,
} from '@/shared/geometry/obstacles'
import { generateLayout } from '@/shared/geometry/layout'

describe('polygon-edit', () => {
  it('insertVertexOnEdge добавляет точку на ребро', () => {
    const rect = createRectanglePolygon(1000, 1000)
    const next = insertVertexOnEdge(rect, 0)
    expect(next).toHaveLength(5)
    expect(next[1]).toEqual({ x: 500, y: 0 })
    expect(isPolygonValid(next)).toBe(true)
  })

  it('removeVertex не опускается ниже 3 вершин', () => {
    const rect = createRectanglePolygon(1000, 1000)
    // 4 → 3 допустимо
    const triangle = removeVertex(rect, 0)
    expect(triangle).toHaveLength(3)
    // 3 → отказ
    expect(removeVertex(triangle!, 0)).toBeNull()
    const withExtra = insertVertexOnEdge(rect, 0)
    const removed = removeVertex(withExtra, 1)
    expect(removed).toHaveLength(4)
  })

  it('snapPointOrtho привязывает к осям', () => {
    expect(snapPointOrtho({ x: 0, y: 0 }, { x: 100, y: 10 })).toEqual({ x: 100, y: 0 })
    expect(snapPointOrtho({ x: 0, y: 0 }, { x: 10, y: 100 })).toEqual({ x: 0, y: 100 })
  })

  it('snapVertexDrag с сеткой', () => {
    const rect = createRectanglePolygon(1000, 1000)
    const snapped = snapVertexDrag(rect, 1, { x: 1030, y: 12 }, { ortho: true, gridMm: 50 })
    expect(snapped.x % 50).toBe(0)
  })
})

describe('obstacles', () => {
  it('вычитает площадь препятствия из зоны укладки', () => {
    const room = createRectanglePolygon(5000, 4000)
    const obs = createDefaultObstacle(room)
    obs.widthMm = 1000
    obs.lengthMm = 1000
    obs.x = 2000
    obs.y = 1500
    const layable = layableAreaSqMm(room, [obs])
    expect(layable).toBeCloseTo(5000 * 4000 - 1000 * 1000, 0)
  })

  it('generateLayout вырезает модули в зоне препятствия', () => {
    const room = createRectanglePolygon(3000, 3000)
    const hole = obstacleToPolygon({
      id: 'o1',
      kind: 'rectangle',
      x: 1000,
      y: 1000,
      widthMm: 1000,
      lengthMm: 1000,
    })
    const withHole = generateLayout({
      workingPolygon: room,
      roomPolygon: room,
      obstacles: [hole],
      moduleWidthMm: 500,
      moduleLengthMm: 500,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    })
    const without = generateLayout({
      workingPolygon: room,
      roomPolygon: room,
      moduleWidthMm: 500,
      moduleLengthMm: 500,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    })
    expect(withHole.modules.length).toBeLessThan(without.modules.length)
  })

  it('totalOpeningsLengthMm суммирует длины', () => {
    expect(
      totalOpeningsLengthMm([
        { id: 'a', edgeIndex: 0, offsetMm: 0, lengthMm: 900 },
        { id: 'b', edgeIndex: 1, offsetMm: 100, lengthMm: 800 },
      ]),
    ).toBe(1700)
  })

  it('отступы от стен ↔ координаты препятствия', () => {
    const room = createRectanglePolygon(5000, 4000)
    const placed = placeObstacleByWallOffsets(
      room,
      { widthMm: 800, lengthMm: 600 },
      { fromLeftMm: 1200, fromTopMm: 900 },
    )
    expect(placed).toEqual({ x: 1200, y: 900, widthMm: 800, lengthMm: 600 })
    const offs = obstacleWallOffsets(room, { id: 'o', kind: 'rectangle', ...placed })
    expect(offs.fromLeftMm).toBe(1200)
    expect(offs.fromTopMm).toBe(900)
    expect(offs.fromRightMm).toBe(5000 - 1200 - 800)
    expect(offs.fromBottomMm).toBe(4000 - 900 - 600)
  })
})
