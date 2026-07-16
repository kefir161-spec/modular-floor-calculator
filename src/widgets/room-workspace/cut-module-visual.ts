import type { LayoutModule, Polygon } from '@/shared/types'
import { KONVA_THEME } from '@/shared/config/theme'
import { getModuleImageLayout, type ModuleImageLayout } from '@/shared/lib/tile-texture'

const EDGE_TOL_MM = 1

export type ClippedRenderRect = {
  x: number
  y: number
  width: number
  height: number
}

export function getClippedRenderRect(clipped: Polygon): ClippedRenderRect {
  const xs = clipped.map((p) => p.x)
  const ys = clipped.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function toLocalPolygon(polygon: Polygon, originX: number, originY: number): number[] {
  return polygon.flatMap((p) => [p.x - originX, p.y - originY])
}

/**
 * Рёбра контура подрезки — отдельные отрезки, без диагоналей между гранями.
 * Не рисуем сторону, примыкающую к целой плитке (внутренний шов).
 */
export function getCutOutlineEdges(
  mod: LayoutModule,
  rect: ClippedRenderRect,
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const { x, y, width, height } = rect
  const right = x + width
  const bottom = y + height
  const modRight = mod.x + mod.widthMm
  const modBottom = mod.y + mod.lengthMm

  const clippedLeft = x > mod.x + EDGE_TOL_MM
  const clippedRight = right < modRight - EDGE_TOL_MM
  const clippedTop = y > mod.y + EDGE_TOL_MM
  const clippedBottom = bottom < modBottom - EDGE_TOL_MM

  const w = width
  const h = height

  if (clippedLeft) {
    edges.push({ x1: 0, y1: 0, x2: 0, y2: h })
  }
  if (clippedRight) {
    edges.push({ x1: w, y1: 0, x2: w, y2: h })
  }
  if (clippedTop) {
    edges.push({ x1: 0, y1: 0, x2: w, y2: 0 })
  }
  if (clippedBottom) {
    edges.push({ x1: 0, y1: h, x2: w, y2: h })
  }

  if (edges.length === 0) {
    edges.push(
      { x1: 0, y1: 0, x2: w, y2: 0 },
      { x1: w, y1: 0, x2: w, y2: h },
      { x1: w, y1: h, x2: 0, y2: h },
      { x1: 0, y1: h, x2: 0, y2: 0 },
    )
  }

  return edges
}

export function getCutModuleImageLayout(
  mod: LayoutModule,
  renderRect: ClippedRenderRect,
): ModuleImageLayout {
  const layout = getModuleImageLayout(mod.widthMm, mod.lengthMm)
  const shiftX = mod.x - renderRect.x
  const shiftY = mod.y - renderRect.y

  return {
    x: layout.x + shiftX,
    y: layout.y + shiftY,
    width: layout.width,
    height: layout.height,
  }
}

export const CUT_VISUAL = {
  stroke: KONVA_THEME.moduleCut,
  hatch: KONVA_THEME.cutHatch,
  strokeWidth: 1.75,
  dash: [6, 4] as [number, number],
  hatchOpacity: 0.35,
} as const
