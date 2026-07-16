import { describe, it, expect } from 'vitest'
import {
  createRectanglePolygon,
  createLShapePolygon,
  polygonArea,
  polygonAreaSqm,
  hasSelfIntersection,
  offsetPolygonInward,
  offsetPolygonOutward,
  isPolygonValid,
} from '@/shared/geometry/polygon'
import { classifyModule, createModuleRect, generateLayout } from '@/shared/geometry/layout'
import { calculate } from '@/entities/calculation/calculate'

function layoutInput(
  room: ReturnType<typeof createRectanglePolygon>,
  gapMm: number,
  overrides: Partial<Parameters<typeof generateLayout>[0]> = {},
) {
  const working = offsetPolygonInward(room, gapMm)
  if (!working.success) throw new Error('offset failed')
  return {
    workingPolygon: working.polygon,
    roomPolygon: room,
    gapMm,
    moduleWidthMm: 500,
    moduleLengthMm: 500,
    rotation: 0 as const,
    offsetX: 0,
    offsetY: 0,
    startPoint: 'corner' as const,
    ...overrides,
  }
}

describe('polygon geometry', () => {
  it('calculates rectangle area', () => {
    const rect = createRectanglePolygon(3000, 4000)
    expect(polygonAreaSqm(rect)).toBeCloseTo(12, 2)
  })

  it('detects self-intersection', () => {
    const bowtie = [
      { x: 0, y: 0 },
      { x: 1000, y: 1000 },
      { x: 1000, y: 0 },
      { x: 0, y: 1000 },
    ]
    expect(hasSelfIntersection(bowtie)).toBe(true)
  })

  it('offsets rectangle inward', () => {
    const rect = createRectanglePolygon(1000, 1000)
    const result = offsetPolygonInward(rect, 50)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(polygonArea(result.polygon)).toBeLessThan(polygonArea(rect))
    }
  })

  it('offsets rectangle outward', () => {
    const rect = createRectanglePolygon(1000, 1000)
    const result = offsetPolygonOutward(rect, 50)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(polygonArea(result.polygon)).toBeGreaterThan(polygonArea(rect))
    }
  })

  it('validates L-shape', () => {
    const l = createLShapePolygon(5000, 4000, 3000, 2500)
    expect(isPolygonValid(l)).toBe(true)
  })
})

describe('layout generation', () => {
  it('classifies full modules in rectangle room', () => {
    const room = createRectanglePolygon(1500, 1500)
    const working = offsetPolygonInward(room, 0)
    expect(working.success).toBe(true)
    if (!working.success) return

    const layout = generateLayout({
      workingPolygon: working.polygon,
      roomPolygon: room,
      gapMm: 0,
      moduleWidthMm: 375,
      moduleLengthMm: 375,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    })

    expect(layout.modules.length).toBeGreaterThan(0)
    expect(layout.modules.every((m) => m.status === 'full' || m.status === 'cut')).toBe(true)
  })

  it('detects cut modules in L-shape', () => {
    const l = createLShapePolygon(2000, 2000, 1200, 1200)
    const working = offsetPolygonInward(l, 0)
    expect(working.success).toBe(true)
    if (!working.success) return

    const layout = generateLayout({
      workingPolygon: working.polygon,
      roomPolygon: l,
      gapMm: 0,
      moduleWidthMm: 500,
      moduleLengthMm: 500,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    })

    expect(layout.modules.some((m) => m.status === 'cut')).toBe(true)
  })

  it('classifies module correctly', () => {
    const room = createRectanglePolygon(1000, 1000)
    const full = createModuleRect(0, 0, 375, 375)
    expect(classifyModule(full, room)).toBe('full')

    const outside = createModuleRect(2000, 2000, 375, 375)
    expect(classifyModule(outside, room)).toBe('outside')
  })

  it('corner start balances horizontal cuts when height divides evenly (4.2×4 m)', () => {
    const room = createRectanglePolygon(4200, 4000)
    const working = offsetPolygonInward(room, 0)
    expect(working.success).toBe(true)
    if (!working.success) return

    const layout = generateLayout({
      workingPolygon: working.polygon,
      roomPolygon: room,
      gapMm: 0,
      moduleWidthMm: 500,
      moduleLengthMm: 500,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    })

    expect(layout.layoutMeta?.centerModuleFull).toBe(true)
    expect(layout.layoutMeta?.axisModeX).toBe('symmetric')
    expect(layout.layoutMeta?.axisModeY).toBe('from-edge')

    const minX = Math.min(...working.polygon.map((p) => p.x))
    const maxX = Math.max(...working.polygon.map((p) => p.x))

    const westCuts = layout.modules
      .filter((m) => m.status === 'cut')
      .map((m) => {
        const poly = m.clippedPolygon ?? m.polygon
        const left = Math.min(...poly.map((p) => p.x))
        if (Math.abs(left - minX) < 1) return Math.max(...poly.map((p) => p.x)) - minX
        return null
      })
      .filter((v): v is number => v !== null && v < 500)

    const eastCuts = layout.modules
      .filter((m) => m.status === 'cut')
      .map((m) => {
        const poly = m.clippedPolygon ?? m.polygon
        const right = Math.max(...poly.map((p) => p.x))
        if (Math.abs(right - maxX) < 1) return maxX - Math.min(...poly.map((p) => p.x))
        return null
      })
      .filter((v): v is number => v !== null && v < 500)

    expect(westCuts.length).toBeGreaterThan(0)
    expect(eastCuts.length).toBeGreaterThan(0)
    expect(westCuts[0]).toBeCloseTo(eastCuts[0] ?? 0, 0)

    const minY = Math.min(...working.polygon.map((p) => p.y))
    const maxY = Math.max(...working.polygon.map((p) => p.y))
    const northSouthCuts = layout.modules.filter((m) => {
      if (m.status !== 'cut') return false
      const poly = m.clippedPolygon ?? m.polygon
      const height = Math.max(...poly.map((p) => p.y)) - Math.min(...poly.map((p) => p.y))
      if (height >= 499) return false
      const top = Math.min(...poly.map((p) => p.y))
      const bottom = Math.max(...poly.map((p) => p.y))
      return Math.abs(top - minY) < 1 || Math.abs(bottom - maxY) < 1
    })
    expect(northSouthCuts.length).toBe(0)
  })

  it('3×4.1 m with 5 mm gap: 6 whole tiles across, symmetric top/bottom cuts', () => {
    const room = createRectanglePolygon(3000, 4100)
    const layout = generateLayout(layoutInput(room, 5))

    expect(layout.modules.filter((m) => m.status === 'full').length).toBe(48)
    expect(layout.modules.filter((m) => m.status === 'cut').length).toBe(12)

    const cuts = layout.modules.filter((m) => m.status === 'cut')
    const minY = Math.min(...layout.modules.map((m) => m.y))
    const maxY = Math.max(...layout.modules.map((m) => m.y + m.lengthMm))
    const topCuts = cuts.filter((m) => Math.abs(m.y - minY) < 1 || m.y < 0)
    const bottomCuts = cuts.filter((m) => Math.abs(m.y + m.lengthMm - maxY) < 1)
    expect(topCuts.length).toBeGreaterThan(0)
    expect(bottomCuts.length).toBeGreaterThan(0)
  })

  it('4×4 m with 5 mm gap and 500 mm module — all tiles whole', () => {
    const room = createRectanglePolygon(4000, 4000)
    const layout = generateLayout(layoutInput(room, 5))

    expect(layout.modules.filter((m) => m.status === 'cut').length).toBe(0)
    expect(layout.modules.filter((m) => m.status === 'full').length).toBe(64)
  })

  it('corner start with 3×4 m room and 5 mm gap', () => {
    const room = createRectanglePolygon(3000, 4000)
    const layout = generateLayout(layoutInput(room, 5))

    expect(layout.modules.filter((m) => m.status === 'cut').length).toBe(0)
    expect(layout.modules.filter((m) => m.status === 'full').length).toBe(48)
  })

  it('680 mm wall with 5 mm gap: two 340 mm columns across (gap is not a module cut)', () => {
    const room = createRectanglePolygon(680, 2000)
    const working = offsetPolygonInward(room, 5)
    expect(working.success).toBe(true)
    if (!working.success) return

    const layout = generateLayout({
      workingPolygon: working.polygon,
      roomPolygon: room,
      gapMm: 5,
      moduleWidthMm: 340,
      moduleLengthMm: 340,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    })

    expect(layout.modules.filter((m) => m.status === 'full').length).toBe(10)
    expect(layout.modules.some((m) => m.status === 'cut')).toBe(true)
  })

  it('690 mm wall with 5 mm gap fits two 340 mm modules across', () => {
    const room = createRectanglePolygon(690, 2000)
    const working = offsetPolygonInward(room, 5)
    expect(working.success).toBe(true)
    if (!working.success) return

    const layout = generateLayout({
      workingPolygon: working.polygon,
      roomPolygon: room,
      gapMm: 5,
      moduleWidthMm: 340,
      moduleLengthMm: 340,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    })

    const fullRow = layout.modules.filter((m) => m.status === 'full' && m.widthMm === 340)
    expect(fullRow.length).toBeGreaterThanOrEqual(10)
  })

  it('center start gives equal edge cuts when width does not divide evenly', () => {
    const room = createRectanglePolygon(3100, 4100)
    const working = offsetPolygonInward(room, 5)
    expect(working.success).toBe(true)
    if (!working.success) return

    const layout = generateLayout({
      workingPolygon: working.polygon,
      roomPolygon: room,
      gapMm: 5,
      moduleWidthMm: 500,
      moduleLengthMm: 500,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'center',
    })

    const minX = Math.min(...working.polygon.map((p) => p.x))
    const maxX = Math.max(...working.polygon.map((p) => p.x))
    const minY = Math.min(...working.polygon.map((p) => p.y))
    const maxY = Math.max(...working.polygon.map((p) => p.y))

    const westCut = layout.modules
      .filter((m) => m.status === 'cut')
      .map((m) => {
        const poly = m.clippedPolygon ?? m.polygon
        const left = Math.min(...poly.map((p) => p.x))
        const right = Math.max(...poly.map((p) => p.x))
        if (Math.abs(left - minX) < 1) return right - minX
        if (Math.abs(right - maxX) < 1) return maxX - left
        return null
      })
      .filter((v): v is number => v !== null)

    const uniqueWest = [...new Set(westCut.filter((w) => w < 500))]
    expect(uniqueWest.length).toBeGreaterThan(0)
    if (uniqueWest.length >= 2) {
      expect(uniqueWest[0]).toBeCloseTo(uniqueWest[uniqueWest.length - 1], 0)
    }

    const northCut = layout.modules
      .filter((m) => m.status === 'cut')
      .map((m) => {
        const poly = m.clippedPolygon ?? m.polygon
        const top = Math.min(...poly.map((p) => p.y))
        const bottom = Math.max(...poly.map((p) => p.y))
        if (Math.abs(top - minY) < 1) return bottom - minY
        if (Math.abs(bottom - maxY) < 1) return maxY - top
        return null
      })
      .filter((v): v is number => v !== null)

    const uniqueNorth = [...new Set(northCut.filter((h) => h < 500))]
    expect(uniqueNorth.length).toBeGreaterThan(0)
    if (uniqueNorth.length >= 2) {
      expect(uniqueNorth[0]).toBeCloseTo(uniqueNorth[uniqueNorth.length - 1], 0)
    }
  })
})

describe('calculation engine', () => {
  it('calculates modules and waste', () => {
    const room = createRectanglePolygon(3000, 4000)
    const working = offsetPolygonInward(room, 5)
    expect(working.success).toBe(true)
    if (!working.success) return

    const result = calculate({
      roomPolygon: room,
      workingPolygon: working.polygon,
      gapMm: 5,
      module: { widthMm: 375, lengthMm: 375, price: 435, priceUnit: 'piece', weightKg: 0.79 },
      layout: { rotation: 0, offsetX: 0, offsetY: 0, startPoint: 'corner' },
      wastePercent: 5,
    })

    expect(result.totalModulesCount).toBeGreaterThan(0)
    expect(result.modulesWithWasteCount).toBe(
      Math.ceil(result.totalModulesCount * 1.05),
    )
    expect(result.totalCost).toBe(result.modulesWithWasteCount * 435)
  })

  it('does not calculate cost for unknown price unit', () => {
    const room = createRectanglePolygon(1000, 1000)
    const result = calculate({
      roomPolygon: room,
      workingPolygon: room,
      gapMm: 0,
      module: { widthMm: 375, lengthMm: 375, price: 100, priceUnit: 'unknown' },
      layout: { rotation: 0, offsetX: 0, offsetY: 0, startPoint: 'corner' },
      wastePercent: 5,
    })
    expect(result.totalCost).toBeUndefined()
    expect(result.warnings.some((w) => w.code === 'unknown_price_unit')).toBe(true)
  })
})
