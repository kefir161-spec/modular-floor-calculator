import { describe, it, expect } from 'vitest'
import {
  createLShapePolygon,
  createNichePolygon,
  createRectanglePolygon,
  createUShapePolygon,
  offsetPolygonInward,
  polygonArea,
} from '@/shared/geometry/polygon'
import { generateLayout } from '@/shared/geometry/layout'
import { estimateModulesToPurchase } from '@/shared/geometry/module-purchase'
import { obstacleToPolygon, createDefaultObstacle } from '@/shared/geometry/obstacles'

function layoutRect(
  w: number,
  h: number,
  opts: {
    gapMm?: number
    module?: number
    rotation?: 0 | 90
    startPoint?: 'corner' | 'center'
    obstacles?: ReturnType<typeof obstacleToPolygon>[]
  } = {},
) {
  const room = createRectanglePolygon(w, h)
  const gapMm = opts.gapMm ?? 5
  const working = offsetPolygonInward(room, gapMm)
  expect(working.success).toBe(true)
  if (!working.success) throw new Error(working.reason)
  const module = opts.module ?? 500
  return generateLayout({
    workingPolygon: working.polygon,
    roomPolygon: room,
    gapMm,
    obstacles: opts.obstacles,
    moduleWidthMm: module,
    moduleLengthMm: module,
    rotation: opts.rotation ?? 0,
    offsetX: 0,
    offsetY: 0,
    startPoint: opts.startPoint ?? 'corner',
  })
}

describe('подрезка: сценарии классификации', () => {
  it('ровное деление + зазор: подрезок нет (зазор ≠ рез)', () => {
    const layout = layoutRect(3010, 2510, { gapMm: 5, module: 500 })
    // working ≈ 3000×2500 — делится на 500 без остатка
    expect(layout.modules.every((m) => m.status === 'full')).toBe(true)
    expect(layout.modules.filter((m) => m.status === 'cut')).toHaveLength(0)
  })

  it('3×4.1 м: симметричные подрезки сверху/снизу', () => {
    const layout = layoutRect(3000, 4100, { gapMm: 5, module: 500 })
    const cuts = layout.modules.filter((m) => m.status === 'cut')
    expect(cuts.length).toBe(12)
    for (const m of cuts) {
      expect(m.clippedPolygon?.length).toBeGreaterThanOrEqual(3)
      const remain = polygonArea(m.clippedPolygon!)
      expect(remain).toBeGreaterThan(0)
      expect(remain).toBeLessThan(m.widthMm * m.lengthMm - 1)
    }
  })

  it('центр и угол: оба режима дают cut при некратном размере', () => {
    const corner = layoutRect(3200, 2700, { startPoint: 'corner' })
    const center = layoutRect(3200, 2700, { startPoint: 'center' })
    expect(corner.modules.some((m) => m.status === 'cut')).toBe(true)
    expect(center.modules.some((m) => m.status === 'cut')).toBe(true)
  })

  it('поворот 90° на некратной ширине даёт подрезки', () => {
    const layout = layoutRect(3700, 2500, { rotation: 90, module: 500 })
    expect(layout.modules.some((m) => m.status === 'cut')).toBe(true)
    expect(layout.modules.filter((m) => m.status === 'cut').every((m) => m.clippedPolygon)).toBe(
      true,
    )
  })

  it('Г-образная: есть подрезки у внутреннего угла', () => {
    // Как в geometry.test — компактная Г без зазора даёт явные cut
    const room = createLShapePolygon(2000, 2000, 1200, 1200)
    const working = offsetPolygonInward(room, 0)
    expect(working.success).toBe(true)
    if (!working.success) throw new Error(working.reason)
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
    const cuts = layout.modules.filter((m) => m.status === 'cut')
    expect(cuts.length).toBeGreaterThan(0)
    expect(cuts.every((m) => (m.clippedPolygon?.length ?? 0) >= 3)).toBe(true)
  })

  it('П-образная и ниша: подрезки присутствуют и с clippedPolygon', () => {
    for (const room of [
      createUShapePolygon(3000, 3000, 1500, 1500, 800),
      createNichePolygon(3000, 2500, 1000, 800, 1000),
    ]) {
      const working = offsetPolygonInward(room, 0)
      expect(working.success).toBe(true)
      if (!working.success) throw new Error(working.reason)
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
      const cuts = layout.modules.filter((m) => m.status === 'cut')
      expect(cuts.length).toBeGreaterThan(0)
      expect(cuts.every((m) => m.clippedPolygon && m.clippedPolygon.length >= 3)).toBe(true)
    }
  })

  it('препятствие вырезает модули в зоне колонны', () => {
    const room = createRectanglePolygon(5000, 4000)
    const working = offsetPolygonInward(room, 5)
    expect(working.success).toBe(true)
    if (!working.success) throw new Error(working.reason)
    const obs = createDefaultObstacle(room)
    // Сдвиг относительно сетки 500 мм — иначе модули целиком inside/outside без cut
    obs.x = 2150
    obs.y = 1650
    obs.widthMm = 1000
    obs.lengthMm = 1000
    const withObs = generateLayout({
      workingPolygon: working.polygon,
      roomPolygon: room,
      gapMm: 5,
      obstacles: [obstacleToPolygon(obs)],
      moduleWidthMm: 500,
      moduleLengthMm: 500,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    })
    const without = generateLayout({
      workingPolygon: working.polygon,
      roomPolygon: room,
      gapMm: 5,
      moduleWidthMm: 500,
      moduleLengthMm: 500,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    })
    // ровная комната 5×4 м с зазором: подрезок нет (только gap→full)
    expect(without.modules.filter((m) => m.status === 'cut')).toHaveLength(0)
    expect(withObs.modules.length).toBeLessThan(without.modules.length)
    const cuts = withObs.modules.filter((m) => m.status === 'cut')
    expect(cuts.length).toBeGreaterThan(0)
    expect(cuts.every((m) => m.clippedPolygon && m.clippedPolygon.length >= 3)).toBe(true)
  })

  it('закупка: cutSource ≤ cutPlacements (мелкие куски группируются)', () => {
    const layout = layoutRect(3000, 4100, { gapMm: 5, module: 500 })
    const purchase = estimateModulesToPurchase(layout.modules, 500, 500)
    expect(purchase.cutPlacementsCount).toBeGreaterThan(0)
    expect(purchase.cutSourceModulesCount).toBeGreaterThan(0)
    expect(purchase.cutSourceModulesCount).toBeLessThanOrEqual(purchase.cutPlacementsCount)
    expect(purchase.modulesToPurchase).toBe(
      purchase.fullModulesCount + purchase.cutSourceModulesCount,
    )
  })

  it('очень узкая полоса у стены всё равно получает clippedPolygon', () => {
    // 520 мм ширина → working 510 при gap 5 → почти одна колонка 500 + узкая полоска
    const layout = layoutRect(520, 2500, { gapMm: 5, module: 500 })
    const cuts = layout.modules.filter((m) => m.status === 'cut')
    expect(cuts.length).toBeGreaterThan(0)
    for (const m of cuts) {
      expect(m.clippedPolygon).toBeDefined()
      expect(polygonArea(m.clippedPolygon!)).toBeGreaterThan(10)
    }
  })
})
