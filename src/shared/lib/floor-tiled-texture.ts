import type { LayoutModule } from '@/shared/types'
import { drawLayoutPhoto, getTilePatternSize, type LayoutPhotoCrop, type TilePatternSource } from './tile-texture'

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

export function buildFloorTiledTextureCanvas(
  modules: LayoutModule[],
  tileImage: TilePatternSource,
  crop: LayoutPhotoCrop,
  moduleWidthMm: number,
  bounds: FloorTiledTextureBounds,
): HTMLCanvasElement {
  const full = modules.filter((m) => m.status === 'full')
  const { width: srcW } = getTilePatternSize(tileImage)
  const pixelsPerMm = srcW / moduleWidthMm
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
