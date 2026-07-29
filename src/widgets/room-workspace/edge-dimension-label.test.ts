import { describe, it, expect } from 'vitest'
import { createNichePolygon, createRectanglePolygon } from '@/shared/geometry/polygon'
import { getEdgeLabelPlacement } from './edge-dimension-label'
import { pointInPolygon } from '@/shared/geometry/polygon'

describe('getEdgeLabelPlacement', () => {
  it('для прямоугольника подписи снаружи', () => {
    const room = createRectanglePolygon(5000, 4000)
    for (let i = 0; i < 4; i++) {
      const p = getEdgeLabelPlacement(room, i, { scale: 0.05, withLetter: true })
      expect(p).not.toBeNull()
      expect(pointInPolygon({ x: p!.x, y: p!.y }, room)).toBe(false)
    }
  })

  it('для ниши подписи на внутренних рёбрах тоже снаружи контура', () => {
    const room = createNichePolygon(5000, 4000, 1500, 1000, 2000)
    // рёбра ниши: индексы 3,4,5 (D,E,F при обходе)
    for (let i = 0; i < room.length; i++) {
      const p = getEdgeLabelPlacement(room, i, { scale: 0.05, withLetter: true })
      expect(p).not.toBeNull()
      expect(pointInPolygon({ x: p!.x, y: p!.y }, room)).toBe(false)
    }
  })

  it('короткое ребро получает увеличенный отступ', () => {
    const room = createNichePolygon(5000, 4000, 1500, 1000, 2000)
    const short = getEdgeLabelPlacement(room, 3, { scale: 0.05, withLetter: true })!
    const long = getEdgeLabelPlacement(room, 0, { scale: 0.05, withLetter: true })!
    const midShort = {
      x: (room[3].x + room[4].x) / 2,
      y: (room[3].y + room[4].y) / 2,
    }
    const midLong = {
      x: (room[0].x + room[1].x) / 2,
      y: (room[0].y + room[1].y) / 2,
    }
    const distShort = Math.hypot(short.x - midShort.x, short.y - midShort.y)
    const distLong = Math.hypot(long.x - midLong.x, long.y - midLong.y)
    expect(distShort).toBeGreaterThan(distLong * 0.85)
  })

  it('размер шрифта в мире даёт ~13 px на экране', () => {
    const room = createRectanglePolygon(5000, 4000)
    const scale = 0.04
    const p = getEdgeLabelPlacement(room, 0, { scale, withLetter: true })!
    expect(p.fontSize * scale).toBeCloseTo(13, 5)
    expect(p.boxHeight * scale).toBeGreaterThan(18)
  })
})
