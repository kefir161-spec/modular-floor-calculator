import type { LayoutModule } from '@/shared/types'
import { drawLayoutPhoto, type LayoutPhotoCrop, type TilePatternSource } from './tile-texture'

/**
 * Ограничение холста текстуры пола. Схема на экране не больше ~1000 px,
 * поэтому 2048 px хватает с запасом на экспорт, а память остаётся в пределах
 * 16 МБ. Без ограничения большое помещение давало холст в десятки тысяч
 * пикселей, который браузер уже не рисует.
 */
const MAX_CANVAS_SIDE = 2048
const MAX_CANVAS_PIXELS = MAX_CANVAS_SIDE * MAX_CANVAS_SIDE

export type FloorTiledTextureBounds = {
  x: number
  y: number
  widthMm: number
  heightMm: number
}

export function getFullModulesBounds(modules: LayoutModule[]): FloorTiledTextureBounds | null {
  const full = modules.filter((m) => m.status === 'full')
  if (full.length === 0) return null

  const minX = Math.min(...full.map((m) => m.x))
  const minY = Math.min(...full.map((m) => m.y))
  const maxX = Math.max(...full.map((m) => m.x + m.widthMm))
  const maxY = Math.max(...full.map((m) => m.y + m.lengthMm))

  return {
    x: minX,
    y: minY,
    widthMm: maxX - minX,
    heightMm: maxY - minY,
  }
}

/**
 * Плотность пикселей текстуры пола: натуральная для модуля, но с ограничением
 * по размеру холста — иначе на больших помещениях браузер перестаёт его рисовать.
 */
export function resolveFloorTexturePixelsPerMm(
  cropWidthPx: number,
  moduleWidthMm: number,
  bounds: FloorTiledTextureBounds,
): number {
  const natural = moduleWidthMm > 0 ? cropWidthPx / moduleWidthMm : 1
  const widthMm = Math.max(1, bounds.widthMm)
  const heightMm = Math.max(1, bounds.heightMm)

  const limit = Math.min(
    MAX_CANVAS_SIDE / widthMm,
    MAX_CANVAS_SIDE / heightMm,
    Math.sqrt(MAX_CANVAS_PIXELS / (widthMm * heightMm)),
  )

  return Math.min(natural, limit)
}

export function buildFloorTiledTextureCanvas(
  modules: LayoutModule[],
  tileImage: TilePatternSource,
  crop: LayoutPhotoCrop,
  moduleWidthMm: number,
  bounds: FloorTiledTextureBounds,
): HTMLCanvasElement {
  const full = modules.filter((m) => m.status === 'full')
  const pixelsPerMm = resolveFloorTexturePixelsPerMm(crop.sw, moduleWidthMm, bounds)
  const canvasW = Math.max(1, Math.ceil(bounds.widthMm * pixelsPerMm))
  const canvasH = Math.max(1, Math.ceil(bounds.heightMm * pixelsPerMm))

  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  for (const mod of full) {
    const lx = (mod.x - bounds.x) * pixelsPerMm
    const ly = (mod.y - bounds.y) * pixelsPerMm
    const lw = mod.widthMm * pixelsPerMm
    const lh = mod.lengthMm * pixelsPerMm
    drawLayoutPhoto(ctx, tileImage, crop, lx, ly, lw, lh)
  }

  return canvas
}
