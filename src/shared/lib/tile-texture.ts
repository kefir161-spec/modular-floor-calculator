/** Для Konva.Image — фронтальное фото модуля (после обрезки полей). */
export type TilePatternSource = HTMLImageElement | HTMLCanvasElement

export type ModuleImageLayout = {
  x: number
  y: number
  width: number
  height: number
}

/** Лёгкое увеличение — пазловые кромки на фото сходятся в сплошное полотно. */
export const LAYOUT_TILE_SNAP = 1.055

/** Внутренняя обрезка — убирает светлую «пазловую» кромку на фронтальном фото. */
const PUZZLE_EDGE_INSET_RATIO = 0.045

export type LayoutPhotoCrop = {
  sx: number
  sy: number
  sw: number
  sh: number
}

function isBackgroundPixel(r: number, g: number, b: number, a: number, threshold: number): boolean {
  if (a < 12) return true
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  const sat = Math.max(r, g, b) - Math.min(r, g, b)
  if (lum >= threshold) return true
  if (lum >= 178 && sat < 22) return true
  return false
}

function readSourcePixels(source: TilePatternSource): {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
} | null {
  const width = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth || source.width
  const height = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight || source.height
  if (width <= 0 || height <= 0) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(source, 0, 0)
  return { canvas, ctx, width, height }
}

/** Обрезка белых/светлых полей вокруг плитки на фронтальном фото. */
export function extractLayoutPhotoCrop(
  source: TilePatternSource,
  backgroundThreshold = 210,
): LayoutPhotoCrop | null {
  const prepared = readSourcePixels(source)
  if (!prepared) return null

  const { ctx, width, height } = prepared
  let imageData: ImageData
  try {
    imageData = ctx.getImageData(0, 0, width, height)
  } catch {
    return null
  }

  const { data } = imageData
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (isBackgroundPixel(r, g, b, a, backgroundThreshold)) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (minX >= maxX || minY >= maxY) return null

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const bboxW = maxX - minX + 1
  const bboxH = maxY - minY + 1
  const innerSide = Math.min(bboxW, bboxH) * (1 - 2 * PUZZLE_EDGE_INSET_RATIO)
  minX = Math.round(cx - innerSide / 2)
  maxX = Math.round(cx + innerSide / 2)
  minY = Math.round(cy - innerSide / 2)
  maxY = Math.round(cy + innerSide / 2)

  return {
    sx: minX,
    sy: minY,
    sw: maxX - minX + 1,
    sh: maxY - minY + 1,
  }
}

/** Фронтальное фото без полей — только содержимое плитки. */
export function trimLayoutPhoto(source: HTMLImageElement): HTMLCanvasElement | null {
  const crop = extractLayoutPhotoCrop(source)
  if (!crop) return null

  const canvas = document.createElement('canvas')
  canvas.width = crop.sw
  canvas.height = crop.sh
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh)
  return canvas
}

export function resolveTileImageUrl(url: string): string {
  if (!url.includes('plastfactor.com')) return url

  const useProxy = import.meta.env.DEV || import.meta.env.MODE === 'preview'
  if (!useProxy) return url

  try {
    const { pathname, search } = new URL(url)
    return `/tile-image-proxy${pathname}${search}`
  } catch {
    return url
  }
}

export function getTilePatternSize(source: TilePatternSource): { width: number; height: number } {
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height }
  }
  return {
    width: source.naturalWidth || source.width,
    height: source.naturalHeight || source.height,
  }
}

export function rasterizeCanvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('rasterize failed'))
    img.src = canvas.toDataURL('image/png')
  })
}

/** Размер и смещение фото в мм (подрезки). */
export function getModuleImageLayout(
  moduleWidthMm: number,
  moduleLengthMm: number,
): ModuleImageLayout {
  const extraX = (moduleWidthMm * (LAYOUT_TILE_SNAP - 1)) / 2
  const extraY = (moduleLengthMm * (LAYOUT_TILE_SNAP - 1)) / 2

  return {
    x: -extraX,
    y: -extraY,
    width: moduleWidthMm * LAYOUT_TILE_SNAP,
    height: moduleLengthMm * LAYOUT_TILE_SNAP,
  }
}

export function drawLayoutPhoto(
  ctx: CanvasRenderingContext2D,
  source: TilePatternSource,
  crop: LayoutPhotoCrop,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  snap = LAYOUT_TILE_SNAP,
): void {
  const extraW = destW * (snap - 1)
  const extraH = destH * (snap - 1)
  ctx.drawImage(
    source,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    destX - extraW / 2,
    destY - extraH / 2,
    destW + extraW,
    destH + extraH,
  )
}
