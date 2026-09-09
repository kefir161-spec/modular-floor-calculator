import type { ColorOverrides, LayoutModule, ProductFamily, ProductVariant } from '@/shared/types'

export function modulePaintKey(mod: Pick<LayoutModule, 'x' | 'y'>): string {
  return `${Math.round(mod.x)}:${Math.round(mod.y)}`
}

export function findLayoutModuleAt(
  modules: LayoutModule[],
  x: number,
  y: number,
): LayoutModule | undefined {
  for (let i = modules.length - 1; i >= 0; i -= 1) {
    const mod = modules[i]
    if (!mod || mod.status === 'outside') continue
    if (x >= mod.x && x <= mod.x + mod.widthMm && y >= mod.y && y <= mod.y + mod.lengthMm) {
      return mod
    }
  }
  return undefined
}

export function findFamilyByVariant(
  families: ProductFamily[],
  variant: ProductVariant,
): ProductFamily | undefined {
  return families.find(
    (family) =>
      family.variants.some((item) => item.id === variant.id) ||
      family.variants.some((item) => item.sourceId === variant.sourceId),
  )
}

export function isSamePaintSize(a: ProductVariant, b: ProductVariant): boolean {
  return a.widthMm === b.widthMm && a.lengthMm === b.lengthMm && a.thicknessMm === b.thicknessMm
}

/** Цвета выбранного покрытия той же толщины и размера, без дублей. */
export function paintPalette(
  family: ProductFamily,
  selected: ProductVariant,
): ProductVariant[] {
  const seen = new Set<string>()
  const result: ProductVariant[] = []

  for (const variant of family.variants) {
    if (!variant.calculable || !isSamePaintSize(variant, selected)) continue
    const key = (variant.colorName ?? variant.id).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(variant)
  }

  return result
}

export function applyPaintOverride(
  overrides: ColorOverrides,
  key: string,
  paintVariantId: string,
  baseVariantId: string,
): ColorOverrides {
  if (paintVariantId === baseVariantId) {
    if (!(key in overrides)) return overrides
    const next = { ...overrides }
    delete next[key]
    return next
  }
  if (overrides[key] === paintVariantId) return overrides
  return { ...overrides, [key]: paintVariantId }
}

export function colorOverridesEqual(a: ColorOverrides, b: ColorOverrides): boolean {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => a[key] === b[key])
}

export function cloneColorOverrides(source: ColorOverrides): ColorOverrides {
  return { ...source }
}
