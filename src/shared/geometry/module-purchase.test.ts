import { describe, it, expect } from 'vitest'
import { createRectanglePolygon, offsetPolygonInward } from '@/shared/geometry/polygon'
import { generateLayout } from '@/shared/geometry/layout'
import { estimateModulesToPurchase } from '@/shared/geometry/module-purchase'
import { calculate } from '@/entities/calculation/calculate'

describe('module purchase estimation', () => {
  it('groups small edge cuts into few source tiles (720×680, 340 mm)', () => {
    const room = createRectanglePolygon(720, 680)
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

    const purchase = estimateModulesToPurchase(layout.modules, 340, 340)
    expect(purchase.fullModulesCount).toBe(4)
    expect(purchase.cutPlacementsCount).toBe(4)
    expect(purchase.cutSourceModulesCount).toBe(1)
    expect(purchase.modulesToPurchase).toBe(5)
  })

  it('uses modulesToPurchase in calculation result', () => {
    const room = createRectanglePolygon(720, 680)
    const working = offsetPolygonInward(room, 5)
    expect(working.success).toBe(true)
    if (!working.success) return

    const result = calculate({
      roomPolygon: room,
      workingPolygon: working.polygon,
      gapMm: 5,
      module: { widthMm: 340, lengthMm: 340, price: 1195, priceUnit: 'piece', weightKg: 0.74 },
      layout: { rotation: 0, offsetX: 0, offsetY: 0, startPoint: 'corner' },
      wastePercent: 5,
    })

    expect(result.modulesToPurchase).toBe(5)
    expect(result.modulesWithWasteCount).toBe(6)
    expect(result.totalCost).toBe(6 * 1195)
  })
})
