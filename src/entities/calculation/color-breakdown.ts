import type {
  ColorBreakdownRow,
  ColorOverrides,
  LayoutModule,
  PriceUnit,
} from '@/shared/types'
import { estimateModulesToPurchase } from '@/shared/geometry/module-purchase'
import { modulePaintKey } from '@/shared/lib/paint'
import { resolveModuleUnitPrices } from '@/shared/lib/pricing'

type PaletteItem = {
  id: string
  colorName?: string
  price?: number
  priceUnit: PriceUnit
}

export function buildColorBreakdown(input: {
  modules: LayoutModule[]
  overrides: ColorOverrides
  baseVariantId: string
  baseColorName?: string
  basePrice?: number
  basePriceUnit: PriceUnit
  palette: PaletteItem[]
  widthMm: number
  lengthMm: number
  wastePercent: number
}): ColorBreakdownRow[] | undefined {
  if (Object.keys(input.overrides).length === 0) return undefined

  const groups = new Map<string, LayoutModule[]>()
  for (const mod of input.modules) {
    if (mod.status === 'outside') continue
    const painted = input.overrides[modulePaintKey(mod)]
    const variantId = painted ?? input.baseVariantId
    const list = groups.get(variantId) ?? []
    list.push(mod)
    groups.set(variantId, list)
  }

  const byId = new Map(input.palette.map((item) => [item.id, item]))
  const rows: ColorBreakdownRow[] = []

  for (const [variantId, mods] of groups) {
    const meta = byId.get(variantId)
    const purchase = estimateModulesToPurchase(mods, input.widthMm, input.lengthMm)
    const modulesWithWasteCount = Math.ceil(
      purchase.modulesToPurchase * (1 + input.wastePercent / 100),
    )
    const price = meta?.price ?? (variantId === input.baseVariantId ? input.basePrice : undefined)
    const priceUnit = meta?.priceUnit ?? input.basePriceUnit
    const unitPrices = resolveModuleUnitPrices({
      price,
      priceUnit,
      widthMm: input.widthMm,
      lengthMm: input.lengthMm,
    })
    const totalCost =
      unitPrices.pricePerPiece !== undefined
        ? modulesWithWasteCount * unitPrices.pricePerPiece
        : undefined

    rows.push({
      variantId,
      colorName:
        meta?.colorName ?? (variantId === input.baseVariantId ? input.baseColorName : undefined),
      modulesCount: mods.length,
      modulesToPurchase: purchase.modulesToPurchase,
      modulesWithWasteCount,
      totalCost,
    })
  }

  rows.sort((a, b) => b.modulesWithWasteCount - a.modulesWithWasteCount)
  return rows
}

export function formatColorBreakdownLine(row: ColorBreakdownRow): string {
  const name = row.colorName ?? row.variantId
  const cost =
    row.totalCost !== undefined ? `, ${row.totalCost.toLocaleString('ru-RU')} ₽` : ''
  return `${name}: ${row.modulesWithWasteCount} шт${cost}`
}
