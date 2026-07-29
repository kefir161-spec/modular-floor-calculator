import { describe, it, expect } from 'vitest'
import {
  createRectanglePolygon,
  createLShapePolygon,
  createUShapePolygon,
  createNichePolygon,
  offsetPolygonInward,
} from '@/shared/geometry/polygon'
import { calculate } from '@/entities/calculation/calculate'
import type { CalculationResult, LayoutStartPoint, LayoutRotation } from '@/shared/types'

/**
 * Золотые регрессионные тесты расчётного ядра.
 * Числа зафиксированы на текущем поведении. Падение = регрессия, не повод править ожидания.
 */
const MODULE = {
  widthMm: 500,
  lengthMm: 500,
  price: 1000,
  priceUnit: 'piece' as const,
  weightKg: 1.2,
}

type Golden = {
  roomAreaSqm: number
  workingAreaSqm: number
  fullModulesCount: number
  cutModulesCount: number
  cutSourceModulesCount: number
  modulesToPurchase: number
  modulesWithWasteCount: number
  purchaseAreaSqm: number
  totalCost: number
  totalWeightKg: number
}

function runCalc(
  room: ReturnType<typeof createRectanglePolygon>,
  gapMm: number,
  layout: { rotation?: LayoutRotation; startPoint?: LayoutStartPoint } = {},
): CalculationResult {
  const working = offsetPolygonInward(room, gapMm)
  if (!working.success) throw new Error(`offset failed: ${working.reason}`)
  return calculate({
    roomPolygon: room,
    workingPolygon: working.polygon,
    gapMm,
    module: MODULE,
    layout: {
      rotation: layout.rotation ?? 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: layout.startPoint ?? 'corner',
    },
    wastePercent: 5,
  })
}

function expectGolden(result: CalculationResult, golden: Golden) {
  expect(result.roomAreaSqm).toBeCloseTo(golden.roomAreaSqm, 6)
  expect(result.workingAreaSqm).toBeCloseTo(golden.workingAreaSqm, 6)
  expect(result.fullModulesCount).toBe(golden.fullModulesCount)
  expect(result.cutModulesCount).toBe(golden.cutModulesCount)
  expect(result.cutSourceModulesCount).toBe(golden.cutSourceModulesCount)
  expect(result.modulesToPurchase).toBe(golden.modulesToPurchase)
  expect(result.modulesWithWasteCount).toBe(golden.modulesWithWasteCount)
  expect(result.purchaseAreaSqm).toBeCloseTo(golden.purchaseAreaSqm, 6)
  expect(result.totalCost).toBe(golden.totalCost)
  expect(result.totalWeightKg).toBeCloseTo(golden.totalWeightKg, 6)
}

describe('golden calculation regression', () => {
  it('прямоугольник 5×4 м, зазор 5 мм', () => {
    expectGolden(runCalc(createRectanglePolygon(5000, 4000), 5), {
      roomAreaSqm: 20,
      workingAreaSqm: 19.9101,
      fullModulesCount: 80,
      cutModulesCount: 0,
      cutSourceModulesCount: 0,
      modulesToPurchase: 80,
      modulesWithWasteCount: 84,
      purchaseAreaSqm: 21,
      totalCost: 84000,
      totalWeightKg: 100.8,
    })
  })

  it('прямоугольник 5×4 м, зазор 5 мм, поворот 90°', () => {
    expectGolden(runCalc(createRectanglePolygon(5000, 4000), 5, { rotation: 90 }), {
      roomAreaSqm: 20,
      workingAreaSqm: 19.9101,
      fullModulesCount: 80,
      cutModulesCount: 0,
      cutSourceModulesCount: 0,
      modulesToPurchase: 80,
      modulesWithWasteCount: 84,
      purchaseAreaSqm: 21,
      totalCost: 84000,
      totalWeightKg: 100.8,
    })
  })

  it('прямоугольник 3×4 м, зазор 5 мм', () => {
    expectGolden(runCalc(createRectanglePolygon(3000, 4000), 5), {
      roomAreaSqm: 12,
      workingAreaSqm: 11.9301,
      fullModulesCount: 48,
      cutModulesCount: 0,
      cutSourceModulesCount: 0,
      modulesToPurchase: 48,
      modulesWithWasteCount: 51,
      purchaseAreaSqm: 12.75,
      totalCost: 51000,
      totalWeightKg: 61.2,
    })
  })

  it('Г-образная 5×4 м, зазор 5 мм', () => {
    expectGolden(runCalc(createLShapePolygon(5000, 4000, 3000, 2500), 5), {
      roomAreaSqm: 15,
      workingAreaSqm: 14.9101,
      fullModulesCount: 60,
      cutModulesCount: 0,
      cutSourceModulesCount: 0,
      modulesToPurchase: 60,
      modulesWithWasteCount: 63,
      purchaseAreaSqm: 15.75,
      totalCost: 63000,
      totalWeightKg: 75.6,
    })
  })

  it('П-образная 6×5 м, зазор 5 мм', () => {
    expectGolden(runCalc(createUShapePolygon(6000, 5000, 3000, 3000, 1000), 5), {
      roomAreaSqm: 18,
      workingAreaSqm: 17.8601,
      fullModulesCount: 72,
      cutModulesCount: 0,
      cutSourceModulesCount: 0,
      modulesToPurchase: 72,
      modulesWithWasteCount: 76,
      purchaseAreaSqm: 19,
      totalCost: 76000,
      totalWeightKg: 91.2,
    })
  })

  it('с нишей 5×4 м, зазор 5 мм', () => {
    expectGolden(runCalc(createNichePolygon(5000, 4000, 1500, 1000, 2000), 5), {
      roomAreaSqm: 18.5,
      workingAreaSqm: 18.4001,
      fullModulesCount: 74,
      cutModulesCount: 0,
      cutSourceModulesCount: 0,
      modulesToPurchase: 74,
      modulesWithWasteCount: 78,
      purchaseAreaSqm: 19.5,
      totalCost: 78000,
      totalWeightKg: 93.6,
    })
  })

  it('прямоугольник 5×4 м, без зазора, от центра', () => {
    expectGolden(
      runCalc(createRectanglePolygon(5000, 4000), 0, { startPoint: 'center' }),
      {
        roomAreaSqm: 20,
        workingAreaSqm: 20,
        fullModulesCount: 80,
        cutModulesCount: 0,
        cutSourceModulesCount: 0,
        modulesToPurchase: 80,
        modulesWithWasteCount: 84,
        purchaseAreaSqm: 21,
        totalCost: 84000,
        totalWeightKg: 100.8,
      },
    )
  })

  it('прямоугольник 3×4.1 м, зазор 5 мм — фиксированные подрезки', () => {
    const result = runCalc(createRectanglePolygon(3000, 4100), 5)
    expect(result.fullModulesCount).toBe(48)
    expect(result.cutModulesCount).toBe(12)
    expect(result.modulesToPurchase).toBe(50)
    expect(result.modulesWithWasteCount).toBe(53)
  })
})
