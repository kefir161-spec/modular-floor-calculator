import type { CalculationResult, ProductVariant, RoomState } from '@/shared/types'
import { formatArea, formatLength } from '@/shared/geometry/polygon'
import { totalOrderCost } from '@/entities/calculation/edging'
import { EDGING_COLOR_LABELS } from '@/shared/config/edging'
import { formatColorBreakdownLine } from '@/entities/calculation/color-breakdown'

/** Краткий текст результата для буфера обмена / мессенджера. */
export function buildResultClipboardText(input: {
  projectName: string
  variant: ProductVariant
  room: RoomState
  calculation: CalculationResult
}): string {
  const { projectName, variant, calculation } = input
  const lines = [
    `ПластФактор — ${projectName}`,
    `Товар: ${variant.name}${variant.colorName ? ` (${variant.colorName})` : ''}`,
    `Площадь укладки: ${formatArea(calculation.workingAreaSqm)}`,
    `К покупке: ${calculation.modulesWithWasteCount} плиток (запас ${calculation.wastePercent}%)`,
  ]
  if (calculation.obstaclesAreaSqm > 0) {
    lines.push(`Препятствия: ${formatArea(calculation.obstaclesAreaSqm)}`)
  }
  if (calculation.openingsLengthMm > 0) {
    lines.push(`Открытые края: ${formatLength(calculation.openingsLengthMm, 'mm')}`)
  }
  if (calculation.totalCost !== undefined) {
    lines.push(`Ориентировочно: ${calculation.totalCost.toLocaleString('ru-RU')} ₽`)
  }

  if (calculation.colorBreakdown && calculation.colorBreakdown.length > 0) {
    lines.push('По цветам:')
    for (const row of calculation.colorBreakdown) {
      lines.push(`• ${formatColorBreakdownLine(row)}`)
    }
  }

  const edging = calculation.edging
  if (edging) {
    lines.push(
      `Окантовка ${edging.thicknessMm} мм, ${EDGING_COLOR_LABELS[edging.colorGroup]}: прямых ${edging.straightTotal} шт (№1 — ${edging.straightCounts[1]}, №2 — ${edging.straightCounts[2]}), угловых ${edging.cornerTotal} шт (№1 — ${edging.cornerCounts[1]}, №2 — ${edging.cornerCounts[2]}, №3 — ${edging.cornerCounts[3]}, №4 — ${edging.cornerCounts[4]})`,
    )
    lines.push(`Окантовка ориентировочно: ${edging.totalCost.toLocaleString('ru-RU')} ₽`)
    const orderTotal = totalOrderCost(calculation)
    if (orderTotal !== undefined) {
      lines.push(`Всего по заказу: ${orderTotal.toLocaleString('ru-RU')} ₽`)
    }
  }

  lines.push('Расчёт предварительный — проверьте перед заказом.')
  return lines.join('\n')
}
