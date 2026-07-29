import type { Point, Polygon } from '@/shared/types'
import { edgeLength, isPolygonValid } from '@/shared/geometry/polygon'

/** Вставить вершину в середину ребра `edgeIndex` (между i и i+1). */
export function insertVertexOnEdge(polygon: Polygon, edgeIndex: number, point?: Point): Polygon {
  if (polygon.length < 3) return polygon
  const i = ((edgeIndex % polygon.length) + polygon.length) % polygon.length
  const a = polygon[i]
  const b = polygon[(i + 1) % polygon.length]
  const mid = point ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  return [...polygon.slice(0, i + 1), mid, ...polygon.slice(i + 1)]
}

/** Удалить вершину (минимум 3 вершины). */
export function removeVertex(polygon: Polygon, vertexIndex: number): Polygon | null {
  if (polygon.length <= 3) return null
  const i = ((vertexIndex % polygon.length) + polygon.length) % polygon.length
  const next = polygon.filter((_, idx) => idx !== i)
  return isPolygonValid(next) ? next : null
}

/**
 * Привязка точки к ортогонали относительно якоря (горизонт/вертикаль — что ближе).
 */
export function snapPointOrtho(anchor: Point, point: Point): Point {
  const dx = Math.abs(point.x - anchor.x)
  const dy = Math.abs(point.y - anchor.y)
  if (dx >= dy) return { x: point.x, y: anchor.y }
  return { x: anchor.x, y: point.y }
}

/**
 * Snap к сетке (мм). step=0 — без сетки.
 */
export function snapPointToGrid(point: Point, stepMm: number): Point {
  if (stepMm <= 0) return point
  return {
    x: Math.round(point.x / stepMm) * stepMm,
    y: Math.round(point.y / stepMm) * stepMm,
  }
}

/**
 * При перетаскивании вершины: ortho к соседям + опциональная сетка.
 */
export function snapVertexDrag(
  polygon: Polygon,
  vertexIndex: number,
  raw: Point,
  options: { ortho?: boolean; gridMm?: number } = {},
): Point {
  const n = polygon.length
  if (n < 3) return raw
  const i = ((vertexIndex % n) + n) % n
  let next = raw

  if (options.ortho) {
    const prev = polygon[(i - 1 + n) % n]
    const following = polygon[(i + 1) % n]
    const toPrev = snapPointOrtho(prev, raw)
    const toNext = snapPointOrtho(following, raw)
    const errPrev = Math.hypot(toPrev.x - raw.x, toPrev.y - raw.y)
    const errNext = Math.hypot(toNext.x - raw.x, toNext.y - raw.y)
    next = errPrev <= errNext ? toPrev : toNext
  }

  if (options.gridMm && options.gridMm > 0) {
    next = snapPointToGrid(next, options.gridMm)
  }
  return next
}

/** Точка на ребре по параметру t∈[0..1]. */
export function pointOnEdge(polygon: Polygon, edgeIndex: number, t: number): Point {
  const i = ((edgeIndex % polygon.length) + polygon.length) % polygon.length
  const a = polygon[i]
  const b = polygon[(i + 1) % polygon.length]
  const u = Math.min(1, Math.max(0, t))
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }
}

export function edgeUnitVector(polygon: Polygon, edgeIndex: number): Point {
  const i = ((edgeIndex % polygon.length) + polygon.length) % polygon.length
  const a = polygon[i]
  const b = polygon[(i + 1) % polygon.length]
  const len = edgeLength(a, b) || 1
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
}
