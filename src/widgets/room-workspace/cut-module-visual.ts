import type { LayoutModule, Point, Polygon } from '@/shared/types'
import { KONVA_THEME } from '@/shared/config/theme'
import { getModuleImageLayout, type ModuleImageLayout } from '@/shared/lib/tile-texture'

const EDGE_TOL_MM = 1.5

export type ClippedRenderRect = {
  x: number
  y: number
  width: number
  height: number
}

export type CutEdge = { x1: number; y1: number; x2: number; y2: number }

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
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

export function toLocalPolygon(polygon: Polygon, originX: number, originY: number): number[] {
  return polygon.flatMap((p) => [p.x - originX, p.y - originY])
}

function near(a: number, b: number, tol = EDGE_TOL_MM): boolean {
  return Math.abs(a - b) <= tol
}

/** Точка лежит на периметре прямоугольника модуля. */
export function pointOnModulePerimeter(p: Point, mod: LayoutModule, tol = EDGE_TOL_MM): boolean {
  const right = mod.x + mod.widthMm
  const bottom = mod.y + mod.lengthMm
  const inX = p.x >= mod.x - tol && p.x <= right + tol
  const inY = p.y >= mod.y - tol && p.y <= bottom + tol
  if (!inX || !inY) return false
  return (
    near(p.x, mod.x, tol) ||
    near(p.x, right, tol) ||
    near(p.y, mod.y, tol) ||
    near(p.y, bottom, tol)
  )
}

/**
 * Ребро целиком на одной стороне периметра модуля
 * (шов к соседней плитке или край исходного прямоугольника).
 */
export function edgeOnModulePerimeter(
  a: Point,
  b: Point,
  mod: LayoutModule,
  tol = EDGE_TOL_MM,
): boolean {
  if (!pointOnModulePerimeter(a, mod, tol) || !pointOnModulePerimeter(b, mod, tol)) return false
  const right = mod.x + mod.widthMm
  const bottom = mod.y + mod.lengthMm
  const sameLeft = near(a.x, mod.x, tol) && near(b.x, mod.x, tol)
  const sameRight = near(a.x, right, tol) && near(b.x, right, tol)
  const sameTop = near(a.y, mod.y, tol) && near(b.y, mod.y, tol)
  const sameBottom = near(a.y, bottom, tol) && near(b.y, bottom, tol)
  return sameLeft || sameRight || sameTop || sameBottom
}

/**
 * Линии реза: рёбра clipped-полигона, которые идут внутри исходного модуля
 * (не совпадают с его периметром) — реальный рез пилы / границы у препятствия.
 */
export function getSawCutEdges(clipped: Polygon, mod: LayoutModule): CutEdge[] {
  if (clipped.length < 3) return []
  const edges: CutEdge[] = []
  for (let i = 0; i < clipped.length; i++) {
    const a = clipped[i]
    const b = clipped[(i + 1) % clipped.length]
    if (edgeOnModulePerimeter(a, b, mod)) continue
    edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }
  return edges
}

/**
 * Рёбра контура подрезки для AABB-полосы (регресс старых тестов / полоски у стены).
 * Не рисуем сторону, примыкающую к целой плитке (внутренний шов).
 */
export function getCutOutlineEdges(
  mod: LayoutModule,
  rect: ClippedRenderRect,
): CutEdge[] {
  const edges: CutEdge[] = []
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

  if (clippedLeft) edges.push({ x1: 0, y1: 0, x2: 0, y2: h })
  if (clippedRight) edges.push({ x1: w, y1: 0, x2: w, y2: h })
  if (clippedTop) edges.push({ x1: 0, y1: 0, x2: w, y2: 0 })
  if (clippedBottom) edges.push({ x1: 0, y1: h, x2: w, y2: h })

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

function getHatchLines(
  width: number,
  height: number,
  step = 28,
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  if (width <= 0 || height <= 0 || step <= 0) return []
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []

  for (let c = 0; c <= width + height; c += step) {
    const pts: Point[] = []
    // диагональ x + y = c
    if (c >= 0 && c <= height) pts.push({ x: 0, y: c })
    if (c - width >= 0 && c - width <= height) pts.push({ x: width, y: c - width })
    if (c >= 0 && c <= width) pts.push({ x: c, y: 0 })
    if (c - height >= 0 && c - height <= width) pts.push({ x: c - height, y: height })

    const uniq: Point[] = []
    for (const p of pts) {
      if (!uniq.some((q) => near(q.x, p.x, 0.5) && near(q.y, p.y, 0.5))) uniq.push(p)
    }
    if (uniq.length >= 2) {
      lines.push({ x1: uniq[0].x, y1: uniq[0].y, x2: uniq[1].x, y2: uniq[1].y })
    }
  }
  return lines
}

export { getHatchLines }

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
  remnantFill: 'rgba(71, 84, 103, 0.14)',
  remnantStroke: 'rgba(71, 84, 103, 0.45)',
  strokeWidth: 2,
  remnantStrokeWidth: 1,
  dash: [7, 4] as [number, number],
  remnantDash: [3, 4] as [number, number],
  hatchStepMm: 32,
  hatchOpacity: 0.85,
} as const
