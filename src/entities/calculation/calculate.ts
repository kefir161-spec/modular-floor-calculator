import type { CalculationInput, CalculationResult, CalculationWarning } from '@/shared/types'
import { APP_CONFIG } from '@/shared/config'
import { polygonAreaSqm } from '@/shared/geometry/polygon'
import { generateLayout, intersectionArea } from '@/shared/geometry/layout'
import { estimateModulesToPurchase } from '@/shared/geometry/module-purchase'
import { resolveModuleUnitPrices } from '@/shared/lib/pricing'
import { obstacleToPolygon } from '@/shared/geometry/obstacles'
import { isPolygonValid } from '@/shared/geometry/polygon'
import { calculateEdging } from '@/entities/calculation/edging'
import { buildColorBreakdown } from '@/entities/calculation/color-breakdown'

export function calculate(input: CalculationInput): CalculationResult {
  const warnings: CalculationWarning[] = []
  const obstacles = input.obstacles ?? []

  if (!isPolygonValid(input.roomPolygon)) {
    warnings.push({
      code: 'invalid_polygon',
      message: 'Контур помещения самопересекается или невалиден — расчёт недоступен',
    })
    return emptyResult(input, warnings)
  }

  const roomAreaSqm = polygonAreaSqm(input.roomPolygon)
  let workingAreaSqm = polygonAreaSqm(input.workingPolygon)
  let obstaclesAreaSqm = 0

  for (const obs of obstacles) {
    const poly = obstacleToPolygon(obs)
    const cut = intersectionArea(input.workingPolygon, poly) / 1_000_000
    obstaclesAreaSqm += cut
  }
  workingAreaSqm = Math.max(0, workingAreaSqm - obstaclesAreaSqm)

  if (roomAreaSqm <= 0 || workingAreaSqm <= 0) {
    warnings.push({ code: 'zero_area', message: 'Площадь помещения равна нулю' })
  }

  const layout = generateLayout({
    workingPolygon: input.workingPolygon,
    roomPolygon: input.roomPolygon,
    gapMm: input.gapMm,
    obstacles: obstacles.map(obstacleToPolygon),
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
  let modulesToPurchase = purchase.modulesToPurchase
  let totalModulesCount = modulesToPurchase

  if (layout.modules.length > APP_CONFIG.maxModulesWarning) {
    warnings.push({
      code: 'too_many_modules',
      message: `Раскладка содержит ${layout.modules.length} модулей — отображение может быть упрощено`,
    })
  }

  let modulesWithWasteCount = Math.ceil(modulesToPurchase * (1 + input.wastePercent / 100))

  const moduleAreaSqm = (input.module.widthMm * input.module.lengthMm) / 1_000_000
  let purchaseAreaSqm = modulesWithWasteCount * moduleAreaSqm

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
  if (input.module.weightKg === undefined) {
    warnings.push({
      code: 'missing_weight',
      message: 'Вес модуля неизвестен',
    })
  }

  const edging = input.edging?.enabled
    ? calculateEdging(input.workingPolygon, input.edging.thicknessMm, input.module.colorName)
    : undefined

  if (edging) {
    if (edging.unsupportedCornerCount > 0) {
      warnings.push({
        code: 'edging_unsupported_corner',
        message: `Углов не под 90°: ${edging.unsupportedCornerCount} — стандартный угловой кант туда не встаёт, потребуется подрезка по месту`,
      })
    }
    if (edging.trimmedStraightCount > 0) {
      warnings.push({
        code: 'edging_trimmed_pieces',
        message: `Прямых кантов под подрезку: ${edging.trimmedStraightCount} — стороны не кратны 250 мм`,
      })
    }
  }

  const colorBreakdown =
    input.module.id && input.colorOverrides
      ? buildColorBreakdown({
          modules: layout.modules,
          overrides: input.colorOverrides,
          baseVariantId: input.module.id,
          baseColorName: input.module.colorName,
          basePrice: input.module.price,
          basePriceUnit: input.module.priceUnit,
          palette: input.paletteVariants ?? [],
          widthMm: input.layout.rotation === 90 ? input.module.lengthMm : input.module.widthMm,
          lengthMm: input.layout.rotation === 90 ? input.module.widthMm : input.module.lengthMm,
          wastePercent: input.wastePercent,
        })
      : undefined

  if (colorBreakdown && colorBreakdown.length > 0) {
    modulesToPurchase = colorBreakdown.reduce((sum, row) => sum + row.modulesToPurchase, 0)
    totalModulesCount = modulesToPurchase
    modulesWithWasteCount = colorBreakdown.reduce((sum, row) => sum + row.modulesWithWasteCount, 0)
    purchaseAreaSqm = modulesWithWasteCount * moduleAreaSqm
    const paintedCost = colorBreakdown.reduce((sum, row) => sum + (row.totalCost ?? 0), 0)
    if (colorBreakdown.every((row) => row.totalCost !== undefined)) {
      totalCost = paintedCost
    }
    if (totalCost !== undefined && unitPrices.pricePerSqm !== undefined) {
      totalCostBySqm = purchaseAreaSqm * unitPrices.pricePerSqm
    }
  }

  if (input.module.weightKg !== undefined) {
    totalWeightKg = modulesWithWasteCount * input.module.weightKg
  }

  return {
    roomAreaSqm,
    workingAreaSqm,
    obstaclesAreaSqm,
    openingsLengthMm: input.openingsLengthMm ?? 0,
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
    edging,
    colorBreakdown,
    warnings,
    layout,
  }
}

function emptyResult(
  input: CalculationInput,
  warnings: CalculationWarning[],
): CalculationResult {
  return {
    roomAreaSqm: 0,
    workingAreaSqm: 0,
    obstaclesAreaSqm: 0,
    openingsLengthMm: input.openingsLengthMm ?? 0,
    fullModulesCount: 0,
    cutModulesCount: 0,
    cutSourceModulesCount: 0,
    modulesToPurchase: 0,
    totalModulesCount: 0,
    wastePercent: input.wastePercent,
    modulesWithWasteCount: 0,
    purchaseAreaSqm: 0,
    warnings,
    layout: {
      modules: [],
      boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    },
  }
}
