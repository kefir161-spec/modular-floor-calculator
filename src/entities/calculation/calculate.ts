import type { CalculationInput, CalculationResult, CalculationWarning } from '@/shared/types'
import { APP_CONFIG } from '@/shared/config'
import { polygonAreaSqm } from '@/shared/geometry/polygon'
import { generateLayout } from '@/shared/geometry/layout'
import { estimateModulesToPurchase } from '@/shared/geometry/module-purchase'
import { resolveModuleUnitPrices } from '@/shared/lib/pricing'

export function calculate(input: CalculationInput): CalculationResult {
  const warnings: CalculationWarning[] = []
  const roomAreaSqm = polygonAreaSqm(input.roomPolygon)
  const workingAreaSqm = polygonAreaSqm(input.workingPolygon)

  if (roomAreaSqm <= 0 || workingAreaSqm <= 0) {
    warnings.push({ code: 'zero_area', message: 'Площадь помещения равна нулю' })
  }

  const layout = generateLayout({
    workingPolygon: input.workingPolygon,
    roomPolygon: input.roomPolygon,
    gapMm: input.gapMm,
    moduleWidthMm: input.module.widthMm,
    moduleLengthMm: input.module.lengthMm,
    rotation: input.layout.rotation,
    offsetX: input.layout.offsetX,
    offsetY: input.layout.offsetY,
    startPoint: input.layout.startPoint,
  })

  const purchase = estimateModulesToPurchase(
    layout.modules,
    input.layout.rotation === 90 ? input.module.lengthMm : input.module.widthMm,
    input.layout.rotation === 90 ? input.module.widthMm : input.module.lengthMm,
  )

  const fullModulesCount = purchase.fullModulesCount
  const cutModulesCount = purchase.cutPlacementsCount
  const cutSourceModulesCount = purchase.cutSourceModulesCount
  const modulesToPurchase = purchase.modulesToPurchase
  const totalModulesCount = modulesToPurchase

  if (layout.modules.length > APP_CONFIG.maxModulesWarning) {
    warnings.push({
      code: 'too_many_modules',
      message: `Раскладка содержит ${layout.modules.length} модулей — отображение может быть упрощено`,
    })
  }

  const modulesWithWasteCount = Math.ceil(
    modulesToPurchase * (1 + input.wastePercent / 100),
  )

  const moduleAreaSqm =
    (input.module.widthMm * input.module.lengthMm) / 1_000_000

  const purchaseAreaSqm = modulesWithWasteCount * moduleAreaSqm

  const unitPrices = resolveModuleUnitPrices({
    price: input.module.price,
    priceUnit: input.module.priceUnit,
    widthMm: input.module.widthMm,
    lengthMm: input.module.lengthMm,
  })

  let totalCost: number | undefined
  let totalCostBySqm: number | undefined

  if (input.module.price !== undefined) {
    if (input.module.priceUnit === 'piece' && unitPrices.pricePerPiece !== undefined) {
      totalCost = modulesWithWasteCount * unitPrices.pricePerPiece
      if (unitPrices.pricePerSqm !== undefined) {
        totalCostBySqm = purchaseAreaSqm * unitPrices.pricePerSqm
      }
    } else if (input.module.priceUnit === 'sqm' && unitPrices.pricePerSqm !== undefined) {
      totalCostBySqm = purchaseAreaSqm * unitPrices.pricePerSqm
      if (unitPrices.pricePerPiece !== undefined) {
        totalCost = modulesWithWasteCount * unitPrices.pricePerPiece
      } else {
        totalCost = totalCostBySqm
      }
    } else if (input.module.priceUnit === 'unknown') {
      warnings.push({
        code: 'unknown_price_unit',
        message: 'Единица цены требует подтверждения — итоговая стоимость не рассчитана',
      })
    }
  }

  let totalWeightKg: number | undefined
  if (input.module.weightKg !== undefined) {
    totalWeightKg = modulesWithWasteCount * input.module.weightKg
  } else {
    warnings.push({
      code: 'missing_weight',
      message: 'Вес модуля неизвестен',
    })
  }

  return {
    roomAreaSqm,
    workingAreaSqm,
    fullModulesCount,
    cutModulesCount,
    cutSourceModulesCount,
    modulesToPurchase,
    totalModulesCount,
    wastePercent: input.wastePercent,
    modulesWithWasteCount,
    purchaseAreaSqm,
    pricePerPiece: unitPrices.pricePerPiece,
    pricePerSqm: unitPrices.pricePerSqm,
    totalCost,
    totalCostBySqm,
    totalWeightKg,
    warnings,
    layout,
  }
}
