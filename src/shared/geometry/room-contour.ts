import type { Point, Polygon, RoomShapePreset, RoomShapeType } from '@/shared/types'
import { getBoundingBox, getEdgeLengths, isPolygonValid } from '@/shared/geometry/polygon'

const AXIS_EPS = 0.5
const ANGLE_EPS = 0.05

export type LShapeParams = {
  outerW: number
  outerH: number
  innerW: number
  innerH: number
}

export type UShapeParams = {
  outerW: number
  outerH: number
  leftLeg: number
  rightLeg: number
  openingHeight: number
}

export type NicheParams = {
  outerW: number
  outerH: number
  nicheW: number
  nicheH: number
  nicheX: number
}

export function isAxisAligned(polygon: Polygon): boolean {
  if (polygon.length < 3) return false
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const horiz = Math.abs(a.y - b.y) <= AXIS_EPS
    const vert = Math.abs(a.x - b.x) <= AXIS_EPS
    if (!horiz && !vert) return false
  }
  return true
}

export function vertexInteriorDeg(prev: Point, curr: Point, next: Point): number {
  const inX = curr.x - prev.x
  const inY = curr.y - prev.y
  const outX = next.x - curr.x
  const outY = next.y - curr.y
  const turn = Math.atan2(inX * outY - inY * outX, inX * outX + inY * outY)
  const deg = ((Math.PI - turn) * 180) / Math.PI
  return ((deg % 360) + 360) % 360
}

export function interiorAnglesDeg(polygon: Polygon): number[] {
  const n = polygon.length
  return polygon.map((curr, i) =>
    vertexInteriorDeg(polygon[(i - 1 + n) % n], curr, polygon[(i + 1) % n]),
  )
}

export function formatAngleDeg(deg: number): string {
  const rounded = Math.round(deg * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}°` : `${rounded.toFixed(1)}°`
}

function uniqueSorted(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const out: number[] = []
  for (const v of sorted) {
    if (out.length === 0 || Math.abs(out[out.length - 1] - v) > AXIS_EPS) out.push(v)
  }
  return out
}

function replaceCoords(
  polygon: Polygon,
  replacements: { axis: 'x' | 'y'; from: number; to: number }[],
): Polygon {
  return polygon.map((p) => {
    let { x, y } = p
    for (const r of replacements) {
      if (r.axis === 'x' && Math.abs(p.x - r.from) <= AXIS_EPS) x = r.to
      if (r.axis === 'y' && Math.abs(p.y - r.from) <= AXIS_EPS) y = r.to
    }
    return { x, y }
  })
}

function findInteriorVertex(polygon: Polygon): Point | null {
  const box = getBoundingBox(polygon)
  const found = polygon.find(
    (p) =>
      p.x > box.minX + AXIS_EPS &&
      p.x < box.maxX - AXIS_EPS &&
      p.y > box.minY + AXIS_EPS &&
      p.y < box.maxY - AXIS_EPS,
  )
  return found ?? null
}

/**
 * Сдвиг целой стены: все вершины на линии конца ребра едут вместе.
 * Прямые углы ортогонального контура сохраняются.
 */
export function setOrthogonalEdgeLength(
  polygon: Polygon,
  edgeIndex: number,
  lengthMm: number,
): Polygon | null {
  if (lengthMm <= 0 || !isAxisAligned(polygon)) return null
  const n = polygon.length
  const i = ((edgeIndex % n) + n) % n
  const a = polygon[i]
  const b = polygon[(i + 1) % n]
  const horiz = Math.abs(a.y - b.y) <= AXIS_EPS
  const vert = Math.abs(a.x - b.x) <= AXIS_EPS
  if (horiz === vert) return null

  const next = polygon.map((p) => ({ ...p }))
  if (horiz) {
    const dir = Math.sign(b.x - a.x) || 1
    const delta = a.x + dir * lengthMm - b.x
    if (Math.abs(delta) < 1e-9) return next
    for (let k = 0; k < n; k++) {
      if (Math.abs(polygon[k].x - b.x) <= AXIS_EPS) next[k].x += delta
    }
  } else {
    const dir = Math.sign(b.y - a.y) || 1
    const delta = a.y + dir * lengthMm - b.y
    if (Math.abs(delta) < 1e-9) return next
    for (let k = 0; k < n; k++) {
      if (Math.abs(polygon[k].y - b.y) <= AXIS_EPS) next[k].y += delta
    }
  }
  return isPolygonValid(next) ? next : null
}

function walkFrom(
  polygon: Polygon,
  startIndex: number,
  lengths: number[],
  angles: number[],
): Polygon | null {
  const n = polygon.length
  if (n < 3 || lengths.length !== n || angles.length !== n) return null
  const start = polygon[startIndex]
  const ahead = polygon[(startIndex + 1) % n]
  let heading = Math.atan2(ahead.y - start.y, ahead.x - start.x)
  const pts: Point[] = [{ ...start }]

  for (let k = 0; k < n - 1; k++) {
    const ei = (startIndex + k) % n
    pts.push({
      x: pts[k].x + Math.cos(heading) * lengths[ei],
      y: pts[k].y + Math.sin(heading) * lengths[ei],
    })
    if (k < n - 2) {
      const vertex = (startIndex + k + 1) % n
      heading += Math.PI - (angles[vertex] * Math.PI) / 180
    }
  }

  const rotated: Polygon = new Array(n)
  for (let k = 0; k < n; k++) {
    rotated[(startIndex + k) % n] = pts[k]
  }
  return isPolygonValid(rotated) ? rotated : null
}

/** Длина ребра при сохранении всех внутренних углов. Замыкающая сторона пересчитывается. */
export function setEdgeLengthKeepingAngles(
  polygon: Polygon,
  edgeIndex: number,
  lengthMm: number,
): Polygon | null {
  if (lengthMm <= 0 || polygon.length < 3) return null
  const lengths = getEdgeLengths(polygon)
  const i = ((edgeIndex % polygon.length) + polygon.length) % polygon.length
  lengths[i] = lengthMm
  return walkFrom(polygon, i, lengths, interiorAnglesDeg(polygon))
}

export function setInteriorAngle(
  polygon: Polygon,
  vertexIndex: number,
  angleDeg: number,
): Polygon | null {
  if (angleDeg <= 0 || angleDeg >= 360 || polygon.length < 3) return null
  const n = polygon.length
  const i = ((vertexIndex % n) + n) % n
  const angles = interiorAnglesDeg(polygon)
  if (Math.abs(angles[i] - angleDeg) <= ANGLE_EPS) return polygon.map((p) => ({ ...p }))
  angles[i] = angleDeg
  return walkFrom(polygon, (i - 1 + n) % n, getEdgeLengths(polygon), angles)
}

export function setRoomEdgeLength(
  polygon: Polygon,
  edgeIndex: number,
  lengthMm: number,
): Polygon | null {
  if (isAxisAligned(polygon)) return setOrthogonalEdgeLength(polygon, edgeIndex, lengthMm)
  return setEdgeLengthKeepingAngles(polygon, edgeIndex, lengthMm)
}

export function extractLParams(polygon: Polygon): LShapeParams | null {
  if (polygon.length !== 6 || !isAxisAligned(polygon)) return null
  const inner = findInteriorVertex(polygon)
  if (!inner) return null
  const box = getBoundingBox(polygon)
  const outerW = box.maxX - box.minX
  const outerH = box.maxY - box.minY
  const innerW = inner.x - box.minX
  const cutH = inner.y - box.minY
  const innerH = outerH - cutH
  if (innerW <= AXIS_EPS || innerH <= AXIS_EPS || innerW >= outerW - AXIS_EPS || innerH >= outerH - AXIS_EPS) {
    return null
  }
  return { outerW, outerH, innerW, innerH }
}

export function applyLParams(polygon: Polygon, patch: Partial<LShapeParams>): Polygon | null {
  const cur = extractLParams(polygon)
  if (!cur) return null
  const next = { ...cur, ...patch }
  if (
    next.outerW <= AXIS_EPS ||
    next.outerH <= AXIS_EPS ||
    next.innerW <= AXIS_EPS ||
    next.innerH <= AXIS_EPS ||
    next.innerW >= next.outerW - AXIS_EPS ||
    next.innerH >= next.outerH - AXIS_EPS
  ) {
    return null
  }
  const box = getBoundingBox(polygon)
  const inner = findInteriorVertex(polygon)
  if (!inner) return null
  const result = replaceCoords(polygon, [
    { axis: 'x', from: box.maxX, to: box.minX + next.outerW },
    { axis: 'y', from: box.maxY, to: box.minY + next.outerH },
    { axis: 'x', from: inner.x, to: box.minX + next.innerW },
    { axis: 'y', from: inner.y, to: box.minY + (next.outerH - next.innerH) },
  ])
  return isPolygonValid(result) ? result : null
}

function uniqueAxes(polygon: Polygon): { xs: number[]; ys: number[] } | null {
  if (!isAxisAligned(polygon)) return null
  const xs = uniqueSorted(polygon.map((p) => p.x))
  const ys = uniqueSorted(polygon.map((p) => p.y))
  return { xs, ys }
}

export function extractUParams(polygon: Polygon): UShapeParams | null {
  if (polygon.length !== 8) return null
  const axes = uniqueAxes(polygon)
  if (!axes || axes.xs.length !== 4 || axes.ys.length !== 3) return null
  const { xs, ys } = axes
  const leftLeg = xs[1] - xs[0]
  const rightLeg = xs[3] - xs[2]
  const openingHeight = ys[2] - ys[1]
  if (leftLeg <= AXIS_EPS || rightLeg <= AXIS_EPS || openingHeight <= AXIS_EPS) return null
  if (leftLeg + rightLeg >= xs[3] - xs[0] - AXIS_EPS) return null
  return {
    outerW: xs[3] - xs[0],
    outerH: ys[2] - ys[0],
    leftLeg,
    rightLeg,
    openingHeight,
  }
}

export function applyUParams(polygon: Polygon, patch: Partial<UShapeParams>): Polygon | null {
  const cur = extractUParams(polygon)
  if (!cur) return null
  const next = { ...cur, ...patch }
  if (
    next.outerW <= AXIS_EPS ||
    next.outerH <= AXIS_EPS ||
    next.leftLeg <= AXIS_EPS ||
    next.rightLeg <= AXIS_EPS ||
    next.openingHeight <= AXIS_EPS ||
    next.leftLeg + next.rightLeg >= next.outerW - AXIS_EPS ||
    next.openingHeight >= next.outerH - AXIS_EPS
  ) {
    return null
  }
  const axes = uniqueAxes(polygon)
  if (!axes) return null
  const { xs, ys } = axes
  const result = replaceCoords(polygon, [
    { axis: 'x', from: xs[3], to: xs[0] + next.outerW },
    { axis: 'y', from: ys[2], to: ys[0] + next.outerH },
    { axis: 'x', from: xs[1], to: xs[0] + next.leftLeg },
    { axis: 'x', from: xs[2], to: xs[0] + next.outerW - next.rightLeg },
    { axis: 'y', from: ys[1], to: ys[0] + next.outerH - next.openingHeight },
  ])
  return isPolygonValid(result) ? result : null
}

export function extractNicheParams(polygon: Polygon): NicheParams | null {
  if (polygon.length !== 8) return null
  const axes = uniqueAxes(polygon)
  if (!axes || axes.xs.length !== 4 || axes.ys.length !== 3) return null
  const { xs, ys } = axes
  const nicheX = xs[1] - xs[0]
  const nicheW = xs[2] - xs[1]
  const nicheH = ys[2] - ys[1]
  if (nicheX <= AXIS_EPS || nicheW <= AXIS_EPS || nicheH <= AXIS_EPS) return null
  if (nicheX + nicheW >= xs[3] - xs[0] - AXIS_EPS) return null
  return {
    outerW: xs[3] - xs[0],
    outerH: ys[2] - ys[0],
    nicheW,
    nicheH,
    nicheX,
  }
}

export function applyNicheParams(polygon: Polygon, patch: Partial<NicheParams>): Polygon | null {
  const cur = extractNicheParams(polygon)
  if (!cur) return null
  const next = { ...cur, ...patch }
  if (
    next.outerW <= AXIS_EPS ||
    next.outerH <= AXIS_EPS ||
    next.nicheW <= AXIS_EPS ||
    next.nicheH <= AXIS_EPS ||
    next.nicheX <= AXIS_EPS ||
    next.nicheX + next.nicheW >= next.outerW - AXIS_EPS ||
    next.nicheH >= next.outerH - AXIS_EPS
  ) {
    return null
  }
  const axes = uniqueAxes(polygon)
  if (!axes) return null
  const { xs, ys } = axes
  const result = replaceCoords(polygon, [
    { axis: 'x', from: xs[3], to: xs[0] + next.outerW },
    { axis: 'y', from: ys[2], to: ys[0] + next.outerH },
    { axis: 'x', from: xs[1], to: xs[0] + next.nicheX },
    { axis: 'x', from: xs[2], to: xs[0] + next.nicheX + next.nicheW },
    { axis: 'y', from: ys[1], to: ys[0] + next.outerH - next.nicheH },
  ])
  return isPolygonValid(result) ? result : null
}

export function inferShapePreset(
  contour: Polygon,
  shapeType?: RoomShapeType,
  hint?: RoomShapePreset,
): RoomShapePreset {
  if (shapeType === 'rectangle' && contour.length === 4) return 'rectangle'
  if (hint === 'l' && extractLParams(contour)) return 'l'
  if (hint === 'u' && extractUParams(contour)) return 'u'
  if (hint === 'niche' && extractNicheParams(contour)) return 'niche'
  if (hint === 'rectangle' && contour.length === 4 && isAxisAligned(contour)) return 'rectangle'
  if (contour.length === 4 && isAxisAligned(contour)) return 'rectangle'
  if (extractLParams(contour)) return 'l'
  if (hint === 'custom') return 'custom'
  const u = extractUParams(contour)
  const niche = extractNicheParams(contour)
  if (u && niche) {
    if (hint === 'niche' || hint === 'u') return hint
    const opening = niche.nicheW
    const side = Math.max(u.leftLeg, u.rightLeg)
    return opening >= side ? 'u' : 'niche'
  }
  if (u) return 'u'
  if (niche) return 'niche'
  return 'custom'
}
