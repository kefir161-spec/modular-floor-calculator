import { describe, expect, it } from 'vitest'
import { calculate } from '@/entities/calculation/calculate'
import { buildColorBreakdown, formatColorBreakdownLine } from '@/entities/calculation/color-breakdown'
import { createRectanglePolygon, offsetPolygonInward } from '@/shared/geometry/polygon'
import type { LayoutModule } from '@/shared/types'

function fullModule(id: string, x: number, y: number): LayoutModule {
  return {
    id,
    row: 0,
    col: 0,
    x,
    y,
    widthMm: 500,
    lengthMm: 500,
    status: 'full',
    polygon: [
      { x, y },
      { x: x + 500, y },
      { x: x + 500, y: y + 500 },
      { x, y: y + 500 },
    ],
  }
}

describe('color breakdown', () => {
  it('без покраски не возвращает строки', () => {
    expect(
      buildColorBreakdown({
        modules: [fullModule('a', 0, 0)],
        overrides: {},
        baseVariantId: 'black',
        baseColorName: 'Чёрный',
        basePrice: 100,
        basePriceUnit: 'piece',
        palette: [],
        widthMm: 500,
        lengthMm: 500,
        wastePercent: 5,
      }),
    ).toBeUndefined()
  })

  it('группирует модули по цвету и считает закупку отдельно', () => {
    const rows = buildColorBreakdown({
      modules: [fullModule('a', 0, 0), fullModule('b', 500, 0), fullModule('c', 0, 500)],
      overrides: { '500:0': 'gray' },
      baseVariantId: 'black',
      baseColorName: 'Чёрный',
      basePrice: 100,
      basePriceUnit: 'piece',
      palette: [
        { id: 'black', colorName: 'Чёрный', price: 100, priceUnit: 'piece' },
        { id: 'gray', colorName: 'Серый', price: 120, priceUnit: 'piece' },
      ],
      widthMm: 500,
      lengthMm: 500,
      wastePercent: 5,
    })

    expect(rows).toHaveLength(2)
    const black = rows?.find((row) => row.variantId === 'black')
    const gray = rows?.find((row) => row.variantId === 'gray')
    expect(black?.modulesCount).toBe(2)
    expect(gray?.modulesCount).toBe(1)
    expect(black?.modulesWithWasteCount).toBe(Math.ceil(2 * 1.05))
    expect(gray?.modulesWithWasteCount).toBe(Math.ceil(1 * 1.05))
    expect(gray?.totalCost).toBe((gray?.modulesWithWasteCount ?? 0) * 120)
    expect(formatColorBreakdownLine(gray!)).toContain('Серый')
  })

  it('calculate суммирует закупку по цветам', () => {
    const room = createRectanglePolygon(1000, 1000)
    const working = offsetPolygonInward(room, 0)
    if (!working.success) throw new Error(working.reason)

    const result = calculate({
      roomPolygon: room,
      workingPolygon: working.polygon,
      gapMm: 0,
      module: {
        id: 'black',
        widthMm: 500,
        lengthMm: 500,
        price: 100,
        priceUnit: 'piece',
        colorName: 'Чёрный',
        weightKg: 1,
      },
      layout: { rotation: 0, offsetX: 0, offsetY: 0, startPoint: 'corner' },
      wastePercent: 5,
      colorOverrides: { '0:0': 'gray' },
      paletteVariants: [
        { id: 'black', colorName: 'Чёрный', price: 100, priceUnit: 'piece' },
        { id: 'gray', colorName: 'Серый', price: 200, priceUnit: 'piece' },
      ],
    })

    expect(result.colorBreakdown).toBeDefined()
    expect(result.colorBreakdown!.length).toBeGreaterThan(1)
    const paintedPurchase = result.colorBreakdown!.reduce((sum, row) => sum + row.modulesWithWasteCount, 0)
    expect(result.modulesWithWasteCount).toBe(paintedPurchase)
    expect(result.totalCost).toBe(
      result.colorBreakdown!.reduce((sum, row) => sum + (row.totalCost ?? 0), 0),
    )
  })
})
