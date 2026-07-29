/**
 * Предрасчёт областей фото для раскладки: public/data/layout-crops.json.
 *
 * Область ищется офлайн по каждому фото каталога, поэтому в браузере результат
 * детерминирован для всех цветов и серий и не зависит от CORS и производительности.
 *
 * Запуск: npm run build:tile-crops
 */
import fs from 'fs'
import sharp from 'sharp'
import { resolvePhotoGrid } from '../src/shared/config/catalog-photo-grid'
import type { StoredTileCrop } from '../src/shared/api/catalog/layout-crops'
import {
  buildCenteredCrop,
  buildSilhouetteMask,
  detectTileBodyRect,
  insetRect,
  measureBackgroundBleed,
  selectGridCell,
  toNormalizedRect,
} from '../src/shared/lib/tile-crop'
import {
  cropsPath,
  fetchTexturePhoto,
  loadCatalogVariants,
  mapWithConcurrency,
  type Variant,
} from './lib/catalog-variants'

const CONCURRENCY = 8
const PRECISION = 5

type Result = {
  variant: Variant
  crop?: StoredTileCrop
  bleed?: number
  reason?: string
}

function round(value: number): number {
  return Number(value.toFixed(PRECISION))
}

async function computeCrop(variant: Variant): Promise<Result> {
  let file: string
  try {
    file = await fetchTexturePhoto(variant)
  } catch (error) {
    return { variant, reason: error instanceof Error ? error.message : String(error) }
  }

  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const image = { data, width: info.width, height: info.height }
  const mask = buildSilhouetteMask(image)
  const body = detectTileBodyRect(image, mask)
  const grid = resolvePhotoGrid(variant.family)

  const rect = body
    ? insetRect(selectGridCell(body, grid.columns, grid.rows))
    : selectGridCell(buildCenteredCrop(info.width, info.height, 1), grid.columns, grid.rows)
  const normalized = toNormalizedRect(rect, info.width, info.height)

  return {
    variant,
    bleed: Number(measureBackgroundBleed(image, rect, mask).toFixed(PRECISION)),
    crop: {
      x: round(normalized.x),
      y: round(normalized.y),
      w: round(normalized.w),
      h: round(normalized.h),
      ...(body ? {} : { fallback: true as const }),
    },
  }
}

const variants = loadCatalogVariants()
console.log(`вариантов каталога с текстурой: ${variants.length}`)

const results = await mapWithConcurrency(variants, CONCURRENCY, computeCrop)
const crops: Record<string, StoredTileCrop> = {}
const failed: Array<{ id: string; family: string; reason: string }> = []
const fallbacks: string[] = []

for (const result of results) {
  if (!result.crop) {
    failed.push({
      id: result.variant.id,
      family: result.variant.family,
      reason: result.reason ?? 'неизвестно',
    })
    continue
  }
  crops[result.variant.id] = result.crop
  if (result.crop.fallback) fallbacks.push(`${result.variant.id} ${result.variant.family}`)
}

fs.writeFileSync(cropsPath, `${JSON.stringify(crops, null, 1)}\n`)

console.log(`сохранено областей: ${Object.keys(crops).length} → ${cropsPath}`)
if (fallbacks.length > 0) {
  console.warn(`запасной кроп (силуэт неотличим от фона): ${fallbacks.length}`)
  for (const row of fallbacks) console.warn(`  ${row}`)
}
if (failed.length > 0) {
  console.warn(`не обработано: ${failed.length}`)
  for (const row of failed) console.warn(`  ${row.id} ${row.family}: ${row.reason}`)
  process.exitCode = 1
}
