/**
 * Проверка предрасчитанных областей раскладки (public/data/layout-crops.json)
 * по всем цветам и сериям каталога.
 *
 * Область не должна задевать фон снимка — фон внутри области превращается
 * в светлые щели между модулями на схеме.
 *
 * Запуск: npm run audit:tile-crops [-- --preview]
 */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import {
  buildSilhouetteMask,
  fromNormalizedRect,
  measureBackgroundBleed,
  type CropRect,
  type NormalizedRect,
} from '../src/shared/lib/tile-crop'
import {
  cacheDir,
  cropsPath,
  fetchTexturePhoto,
  loadCatalogVariants,
  mapWithConcurrency,
  type Variant,
} from './lib/catalog-variants'

/** Допустимая доля фона внутри области. */
const MAX_BLEED = 0.002

/** Минимальная доля кадра — ниже рисунок на схеме заметно крупнее натурального. */
const MIN_CROP_RATIO = 0.15

const CONCURRENCY = 8
const PREVIEW_CELL = 110
const PREVIEW_GRID = 3
const PREVIEW_COLUMNS = 6
const PREVIEW_LIMIT = 18

type Status = 'ok' | 'bleed' | 'small-crop' | 'fallback' | 'missing-crop' | 'error'

type Row = {
  id: string
  family: string
  name: string
  status: Status
  bleed?: number
  cropRatio?: number
  crop?: CropRect
  frame?: string
  error?: string
}

const crops: Record<string, NormalizedRect> = JSON.parse(fs.readFileSync(cropsPath, 'utf8'))

async function inspect(variant: Variant): Promise<Row> {
  const base = { id: variant.id, family: variant.family, name: variant.name }
  const normalized = crops[variant.id]
  if (!normalized) return { ...base, status: 'missing-crop' }

  try {
    const file = await fetchTexturePhoto(variant)
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const image = { data, width: info.width, height: info.height }
    const crop = fromNormalizedRect(normalized, info.width, info.height)
    const bleed = measureBackgroundBleed(image, crop, buildSilhouetteMask(image))
    const cropRatio = (crop.sw * crop.sh) / (info.width * info.height)

    const status: Status = normalized.fallback
      ? 'fallback'
      : bleed > MAX_BLEED
        ? 'bleed'
        : cropRatio < MIN_CROP_RATIO
          ? 'small-crop'
          : 'ok'

    return {
      ...base,
      status,
      bleed: Number(bleed.toFixed(5)),
      cropRatio: Number(cropRatio.toFixed(3)),
      crop,
      frame: `${info.width}x${info.height}`,
    }
  } catch (error) {
    return { ...base, status: 'error', error: error instanceof Error ? error.message : String(error) }
  }
}

/** Контактный лист: плитка выложена сеткой 3×3 — щели видны глазом. */
async function writePreview(rows: Row[]): Promise<void> {
  const cells: Buffer[] = []

  for (const row of rows.slice(0, PREVIEW_LIMIT)) {
    if (!row.crop) continue
    const file = path.join(cacheDir, `${row.id}.jpg`)
    if (!fs.existsSync(file)) continue

    const cell = await sharp(file)
      .extract({ left: row.crop.sx, top: row.crop.sy, width: row.crop.sw, height: row.crop.sh })
      .resize(PREVIEW_CELL, PREVIEW_CELL, { fit: 'fill' })
      .png()
      .toBuffer()

    const size = PREVIEW_CELL * PREVIEW_GRID
    cells.push(
      await sharp({
        create: { width: size, height: size, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } },
      })
        .composite(
          Array.from({ length: PREVIEW_GRID * PREVIEW_GRID }, (_, i) => ({
            input: cell,
            left: (i % PREVIEW_GRID) * PREVIEW_CELL,
            top: Math.floor(i / PREVIEW_GRID) * PREVIEW_CELL,
          })),
        )
        .png()
        .toBuffer(),
    )
  }

  if (cells.length === 0) return

  const size = PREVIEW_CELL * PREVIEW_GRID
  const columns = Math.min(PREVIEW_COLUMNS, cells.length)
  const sheet = await sharp({
    create: {
      width: size * columns,
      height: size * Math.ceil(cells.length / columns),
      channels: 4,
      background: { r: 30, g: 30, b: 30, alpha: 1 },
    },
  })
    .composite(
      cells.map((input, i) => ({
        input,
        left: (i % columns) * size,
        top: Math.floor(i / columns) * size,
      })),
    )
    .png()
    .toBuffer()

  const previewPath = path.join(cacheDir, 'tile-crop-preview.png')
  fs.writeFileSync(previewPath, sheet)
  console.log('превью:', previewPath)
}

const variants = loadCatalogVariants()
console.log(`вариантов каталога с текстурой: ${variants.length}`)

const rows = await mapWithConcurrency(variants, CONCURRENCY, inspect)
const problems = rows.filter((r) => r.status !== 'ok')
const summary = new Map<Status, number>()
for (const row of rows) summary.set(row.status, (summary.get(row.status) ?? 0) + 1)

const reportPath = path.join(cacheDir, 'tile-crop-audit.json')
fs.writeFileSync(
  reportPath,
  JSON.stringify(
    { generatedAt: new Date().toISOString(), total: rows.length, summary: Object.fromEntries(summary), problems },
    null,
    2,
  ),
)

for (const [status, count] of [...summary].sort((a, b) => b[1] - a[1])) {
  console.log(`${status}: ${count}`)
}
for (const row of problems.slice(0, 20)) {
  console.log(
    `  ${row.status} ${row.id} ${row.family} bleed=${row.bleed ?? '-'} ratio=${row.cropRatio ?? '-'} ${row.error ?? ''}`,
  )
}
console.log('отчёт:', reportPath)

if (process.argv.includes('--preview')) {
  await writePreview(problems.length > 0 ? problems : rows)
}

// small-crop и fallback — особенности исходных фото, а не регресс кропа
const TOLERATED: Status[] = ['small-crop', 'fallback']
process.exitCode = problems.some((r) => !TOLERATED.includes(r.status)) ? 1 : 0
