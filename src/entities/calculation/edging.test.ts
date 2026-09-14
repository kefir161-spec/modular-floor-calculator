import { describe, it, expect } from 'vitest'
import { calculate } from '@/entities/calculation/calculate'
import { calculateEdging, totalOrderCost } from '@/entities/calculation/edging'
import { createRectanglePolygon, offsetPolygonInward } from '@/shared/geometry/polygon'
import { workingInsetMm } from '@/shared/geometry/edging'
import { EDGING_PRICES, resolveEdgingColorGroup } from '@/shared/config/edging'
import type { CalculationResult, EdgingSettings } from '@/shared/types'

const MODULE = {
  widthMm: 250,
  lengthMm: 250,
  price: 300,
  priceUnit: 'piece' as const,
  weightKg: 0.6,
}

/** Помещение подобрано так, чтобы поле укладки вышло ровно 3000×2000 мм. */
function runWithEdging(edging?: EdgingSettings): CalculationResult {
  const gapMm = 5
  const room = createRectanglePolygon(3100, 2100)
  const working = offsetPolygonInward(room, workingInsetMm(gapMm, edging))
  if (!working.success) throw new Error(working.reason)

  return calculate({
    roomPolygon: room,
    workingPolygon: working.polygon,
    gapMm,
    module: MODULE,
    layout: { rotation: 0, offsetX: 0, offsetY: 0, startPoint: 'corner' },
    wastePercent: 5,
    edging,
  })
}

describe('resolveEdgingColorGroup', () => {
  it('распознаёт чёрный в любом написании', () => {
    expect(resolveEdgingColorGroup('Черный RAL 9005')).toBe('black')
    expect(resolveEdgingColorGroup('Чёрный')).toBe('black')
    expect(resolveEdgingColorGroup('black')).toBe('black')
  })

  it('остальные цвета и пустое имя — цветной кант', () => {
    expect(resolveEdgingColorGroup('Серый RAL 7035')).toBe('colored')
    expect(resolveEdgingColorGroup('Белый')).toBe('colored')
    expect(resolveEdgingColorGroup(undefined)).toBe('colored')
  })
})

describe('calculateEdging', () => {
  it('считает стоимость по количеству элементов и цветовой группе', () => {
    const result = calculateEdging(createRectanglePolygon(3000, 2000), 9, 'Серый')
    const price = EDGING_PRICES.colored

    expect(result.colorGroup).toBe('colored')
    expect(result.straightTotal).toBe(36)
    expect(result.cornerTotal).toBe(4)
    expect(result.straightCost).toBe(36 * price.straight)
    expect(result.cornerCost).toBe(4 * price.corner)
    expect(result.totalCost).toBe(36 * price.straight + 4 * price.corner)
  })

  it('чёрный кант дешевле цветного при той же геометрии', () => {
    const field = createRectanglePolygon(3000, 2000)
    const black = calculateEdging(field, 9, 'Черный RAL 9005')
    const colored = calculateEdging(field, 9, 'Серый RAL 7035')

    expect(black.colorGroup).toBe('black')
    expect(colored.colorGroup).toBe('colored')
    expect(black.straightPrice).toBe(66)
    expect(black.cornerPrice).toBe(136)
    expect(colored.straightPrice).toBe(74)
    expect(colored.cornerPrice).toBe(148)
    expect(black.totalCost).toBeLessThan(colored.totalCost)
  })

  it('толщина канта на цену не влияет', () => {
    const field = createRectanglePolygon(3000, 2000)
    expect(calculateEdging(field, 9, 'Серый').totalCost).toBe(
      calculateEdging(field, 16, 'Серый').totalCost,
    )
  })
})

describe('calculate с окантовкой', () => {
  it('без настройки окантовки спецификация отсутствует', () => {
    expect(runWithEdging().edging).toBeUndefined()
    expect(runWithEdging({ enabled: false, thicknessMm: 9 }).edging).toBeUndefined()
  })

  it('включённый кант добавляет спецификацию по цвету плитки', () => {
    const result = runWithEdging({ enabled: true, thicknessMm: 9 })

    expect(result.edging).toMatchObject({
      thicknessMm: 9,
      colorGroup: 'colored',
      straightCounts: { 1: 18, 2: 18 },
      cornerCounts: { 1: 1, 2: 1, 3: 1, 4: 1 },
    })
  })

  it('стороны не кратны 250 мм — предупреждение о подрезке', () => {
    const room = createRectanglePolygon(3000, 2000)
    const working = offsetPolygonInward(room, 50)
    if (!working.success) throw new Error(working.reason)

    const result = calculate({
      roomPolygon: room,
      workingPolygon: working.polygon,
      gapMm: 5,
      module: MODULE,
      layout: { rotation: 0, offsetX: 0, offsetY: 0, startPoint: 'corner' },
      wastePercent: 5,
      edging: { enabled: true, thicknessMm: 9 },
    })

    expect(result.edging!.trimmedStraightCount).toBeGreaterThan(0)
    expect(result.warnings.map((w) => w.code)).toContain('edging_trimmed_pieces')
    expect(result.warnings.map((w) => w.code)).toContain('edging_cut_locks')
  })

  it('поле кратно плитке — подрезок модулей нет, сетка совпадает с кантом', () => {
    const result = runWithEdging({ enabled: true, thicknessMm: 9 })

    expect(result.cutModulesCount).toBe(0)
    expect(result.fullModulesCount).toBe(96)
    expect(result.warnings.map((w) => w.code)).not.toContain('edging_cut_locks')
  })

  it('1200×800 с кантом даёт обрезки по периметру', () => {
    const gapMm = 5
    const room = createRectanglePolygon(1200, 800)
    const working = offsetPolygonInward(room, workingInsetMm(gapMm, { enabled: true, thicknessMm: 9 }))
    if (!working.success) throw new Error(working.reason)

    const result = calculate({
      roomPolygon: room,
      workingPolygon: working.polygon,
      gapMm,
      module: MODULE,
      layout: { rotation: 0, offsetX: 0, offsetY: 0, startPoint: 'corner' },
      wastePercent: 5,
      edging: { enabled: true, thicknessMm: 9 },
    })

    expect(result.cutModulesCount).toBeGreaterThan(0)
    expect(result.warnings.map((w) => w.code)).toContain('edging_cut_locks')
  })

  it('totalOrderCost складывает покрытие и окантовку', () => {
    const result = runWithEdging({ enabled: true, thicknessMm: 9 })

    expect(totalOrderCost(result)).toBe(result.totalCost! + result.edging!.totalCost)
  })

  it('totalOrderCost без окантовки равен стоимости покрытия', () => {
    const result = runWithEdging()

    expect(totalOrderCost(result)).toBe(result.totalCost)
  })
})
