import { z } from 'zod'
import { CATALOG_ELIGIBILITY } from '@/shared/config'
import type {
  CatalogData,
  CatalogEligibilityConfig,
  Category,
  PriceUnit,
  ProductFamily,
  ProductVariant,
} from '@/shared/types'
import type { CatalogAdapter } from './adapter-interface'
import type { RawCatalog, RawOffer, RawOfferParam } from './types'

const ProductVariantSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  url: z.string(),
  name: z.string(),
  available: z.boolean(),
  priceUnit: z.enum(['piece', 'sqm', 'pack', 'meter', 'unknown']),
  rawParams: z.record(z.string(), z.string()),
  calculable: z.boolean(),
})

const CatalogDataSchema = z.object({
  categories: z.array(z.object({ id: z.string(), name: z.string() })),
  families: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      categoryId: z.string(),
      categoryName: z.string(),
      variants: z.array(ProductVariantSchema),
    }),
  ),
})

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getParamText(param: RawOfferParam): string {
  const text = param['#text']
  if (text === undefined) return ''
  return String(text).trim()
}

function parseParams(offer: RawOffer): Record<string, string> {
  const params: Record<string, string> = {}
  for (const param of asArray(offer.param)) {
    const name = param['@_name']
    if (!name) continue
    params[name] = getParamText(param)
  }
  return params
}

export function extractFamilySlug(url: string): string {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\/catalog\/detail\/([^/]+)\/?/)
    return match?.[1] ?? 'unknown'
  } catch {
    const match = url.match(/catalog\/detail\/([^/?]+)/)
    return match?.[1] ?? 'unknown'
  }
}

export function parseDimensionsFromParam(
  raw: string,
  unit?: string,
): { lengthMm: number; widthMm: number; thicknessMm?: number } | null {
  const normalized = raw.replace(/×/g, 'x').replace(/\s/g, '')
  const parts = normalized.split(/[x/]/).map(Number).filter((n) => !Number.isNaN(n))
  if (parts.length < 2) return null

  const multiplier = unit === 'мм' || unit === 'mm' ? 1 : unit === 'см' || unit === 'cm' ? 10 : 1
  const [a, b, c] = parts
  return {
    lengthMm: Math.max(a, b) * multiplier,
    widthMm: Math.min(a, b) * multiplier,
    thicknessMm: c !== undefined ? c * multiplier : undefined,
  }
}

export function parseDimensionsCm(raw: string): { lengthMm: number; widthMm: number; thicknessMm?: number } | null {
  const parts = raw.split('/').map(Number)
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null
  const [a, b, c] = parts
  return {
    lengthMm: Math.max(a, b) * 10,
    widthMm: Math.min(a, b) * 10,
    thicknessMm: c !== undefined ? c * 10 : undefined,
  }
}

function parseColor(colorRaw: string): { colorName?: string; ral?: string } {
  const ralMatch = colorRaw.match(/RAL\s*(\d+)/i)
  const colorName = colorRaw.replace(/RAL\s*\d+/i, '').trim().replace(/,\s*$/, '')
  return {
    colorName: colorName || undefined,
    ral: ralMatch ? `RAL ${ralMatch[1]}` : undefined,
  }
}

function parseThickness(raw: string): number | undefined {
  const match = raw.match(/([\d.,]+)\s*мм/i)
  if (!match) return undefined
  return parseFloat(match[1].replace(',', '.'))
}

function parseAdhesiveBase(raw: string): boolean | undefined {
  const lower = raw.toLowerCase()
  if (lower === 'да' || lower === 'yes') return true
  if (lower === 'нет' || lower === 'no') return false
  return undefined
}

function resolveDimensions(
  offer: RawOffer,
  params: Record<string, string>,
): { lengthMm?: number; widthMm?: number; thicknessMm?: number } {
  const sizeParam = Object.entries(params).find(([k]) => k === 'Размеры')
  if (sizeParam) {
    const paramObj = asArray(offer.param).find((p) => p['@_name'] === 'Размеры')
    const unit = paramObj?.['@_unit']
    const parsed = parseDimensionsFromParam(sizeParam[1], unit)
    if (parsed) return parsed
  }

  if (offer.dimensions) {
    const parsed = parseDimensionsCm(String(offer.dimensions))
    if (parsed) return parsed
  }

  return {}
}

function inferPriceUnit(_params: Record<string, string>, familySlug: string): PriceUnit {
  // Модульная ПВХ-плитка в фиде продаётся поштучно; м² — производная величина.
  if (familySlug && !familySlug.startsWith('taktil') && !familySlug.includes('kashpo')) {
    return 'piece'
  }
  return 'unknown'
}

function isFamilyEligible(slug: string, name: string, config: CatalogEligibilityConfig): boolean {
  if (config.excludedOfferIds.length) {
    // checked per variant
  }
  if (config.excludedFamilySlugs.includes(slug)) return false

  for (const pattern of config.excludedNamePatterns) {
    if (pattern.test(name) || pattern.test(slug)) return false
  }

  if (slug.startsWith('taktil')) return false
  if (slug.includes('taktilnaya')) return false
  if (slug.includes('kashpo')) return false

  return config.allowedFamilySlugs.includes(slug)
}

function normalizeOffer(
  offer: RawOffer,
  _categoryMap: Map<string, string>,
): ProductVariant | null {
  const id = offer['@_id']
  const url = offer.url
  const name = offer.name
  if (!id || !url || !name) return null

  const params = parseParams(offer)
  const familySlug = extractFamilySlug(url)
  const dims = resolveDimensions(offer, params)
  const thicknessFromParam = params['Толщина'] ? parseThickness(params['Толщина']) : undefined
  const colorInfo = params['Цвет'] ? parseColor(params['Цвет']) : {}

  const lengthMm = dims.lengthMm
  const widthMm = dims.widthMm
  const thicknessMm = thicknessFromParam ?? dims.thicknessMm

  const hasDimensions = !!(lengthMm && widthMm && lengthMm > 0 && widthMm > 0)
  const calculable = hasDimensions
  const calculableReason = hasDimensions
    ? undefined
    : 'Отсутствуют достоверные размеры модуля'

  const pictures = asArray(offer.picture)
  const imageUrl = pictures[0] ? String(pictures[0]) : undefined

  const available =
    offer['@_available'] === true ||
    offer['@_available'] === 'true' ||
    offer['@_available'] === undefined

  const price = offer.price !== undefined ? Number(offer.price) : undefined

  return {
    id,
    sourceId: id,
    url,
    name,
    imageUrl,
    available,
    price: Number.isFinite(price) ? price : undefined,
    currency: offer.currencyId ? String(offer.currencyId) : undefined,
    priceUnit: inferPriceUnit(params, familySlug),
    lengthMm,
    widthMm,
    thicknessMm,
    weightKg: offer.weight !== undefined ? Number(offer.weight) : undefined,
    colorName: colorInfo.colorName,
    ral: colorInfo.ral,
    material: params['Тип покрытия'],
    adhesiveBase: params['Клеевая основа']
      ? parseAdhesiveBase(params['Клеевая основа'])
      : undefined,
    rawParams: params,
    calculable,
    calculableReason,
  }
}

export class YmlCatalogAdapter implements CatalogAdapter {
  constructor(private readonly eligibility: CatalogEligibilityConfig = CATALOG_ELIGIBILITY) {}

  normalize(raw: RawCatalog): CatalogData {
    const shop = raw.yml_catalog?.shop
    if (!shop) {
      throw new Error('Невалидный XML: отсутствует yml_catalog/shop')
    }

    const categories: Category[] = asArray(shop.categories?.category).map((cat) => ({
      id: String(cat['@_id'] ?? ''),
      name: String(cat['#text'] ?? ''),
    }))
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]))

    const familyMap = new Map<string, ProductFamily>()

    for (const offer of asArray(shop.offers?.offer)) {
      const variant = normalizeOffer(offer, categoryMap)
      if (!variant) continue

      const slug = extractFamilySlug(variant.url)
      const familyName = variant.name.split(',')[0]?.trim() ?? variant.name

      if (!isFamilyEligible(slug, familyName, this.eligibility)) continue
      if (this.eligibility.excludedOfferIds.includes(variant.id)) continue

      const categoryId = String(offer.categoryId ?? '')
      const categoryName = categoryMap.get(categoryId) ?? ''

      const existing = familyMap.get(slug)
      if (existing) {
        existing.variants.push(variant)
      } else {
        familyMap.set(slug, {
          id: slug,
          slug,
          name: familyName.replace(/\s+\d+\s*мм.*$/i, '').trim() || familyName,
          categoryId,
          categoryName,
          description: offer.description ? String(offer.description) : undefined,
          variants: [variant],
        })
      }
    }

    const families = [...familyMap.values()]
      .map((f) => ({
        ...f,
        variants: f.variants.filter((v) => v.calculable),
      }))
      .filter((f) => f.variants.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

    const data: CatalogData = {
      generatedAt: raw.yml_catalog?.['@_date'],
      categories: categories.filter((c) =>
        families.some((f) => f.categoryId === c.id),
      ),
      families,
    }

    const parsed = CatalogDataSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Ошибка валидации каталога: ${parsed.error.message}`)
    }

    return data
  }
}
