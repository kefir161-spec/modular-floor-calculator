import type { PriceUnit } from '@/shared/types'

export function getModuleAreaSqm(widthMm: number, lengthMm: number): number {
  return (widthMm * lengthMm) / 1_000_000
}

/** Цена за м², выведенная из цены за штуку и габаритов модуля. */
export function derivePricePerSqm(
  pricePerPiece: number,
  widthMm: number,
  lengthMm: number,
): number | undefined {
  const area = getModuleAreaSqm(widthMm, lengthMm)
  if (area <= 0) return undefined
  return pricePerPiece / area
}

/** Цена за штуку, выведенная из цены за м² и габаритов модуля. */
export function derivePricePerPiece(
  pricePerSqm: number,
  widthMm: number,
  lengthMm: number,
): number | undefined {
  const area = getModuleAreaSqm(widthMm, lengthMm)
  if (area <= 0) return undefined
  return pricePerSqm * area
}

export type ModuleUnitPrices = {
  pricePerPiece?: number
  pricePerSqm?: number
  sourceUnit: PriceUnit
}

/**
 * Для модульной плитки в фиде цена указана за штуку.
 * Параллельно показываем эквивалент за м².
 */
export function resolveModuleUnitPrices(input: {
  price?: number
  priceUnit: PriceUnit
  widthMm: number
  lengthMm: number
}): ModuleUnitPrices {
  const { price, priceUnit, widthMm, lengthMm } = input
  if (price === undefined) {
    return { sourceUnit: priceUnit }
  }

  if (priceUnit === 'piece') {
    return {
      pricePerPiece: price,
      pricePerSqm: derivePricePerSqm(price, widthMm, lengthMm),
      sourceUnit: priceUnit,
    }
  }

  if (priceUnit === 'sqm') {
    return {
      pricePerSqm: price,
      pricePerPiece: derivePricePerPiece(price, widthMm, lengthMm),
      sourceUnit: priceUnit,
    }
  }

  return { sourceUnit: priceUnit }
}

export function formatRub(value: number, fractionDigits = 0): string {
  return `${value.toLocaleString('ru-RU', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })} ₽`
}

export function formatUnitPrices(prices: ModuleUnitPrices): string | null {
  const parts: string[] = []
  if (prices.pricePerPiece !== undefined) {
    parts.push(`${formatRub(prices.pricePerPiece)}/шт`)
  }
  if (prices.pricePerSqm !== undefined) {
    parts.push(`${formatRub(prices.pricePerSqm, 2)}/м²`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
