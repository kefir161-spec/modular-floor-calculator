import type { Point, Polygon } from '@/shared/types'

const EPS = 1e-6

export function createRectanglePolygon(widthMm: number, lengthMm: number): Polygon {
  return [
    { x: 0, y: 0 },
    { x: widthMm, y: 0 },
    { x: widthMm, y: lengthMm },
    { x: 0, y: lengthMm },
  ]
}

export function createLShapePolygon(outerW: number, outerH: number, innerW: number, innerH: number): Polygon {
  const cutH = outerH - innerH
  return [
    { x: 0, y: 0 },
    { x: outerW, y: 0 },
    { x: outerW, y: cutH },
    { x: innerW, y: cutH },
    { x: innerW, y: outerH },
    { x: 0, y: outerH },
  ]
}

export function createUShapePolygon(
  outerW: number,
  outerH: number,
  _innerW: number,
  innerH: number,
  legWidth: number,
): Polygon {
  const topH = outerH - innerH
  return [
    { x: 0, y: 0 },
    { x: outerW, y: 0 },
    { x: outerW, y: outerH },
    { x: outerW - legWidth, y: outerH },
    { x: outerW - legWidth, y: topH },
    { x: legWidth, y: topH },
    { x: legWidth, y: outerH },
    { x: 0, y: outerH },
  ]
}

export function createNichePolygon(
  outerW: number,
  outerH: number,
  nicheW: number,
  nicheH: number,
  nicheX: number,
): Polygon {
  return [
    { x: 0, y: 0 },
    { x: outerW, y: 0 },
    { x: outerW, y: outerH },
    { x: nicheX + nicheW, y: outerH },
    { x: nicheX + nicheW, y: outerH - nicheH },
    { x: nicheX, y: outerH - nicheH },
    { x: nicheX, y: outerH },
    { x: 0, y: outerH },
  ]
}

export function polygonArea(polygon: Polygon): number {
  if (polygon.length < 3) return 0
  let sum = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    sum += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y
  }
  return Math.abs(sum) / 2
}

export function polygonAreaSqm(polygon: Polygon): number {
  return polygonArea(polygon) / 1_000_000
}

export function getBoundingBox(polygon: Polygon) {
  const xs = polygon.map((p) => p.x)
  const ys = polygon.map((p) => p.y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

function orientation(a: Point, b: Point, c: Point): number {
  const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
  if (Math.abs(val) < EPS) return 0
  return val > 0 ? 1 : 2
}

function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    b.x <= Math.max(a.x, c.x) + EPS &&
    b.x + EPS >= Math.min(a.x, c.x) &&
    b.y <= Math.max(a.y, c.y) + EPS &&
    b.y + EPS >= Math.min(a.y, c.y)
  )
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const o1 = orientation(p1, p2, p3)
  const o2 = orientation(p1, p2, p4)
  const o3 = orientation(p3, p4, p1)
  const o4 = orientation(p3, p4, p2)

  if (o1 !== o2 && o3 !== o4) return true
  if (o1 === 0 && onSegment(p1, p3, p2)) return true
  if (o2 === 0 && onSegment(p1, p4, p2)) return true
  if (o3 === 0 && onSegment(p3, p1, p4)) return true
  if (o4 === 0 && onSegment(p3, p2, p4)) return true
  return false
}

export function hasSelfIntersection(polygon: Polygon): boolean {
  const n = polygon.length
  if (n < 4) return false

  for (let i = 0; i < n; i++) {
    const a1 = polygon[i]
    const a2 = polygon[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue
      const b1 = polygon[j]
      const b2 = polygon[(j + 1) % n]
      if (segmentsIntersect(a1, a2, b1, b2)) return true
    }
  }
  return false
}

export function isPolygonValid(polygon: Polygon): boolean {
  return polygon.length >= 3 && polygonArea(polygon) > EPS && !hasSelfIntersection(polygon)
}

export function edgeLength(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y)
}

export function getEdgeLengths(polygon: Polygon): number[] {
  const lengths: number[] = []
  for (let i = 0; i < polygon.length; i++) {
    lengths.push(edgeLength(polygon[i], polygon[(i + 1) % polygon.length]))
  }
  return lengths
}

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y)
  if (len < EPS) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function inwardNormal(p1: Point, p2: Point, polygon: Polygon): Point {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const n1 = normalize({ x: -dy, y: dx })
  const n2 = normalize({ x: dy, y: -dx })
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  const test1 = { x: mid.x + n1.x, y: mid.y + n1.y }
  const inside1 = pointInPolygon(test1, polygon)
  return inside1 ? n1 : n2
}

function lineIntersection(
  p1: Point,
  d1: Point,
  p2: Point,
  d2: Point,
): Point | null {
  const det = d1.x * d2.y - d1.y * d2.x
  if (Math.abs(det) < EPS) return null
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const t = (dx * d2.y - dy * d2.x) / det
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y }
}

export type OffsetResult =
  | { success: true; polygon: Polygon }
  | { success: false; reason: string }

function outwardNormal(p1: Point, p2: Point, polygon: Polygon): Point {
  const inward = inwardNormal(p1, p2, polygon)
  return { x: -inward.x, y: -inward.y }
}

export function offsetPolygonOutward(polygon: Polygon, distanceMm: number): OffsetResult {
  if (distanceMm <= 0) return { success: true, polygon: [...polygon] }
  if (!isPolygonValid(polygon)) return { success: false, reason: 'Исходный контур невалиден' }
  if (polygon.length < 3) return { success: false, reason: 'Недостаточно вершин' }

  const n = polygon.length
  const offsetLines: { point: Point; direction: Point }[] = []

  for (let i = 0; i < n; i++) {
    const p1 = polygon[i]
    const p2 = polygon[(i + 1) % n]
    const normal = outwardNormal(p1, p2, polygon)
    const shiftedP1 = {
      x: p1.x + normal.x * distanceMm,
      y: p1.y + normal.y * distanceMm,
    }
    const direction = normalize({ x: p2.x - p1.x, y: p2.y - p1.y })
    offsetLines.push({ point: shiftedP1, direction })
  }

  const result: Polygon = []
  for (let i = 0; i < n; i++) {
    const l1 = offsetLines[i]
    const l2 = offsetLines[(i + 1) % n]
    const intersection = lineIntersection(l1.point, l1.direction, l2.point, l2.direction)
    if (!intersection) {
      return { success: false, reason: 'Не удалось построить внешний контур зазора' }
    }
    result.push(intersection)
  }

  if (polygonArea(result) < EPS) {
    return { success: false, reason: 'Зазор слишком велик для данной формы помещения' }
  }
  if (hasSelfIntersection(result)) {
    return { success: false, reason: 'Внешний offset привёл к самопересечению контура' }
  }

  return { success: true, polygon: result }
}

export function offsetPolygonInward(polygon: Polygon, distanceMm: number): OffsetResult {
  if (distanceMm <= 0) return { success: true, polygon: [...polygon] }
  if (!isPolygonValid(polygon)) return { success: false, reason: 'Исходный контур невалиден' }
  if (polygon.length < 3) return { success: false, reason: 'Недостаточно вершин' }

  const n = polygon.length
  const offsetLines: { point: Point; direction: Point }[] = []

  for (let i = 0; i < n; i++) {
    const p1 = polygon[i]
    const p2 = polygon[(i + 1) % n]
    const normal = inwardNormal(p1, p2, polygon)
    const shiftedP1 = {
      x: p1.x + normal.x * distanceMm,
      y: p1.y + normal.y * distanceMm,
    }
    const direction = normalize({ x: p2.x - p1.x, y: p2.y - p1.y })
    offsetLines.push({ point: shiftedP1, direction })
  }

  const result: Polygon = []
  for (let i = 0; i < n; i++) {
    const l1 = offsetLines[i]
    const l2 = offsetLines[(i + 1) % n]
    const intersection = lineIntersection(l1.point, l1.direction, l2.point, l2.direction)
    if (!intersection) {
      return { success: false, reason: 'Не удалось построить технологический зазор для данной формы' }
    }
    result.push(intersection)
  }

  if (polygonArea(result) < EPS) {
    return { success: false, reason: 'Зазор слишком велик для данной формы помещения' }
  }
  if (hasSelfIntersection(result)) {
    return { success: false, reason: 'Offset привёл к самопересечению контура' }
  }

  return { success: true, polygon: result }
}

export function pointInPolygon(point: Point, polygon: Polygon): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + EPS) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function rotateModuleDimensions(
  widthMm: number,
  lengthMm: number,
  rotation: 0 | 90,
): { widthMm: number; lengthMm: number } {
  if (rotation === 0) return { widthMm, lengthMm }
  return { widthMm: lengthMm, lengthMm: widthMm }
}

export function mmToM(mm: number): number {
  return mm / 1000
}

export function mToMm(m: number): number {
  return m * 1000
}

export function formatLength(mm: number, unit: 'mm' | 'm'): string {
  if (unit === 'm') return `${(mm / 1000).toFixed(2)} м`
  return `${Math.round(mm)} мм`
}

export function formatArea(sqm: number): string {
  return `${sqm.toFixed(2)} м²`
}
