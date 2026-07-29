/**
 * Поиск области фронтального фото, пригодной для бесшовной раскладки.
 *
 * Фото каталога — модуль на однотонном фоне (обычно белом). Для раскладки нужен
 * прямоугольник строго внутри силуэта модуля: без фона, без пазловых зубцов и
 * выемок, иначе между модулями на схеме видны светлые щели.
 *
 * Алгоритм не зависит от цвета плитки, тени под ней и формы модуля:
 *  1. маска «не фон» — по отличию цвета от фона и по наличию текстуры
 *     (белая плитка на белом фоне отличается только текстурой);
 *  2. заполнение отверстий — у решётчатых модулей фон виден насквозь,
 *     но это часть модуля, а не граница;
 *  3. рост прямоугольника от центра кадра до появления фона на его границе.
 *
 * Модуль не зависит от DOM — используется и в браузере, и в офлайн-скриптах.
 */

export type RgbaImage = {
  data: Uint8ClampedArray | Uint8Array
  width: number
  height: number
}

export type CropRect = {
  sx: number
  sy: number
  sw: number
  sh: number
}

/** Нормированный прямоугольник (0..1) — не зависит от разрешения фото. */
export type NormalizedRect = {
  x: number
  y: number
  w: number
  h: number
}

export type Rgb = readonly [number, number, number]

/** Пороги отличия от фона: подбираются по шуму рамки в этих границах. */
const MIN_DIFF_THRESHOLD = 4
const MAX_DIFF_THRESHOLD = 16

/** Запас над шумом рамки. */
const NOISE_FACTOR = 1.5

/** Толщина рамки для оценки фона (доля меньшей стороны кадра). */
const BACKGROUND_RING_RATIO = 0.02

/**
 * Максимальный разрыв в силуэте, который считается частью модуля (доля стороны):
 * отверстия решётчатых модулей и засветки на глянце.
 */
const HOLE_GAP_RATIO = 0.2

/** Доля кадра для запасного кропа, когда силуэт не найден. */
const FALLBACK_FRAME_RATIO = 0.7

/**
 * Допустимая доля фона на границе растущей области. Практически нулевая:
 * даже кончики пазловых выемок дают на схеме светлый пунктир по швам.
 */
const RING_BACKGROUND_BUDGET = 0.001

/** Шаг роста области в пикселях. */
const GROWTH_STEP = 2

/** Стартовый полуразмер области. */
const GROWTH_START = 6

/** Страховочный отступ внутрь силуэта. */
const SAFETY_INSET_RATIO = 0.02

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
}

function ringThickness(width: number, height: number): number {
  return Math.max(2, Math.round(Math.min(width, height) * BACKGROUND_RING_RATIO))
}

function isRingPixel(x: number, y: number, width: number, height: number, thickness: number): boolean {
  return x < thickness || y < thickness || x >= width - thickness || y >= height - thickness
}

/** Цвет фона — медиана рамки кадра: модуль всегда снят с отступом от границ. */
export function estimateBackgroundColor(image: RgbaImage): Rgb {
  const { data, width, height } = image
  const thickness = ringThickness(width, height)
  const reds: number[] = []
  const greens: number[] = []
  const blues: number[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isRingPixel(x, y, width, height, thickness)) continue
      const i = (y * width + x) * 4
      reds.push(data[i])
      greens.push(data[i + 1])
      blues.push(data[i + 2])
    }
  }

  return [median(reds), median(greens), median(blues)]
}

/** Локальная «шероховатость»: сумма модулей производных, сглаженная по кресту. */
function buildTextureMap(image: RgbaImage): Float32Array {
  const { data, width, height } = image
  const gray = new Float32Array(width * height)
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  const raw = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x
      raw[p] = Math.abs(gray[p + 1] - gray[p - 1]) + Math.abs(gray[p + width] - gray[p - width])
    }
  }

  // сглаживание подавляет одиночные пиксели шума, сохраняя текстуру рельефа
  const smooth = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x
      smooth[p] = (raw[p] + raw[p - 1] + raw[p + 1] + raw[p - width] + raw[p + width]) / 5
    }
  }

  return smooth
}

/** Порог отличия от фона: шум рамки с запасом, ограниченный сверху и снизу. */
function resolveDiffThreshold(ringValues: number[]): number {
  const noise = quantile(ringValues, 0.99) * NOISE_FACTOR
  return Math.min(MAX_DIFF_THRESHOLD, Math.max(MIN_DIFF_THRESHOLD, noise))
}

/** Заполняет разрывы внутри самой длинной цепочки силуэта вдоль одной линии. */
function fillLongestRun(
  read: (index: number) => boolean,
  write: (index: number) => void,
  length: number,
  maxGap: number,
): void {
  let bestStart = -1
  let bestEnd = -1
  let start = -1
  let end = -1
  let gap = 0

  for (let i = 0; i < length; i++) {
    if (read(i)) {
      if (start < 0) start = i
      end = i
      gap = 0
      continue
    }
    if (start < 0) continue
    if (++gap > maxGap) {
      if (end - start > bestEnd - bestStart) {
        bestStart = start
        bestEnd = end
      }
      start = -1
      gap = 0
    }
  }
  if (start >= 0 && end - start > bestEnd - bestStart) {
    bestStart = start
    bestEnd = end
  }
  if (bestStart < 0) return

  for (let i = bestStart; i <= bestEnd; i++) write(i)
}

/**
 * Маска силуэта модуля: 1 — модуль (включая отверстия решётки), 0 — фон.
 */
export function buildSilhouetteMask(image: RgbaImage, background?: Rgb): Uint8Array {
  const { data, width, height } = image
  const bg = background ?? estimateBackgroundColor(image)
  const texture = buildTextureMap(image)
  const thickness = ringThickness(width, height)

  const colorDiff = new Float32Array(width * height)
  const ringColor: number[] = []
  const ringTexture: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      const i = p * 4
      colorDiff[p] = Math.max(
        Math.abs(data[i] - bg[0]),
        Math.abs(data[i + 1] - bg[1]),
        Math.abs(data[i + 2] - bg[2]),
      )
      if (isRingPixel(x, y, width, height, thickness)) {
        ringColor.push(colorDiff[p])
        ringTexture.push(texture[p])
      }
    }
  }

  const colorThreshold = resolveDiffThreshold(ringColor)
  const textureThreshold = resolveDiffThreshold(ringTexture)

  const foreground = new Uint8Array(width * height)
  for (let p = 0; p < foreground.length; p++) {
    const opaque = data[p * 4 + 3] >= 12
    if (opaque && (colorDiff[p] > colorThreshold || texture[p] > textureThreshold)) {
      foreground[p] = 1
    }
  }

  const rowFilled = new Uint8Array(width * height)
  const rowGap = Math.max(2, Math.round(width * HOLE_GAP_RATIO))
  for (let y = 0; y < height; y++) {
    const offset = y * width
    fillLongestRun(
      (x) => foreground[offset + x] === 1,
      (x) => {
        rowFilled[offset + x] = 1
      },
      width,
      rowGap,
    )
  }

  const mask = new Uint8Array(width * height)
  const colGap = Math.max(2, Math.round(height * HOLE_GAP_RATIO))
  for (let x = 0; x < width; x++) {
    fillLongestRun(
      (y) => foreground[y * width + x] === 1,
      (y) => {
        const p = y * width + x
        if (rowFilled[p] === 1) mask[p] = 1
      },
      height,
      colGap,
    )
  }

  return mask
}

/** Пропорции полуразмеров области: длинная сторона равна 1. */
function resolveHalfSizeRatio(aspect: number): { rx: number; ry: number } {
  if (aspect >= 1) return { rx: 1, ry: 1 / aspect }
  return { rx: aspect, ry: 1 }
}

function measureRingBackground(
  mask: Uint8Array,
  width: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): number {
  let bgPixels = 0
  let total = 0

  for (let x = left; x <= right; x++) {
    total += 2
    if (mask[top * width + x] === 0) bgPixels++
    if (mask[bottom * width + x] === 0) bgPixels++
  }
  for (let y = top + 1; y < bottom; y++) {
    total += 2
    if (mask[y * width + left] === 0) bgPixels++
    if (mask[y * width + right] === 0) bgPixels++
  }

  return total === 0 ? 1 : bgPixels / total
}

/**
 * Наибольшая область в центре кадра, целиком лежащая внутри силуэта модуля.
 * Возвращает null, если силуэт не найден.
 */
export function detectTileBodyRect(image: RgbaImage, mask?: Uint8Array): CropRect | null {
  const { width, height } = image
  if (width <= 0 || height <= 0) return null

  const silhouette = mask ?? buildSilhouetteMask(image)
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  const maxHalf = Math.min(cx, cy)

  let bestHalf = 0
  for (let half = GROWTH_START; half <= maxHalf; half += GROWTH_STEP) {
    const left = Math.round(cx - half)
    const right = Math.round(cx + half)
    const top = Math.round(cy - half)
    const bottom = Math.round(cy + half)
    if (measureRingBackground(silhouette, width, left, top, right, bottom) > RING_BACKGROUND_BUDGET) break
    bestHalf = half
  }

  if (bestHalf === 0) return null

  return {
    sx: Math.round(cx - bestHalf),
    sy: Math.round(cy - bestHalf),
    sw: Math.max(1, bestHalf * 2),
    sh: Math.max(1, bestHalf * 2),
  }
}

/** Уменьшает область на страховочный отступ. */
export function insetRect(rect: CropRect, ratio = SAFETY_INSET_RATIO): CropRect {
  const dx = Math.round(rect.sw * ratio)
  const dy = Math.round(rect.sh * ratio)
  return {
    sx: rect.sx + dx,
    sy: rect.sy + dy,
    sw: Math.max(1, rect.sw - dx * 2),
    sh: Math.max(1, rect.sh - dy * 2),
  }
}

/** Вписывает в область прямоугольник заданных пропорций (ширина / высота). */
export function fitAspectRect(rect: CropRect, aspect: number): CropRect {
  const { rx, ry } = resolveHalfSizeRatio(aspect)
  const half = Math.min(rect.sw / (2 * rx), rect.sh / (2 * ry))
  const cx = rect.sx + rect.sw / 2
  const cy = rect.sy + rect.sh / 2

  return {
    sx: Math.round(cx - half * rx),
    sy: Math.round(cy - half * ry),
    sw: Math.max(1, Math.round(half * rx * 2)),
    sh: Math.max(1, Math.round(half * ry * 2)),
  }
}

/** Центральная ячейка сетки внутри области — для фото, где снято несколько модулей. */
export function selectGridCell(rect: CropRect, columns: number, rows: number): CropRect {
  if (columns <= 1 && rows <= 1) return rect
  const cellW = rect.sw / Math.max(1, columns)
  const cellH = rect.sh / Math.max(1, rows)
  return {
    sx: Math.round(rect.sx),
    sy: Math.round(rect.sy),
    sw: Math.max(1, Math.round(cellW)),
    sh: Math.max(1, Math.round(cellH)),
  }
}

/**
 * Запасной кроп, если силуэт не найден (белый глянец на белом фоне):
 * центральная часть кадра — модуль на фото всегда в центре и с полями.
 */
export function buildCenteredCrop(width: number, height: number, aspect: number): CropRect {
  const side = Math.round(Math.min(width, height) * FALLBACK_FRAME_RATIO)
  return fitAspectRect(
    {
      sx: Math.round((width - side) / 2),
      sy: Math.round((height - side) / 2),
      sw: side,
      sh: side,
    },
    aspect,
  )
}

/**
 * Итоговая область фото для раскладки: силуэт модуля нужных пропорций,
 * либо центральный кроп кадра, если силуэт не найден.
 */
export function buildTileCrop(image: RgbaImage, aspect = 1, mask?: Uint8Array): CropRect {
  const body = detectTileBodyRect(image, mask)
  if (!body) return buildCenteredCrop(image.width, image.height, aspect)
  return fitAspectRect(insetRect(body), aspect)
}

/** Доля фона внутри области — метрика светлых щелей в раскладке. */
export function measureBackgroundBleed(image: RgbaImage, rect: CropRect, mask?: Uint8Array): number {
  const silhouette = mask ?? buildSilhouetteMask(image)
  const { width } = image
  let bgPixels = 0
  let total = 0

  for (let y = rect.sy; y < rect.sy + rect.sh; y++) {
    for (let x = rect.sx; x < rect.sx + rect.sw; x++) {
      total++
      if (silhouette[y * width + x] === 0) bgPixels++
    }
  }

  return total === 0 ? 1 : bgPixels / total
}

export function toNormalizedRect(rect: CropRect, width: number, height: number): NormalizedRect {
  return {
    x: rect.sx / width,
    y: rect.sy / height,
    w: rect.sw / width,
    h: rect.sh / height,
  }
}

export function fromNormalizedRect(rect: NormalizedRect, width: number, height: number): CropRect {
  const sx = Math.round(rect.x * width)
  const sy = Math.round(rect.y * height)
  return {
    sx,
    sy,
    sw: Math.max(1, Math.min(width - sx, Math.round(rect.w * width))),
    sh: Math.max(1, Math.min(height - sy, Math.round(rect.h * height))),
  }
}
