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

/** Внутренняя обрезка светлой пазловой кромки на фронтальном фото. */
const PUZZLE_EDGE_INSET_RATIO = 0.045

export type LayoutPhotoCrop = {
  sx: number
  sy: number
  sw: number
  sh: number
}

export type LayoutPhotoCropOptions = {
  moduleWidthMm?: number
  moduleLengthMm?: number
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
  return { ctx, width, height }
}

/**
 * Обрезка по bbox плитки на фото.
 * Квадратные модули — квадратный crop (как Sensor/Canal), прямоугольные — с пропорциями модуля.
 * Если bbox не найден (светлая плитка / почти белый фон) — центральный crop по всему кадру.
 */
export function extractLayoutPhotoCrop(
  source: TilePatternSource,
  options?: LayoutPhotoCropOptions,
): LayoutPhotoCrop | null {
  const prepared = readSourcePixels(source)
  if (!prepared) return null

  const { ctx, width, height } = prepared
  let imageData: ImageData
  try {
    imageData = ctx.getImageData(0, 0, width, height)
  } catch {
    return buildCenteredCrop(width, height, options)
  }

  const aspect = resolveCropAspect(options)

  const { data } = imageData
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (isBackgroundPixel(data[i], data[i + 1], data[i + 2], data[i + 3], 210)) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (minX >= maxX || minY >= maxY) {
    return buildCenteredCrop(width, height, options)
  }

  return buildAspectCrop((minX + maxX) / 2, (minY + maxY) / 2, maxX - minX + 1, maxY - minY + 1, width, height, aspect)
}

function resolveCropAspect(options?: LayoutPhotoCropOptions): number {
  if (options?.moduleWidthMm && options?.moduleLengthMm && options.moduleLengthMm > 0) {
    return options.moduleWidthMm / options.moduleLengthMm
  }
  return 1
}

function buildCenteredCrop(
  width: number,
  height: number,
  options?: LayoutPhotoCropOptions,
): LayoutPhotoCrop {
  return buildAspectCrop(width / 2, height / 2, width, height, width, height, resolveCropAspect(options))
}

function buildAspectCrop(
  cx: number,
  cy: number,
  bboxW: number,
  bboxH: number,
  frameW: number,
  frameH: number,
  aspect: number,
): LayoutPhotoCrop {
  const inset = 1 - 2 * PUZZLE_EDGE_INSET_RATIO

  let cropW: number
  let cropH: number
  if (Math.abs(aspect - 1) < 0.05) {
    const side = Math.min(bboxW, bboxH) * inset
    cropW = side
    cropH = side
  } else if (bboxW / bboxH > aspect) {
    cropH = bboxH * inset
    cropW = cropH * aspect
  } else {
    cropW = bboxW * inset
    cropH = cropW / aspect
  }

  cropW = Math.min(cropW, frameW)
  cropH = Math.min(cropH, frameH)

  let sx = Math.round(cx - cropW / 2)
  let sy = Math.round(cy - cropH / 2)
  sx = Math.max(0, Math.min(sx, frameW - Math.round(cropW)))
  sy = Math.max(0, Math.min(sy, frameH - Math.round(cropH)))

  return {
    sx,
    sy,
    sw: Math.max(1, Math.round(cropW)),
    sh: Math.max(1, Math.round(cropH)),
  }
}

export function requiresCrossOriginImageLoad(url: string): boolean {
  if (!url || url.startsWith('data:')) return false

  if (typeof window === 'undefined') {
    return !url.startsWith('/')
  }

  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin !== window.location.origin
  } catch {
    return true
  }
}

export function resolveTileImageUrl(url: string): string {
  if (!url.includes('plastfactor.com')) return url

  if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
    try {
      const { pathname, search } = new URL(url)
      return `/tile-image-proxy${pathname}${search}`
    } catch {
      return url
    }
  }

  const proxyMode = import.meta.env.VITE_TILE_IMAGE_PROXY ?? 'wsrv'
  if (proxyMode === 'none' || proxyMode === 'off') {
    return url
  }

  const encoded = encodeURIComponent(url)
  if (proxyMode === 'wsrv') {
    return `https://wsrv.nl/?url=${encoded}&w=1200&output=jpg`
  }

  if (proxyMode.includes('{url}')) {
    return proxyMode.replace('{url}', encoded)
  }

  return `${proxyMode}${encoded}`
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
