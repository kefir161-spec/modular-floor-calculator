import {
  buildCenteredCrop,
  buildTileCrop,
  fitAspectRect,
  fromNormalizedRect,
  type CropRect,
  type NormalizedRect,
} from './tile-crop'

/** Для Konva.Image — фронтальное фото модуля (после обрезки полей). */
export type TilePatternSource = HTMLImageElement | HTMLCanvasElement

export type ModuleImageLayout = {
  x: number
  y: number
  width: number
  height: number
}

/** Перекрытие соседних модулей: гасит субпиксельные швы при масштабировании. */
export const LAYOUT_TILE_SNAP = 1.01

/** Область фото, которая укладывается на пол. */
export type LayoutPhotoCrop = CropRect

export type LayoutPhotoCropOptions = {
  moduleWidthMm?: number
  moduleLengthMm?: number
}

export function resolveModuleAspect(options?: LayoutPhotoCropOptions): number {
  if (options?.moduleWidthMm && options?.moduleLengthMm && options.moduleLengthMm > 0) {
    return options.moduleWidthMm / options.moduleLengthMm
  }
  return 1
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

/** Пересчитывает предрасчитанную область под размер загруженного фото. */
export function resolveStoredCrop(
  source: TilePatternSource,
  stored: NormalizedRect,
  options?: LayoutPhotoCropOptions,
): LayoutPhotoCrop | null {
  const { width, height } = getTilePatternSize(source)
  if (width <= 0 || height <= 0) return null
  return fitAspectRect(fromNormalizedRect(stored, width, height), resolveModuleAspect(options))
}

/**
 * Область фото по пикселям — запас для вариантов без предрасчёта
 * (новые товары в фиде, фото из каталога вместо фронтали).
 */
export function extractLayoutPhotoCrop(
  source: TilePatternSource,
  options?: LayoutPhotoCropOptions,
): LayoutPhotoCrop | null {
  const { width, height } = getTilePatternSize(source)
  if (width <= 0 || height <= 0) return null

  const aspect = resolveModuleAspect(options)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return buildCenteredCrop(width, height, aspect)

  ctx.drawImage(source, 0, 0)
  try {
    const { data } = ctx.getImageData(0, 0, width, height)
    return buildTileCrop({ data, width, height }, aspect)
  } catch {
    // фото с другого домена без CORS — пиксели недоступны
    return buildCenteredCrop(width, height, aspect)
  }
}

/** Размер и смещение фото в мм с перекрытием соседей. */
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
