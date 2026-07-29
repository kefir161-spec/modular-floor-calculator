import type { CalculationResult, ProductVariant, RoomState } from '@/shared/types'
import { formatArea, formatLength } from '@/shared/geometry/polygon'

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
  lines.push('Расчёт предварительный — проверьте перед заказом.')
  return lines.join('\n')
}
