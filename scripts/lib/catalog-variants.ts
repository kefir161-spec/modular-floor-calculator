/** Общие помощники офлайн-скриптов: варианты каталога и кэш фотографий. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { XMLParser } from 'fast-xml-parser'
import { CATALOG_ELIGIBILITY } from '../../src/shared/config/catalog-eligibility'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const projectRoot = path.resolve(__dirname, '../..')
export const cacheDir = path.join(projectRoot, '.texture-cache')
export const cropsPath = path.join(projectRoot, 'public/data/layout-crops.json')

export type Variant = {
  id: string
  name: string
  family: string
  textureUrl: string
  /** Пропорции модуля: ширина / длина. */
  aspect: number
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function extractFamilySlug(url: string): string {
  return url.match(/\/catalog\/detail\/([^/]+)\//)?.[1] ?? 'unknown'
}

function resolveAspect(offer: Record<string, unknown>): number | null {
  const params = asArray(offer.param as Record<string, string>[] | undefined)
  const sizeParam = params.find((p) => p['@_name'] === 'Размеры')
  const raw = sizeParam ? String(sizeParam['#text'] ?? '') : String(offer.dimensions ?? '')
  const parts = raw
    .replace(/[×х]/g, 'x')
    .replace(/\s|мм|mm/g, '')
    .replace(/,/g, '.')
    .split(/[x/]/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)

  if (parts.length < 2) return null
  const [a, b] = parts
  return Math.min(a, b) / Math.max(a, b)
}

function isEligible(family: string, name: string): boolean {
  if (!CATALOG_ELIGIBILITY.allowedFamilySlugs.includes(family)) return false
  return !CATALOG_ELIGIBILITY.excludedNamePatterns.some((p) => p.test(name) || p.test(family))
}

/** Варианты каталога, доступные в калькуляторе и имеющие текстуру раскладки. */
export function loadCatalogVariants(): Variant[] {
  const xml = fs.readFileSync(path.join(projectRoot, 'public/data/plastfactor_catalog.xml'), 'utf8')
  const textures: Record<string, string> = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'public/data/layout-textures.json'), 'utf8'),
  )
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const offers = asArray(parser.parse(xml).yml_catalog?.shop?.offers?.offer)

  const variants: Variant[] = []
  for (const offer of offers) {
    const id = String(offer['@_id'] ?? '')
    const family = extractFamilySlug(String(offer.url ?? ''))
    const name = String(offer.name ?? '')
    const textureUrl = textures[id]
    const aspect = resolveAspect(offer)
    if (!id || !textureUrl || !aspect || !isEligible(family, name)) continue
    variants.push({ id, name, family, textureUrl, aspect })
  }
  return variants
}

/** Скачивает фото в локальный кэш (повторные запуски не тратят сеть). */
export async function fetchTexturePhoto(variant: Variant): Promise<string> {
  fs.mkdirSync(cacheDir, { recursive: true })
  const file = path.join(cacheDir, `${variant.id}.jpg`)
  if (fs.existsSync(file) && fs.statSync(file).size > 1024) return file

  const response = await fetch(variant.textureUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()))
  return file
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  let done = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index])
      if (++done % 100 === 0) console.log(`  обработано ${done}/${items.length}`)
    }
  })
  await Promise.all(workers)
  return results
}
