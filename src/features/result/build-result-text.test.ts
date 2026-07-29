import { describe, it, expect } from 'vitest'
import { buildResultClipboardText } from '@/features/result/build-result-text'
import { createRectanglePolygon } from '@/shared/geometry/polygon'
import type { CalculationResult, ProductVariant, RoomState } from '@/shared/types'

const variant: ProductVariant = {
  id: 'v1',
  sourceId: '5200',
  url: '',
  name: 'Модуль ПВХ',
  colorName: 'Серый',
  available: true,
  price: 100,
  priceUnit: 'piece',
  lengthMm: 500,
  widthMm: 500,
  rawParams: {},
  calculable: true,
}

const room: RoomState = {
  shapeType: 'rectangle',
  contour: createRectanglePolygon(5000, 4000),
  gapMm: 5,
  unit: 'm',
  obstacles: [],
  openings: [],
}

const calculation: CalculationResult = {
  roomAreaSqm: 20,
  workingAreaSqm: 19.9,
  obstaclesAreaSqm: 1,
  openingsLengthMm: 900,
  fullModulesCount: 70,
  cutModulesCount: 10,
  cutSourceModulesCount: 5,
  modulesToPurchase: 75,
  totalModulesCount: 75,
  modulesWithWasteCount: 79,
  wastePercent: 5,
  purchaseAreaSqm: 19.75,
  totalCost: 7900,
  warnings: [],
  layout: { modules: [], boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
}

describe('buildResultClipboardText', () => {
  it('собирает краткий текст с кириллицей и ключевыми цифрами', () => {
    const text = buildResultClipboardText({
      projectName: 'Склад А',
      variant,
      room,
      calculation,
    })
    expect(text).toContain('ПластФактор — Склад А')
    expect(text).toContain('Модуль ПВХ')
    expect(text).toContain('Серый')
    expect(text).toContain('79 плиток')
    expect(text).toContain('Препятствия')
    expect(text).toContain('Открытые края')
    expect(text).toContain('7')
    expect(text).toContain('предварительный')
  })
})
