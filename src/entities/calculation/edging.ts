import type { CalculationResult, EdgingResult, EdgingThickness, Polygon } from '@/shared/types'
import { EDGING_PRICES, resolveEdgingColorGroup } from '@/shared/config/edging'
import { generateEdging } from '@/shared/geometry/edging'

/** Спецификация окантовки по периметру зоны укладки. */
export function calculateEdging(
  fieldPolygon: Polygon,
  thicknessMm: EdgingThickness,
  colorName?: string,
): EdgingResult {
  const layout = generateEdging(fieldPolygon)
  const colorGroup = resolveEdgingColorGroup(colorName)
  const { straight: straightPrice, corner: cornerPrice } = EDGING_PRICES[colorGroup]
  const straightCost = layout.straightTotal * straightPrice
  const cornerCost = layout.cornerTotal * cornerPrice

  return {
    ...layout,
    thicknessMm,
    colorGroup,
    straightPrice,
    cornerPrice,
    straightCost,
    cornerCost,
    totalCost: straightCost + cornerCost,
  }
}

/** Стоимость заказа целиком: покрытие + окантовка. */
export function totalOrderCost(calculation: CalculationResult): number | undefined {
  const tiles = calculation.totalCost
  const edging = calculation.edging?.totalCost
  if (tiles === undefined) return edging
  return tiles + (edging ?? 0)
}
