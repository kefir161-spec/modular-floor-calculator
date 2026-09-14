import type { Polygon } from '@/shared/types'
import {
  createRectanglePolygon,
  getBoundingBox,
  isPolygonValid,
  offsetPolygonOutward,
} from '@/shared/geometry/polygon'
import { isAxisAligned } from '@/shared/geometry/room-contour'

/** Допуск на «уже кратно модулю»: меньше половины миллиметра не считаем обрезком. */
const EPS_MM = 0.5

export type EdgingFitDirection = 'down' | 'up'

export type EdgingFitProposal = {
  direction: EdgingFitDirection
  roomPolygon: Polygon
  workingPolygon: Polygon
  roomWidthMm: number
  roomLengthMm: number
  workingWidthMm: number
  workingHeightMm: number
  tilesX: number
  tilesY: number
}

export type EdgingFitOptions = {
  aligned: boolean
  orthogonal: boolean
  down: EdgingFitProposal | null
  up: EdgingFitProposal | null
}

function uniqueSorted(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const out: number[] = []
  for (const v of sorted) {
    if (out.length === 0 || Math.abs(out[out.length - 1]! - v) > EPS_MM) out.push(v)
  }
  return out
}

export function spanRemainder(sizeMm: number, moduleMm: number): number {
  if (moduleMm <= 0) return sizeMm
  const r = ((sizeMm % moduleMm) + moduleMm) % moduleMm
  if (r < EPS_MM || moduleMm - r < EPS_MM) return 0
  return r
}

export function isWorkingFieldModuleAligned(
  workingPolygon: Polygon,
  moduleWidthMm: number,
  moduleLengthMm: number,
): boolean {
  if (!isAxisAligned(workingPolygon)) return false
  const xs = uniqueSorted(workingPolygon.map((p) => p.x))
  const ys = uniqueSorted(workingPolygon.map((p) => p.y))
  if (xs.length < 2 || ys.length < 2) return false
  for (let i = 1; i < xs.length; i++) {
    if (spanRemainder(xs[i]! - xs[i - 1]!, moduleWidthMm) !== 0) return false
  }
  for (let i = 1; i < ys.length; i++) {
    if (spanRemainder(ys[i]! - ys[i - 1]!, moduleLengthMm) !== 0) return false
  }
  return true
}

function snapCount(sizeMm: number, moduleMm: number, direction: EdgingFitDirection): number | null {
  if (moduleMm <= 0 || sizeMm <= 0) return null
  if (spanRemainder(sizeMm, moduleMm) === 0) {
    const count = Math.round(sizeMm / moduleMm)
    return count >= 1 ? count : null
  }
  if (direction === 'down') {
    const count = Math.floor((sizeMm + EPS_MM) / moduleMm)
    return count >= 1 ? count : null
  }
  const count = Math.ceil((sizeMm - EPS_MM) / moduleMm)
  return count >= 1 ? count : null
}

function snapUniqueCoords(
  coords: number[],
  moduleMm: number,
  direction: EdgingFitDirection,
): number[] {
  const result = [coords[0]!]
  for (let i = 1; i < coords.length; i++) {
    const span = coords[i]! - coords[i - 1]!
    const count = snapCount(span, moduleMm, direction)
    const nextSpan = count === null ? span : count * moduleMm
    result.push(result[i - 1]! + nextSpan)
  }
  return result
}

function remap(value: number, from: number[], to: number[]): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < from.length; i++) {
    const d = Math.abs(value - from[i]!)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return to[best]!
}

function isRectangle(polygon: Polygon): boolean {
  if (polygon.length !== 4 || !isAxisAligned(polygon)) return false
  const box = getBoundingBox(polygon)
  const xs = uniqueSorted(polygon.map((p) => p.x))
  const ys = uniqueSorted(polygon.map((p) => p.y))
  return xs.length === 2 && ys.length === 2 && box.maxX - box.minX > 0 && box.maxY - box.minY > 0
}

function sizeOf(polygon: Polygon) {
  const box = getBoundingBox(polygon)
  return { widthMm: box.maxX - box.minX, lengthMm: box.maxY - box.minY }
}

function polygonsEqual(a: Polygon, b: Polygon): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (p, i) => Math.abs(p.x - b[i]!.x) < EPS_MM && Math.abs(p.y - b[i]!.y) < EPS_MM,
  )
}

function snapWorkingPolygon(
  workingPolygon: Polygon,
  moduleWidthMm: number,
  moduleLengthMm: number,
  direction: EdgingFitDirection,
): Polygon | null {
  if (!isAxisAligned(workingPolygon) || !isPolygonValid(workingPolygon)) return null
  const xs = uniqueSorted(workingPolygon.map((p) => p.x))
  const ys = uniqueSorted(workingPolygon.map((p) => p.y))
  if (xs.length < 2 || ys.length < 2) return null

  const snappedXs = snapUniqueCoords(xs, moduleWidthMm, direction)
  const snappedYs = snapUniqueCoords(ys, moduleLengthMm, direction)
  const snapped = workingPolygon.map((p) => ({
    x: remap(p.x, xs, snappedXs),
    y: remap(p.y, ys, snappedYs),
  }))
  if (!isPolygonValid(snapped) || polygonsEqual(snapped, workingPolygon)) return null
  return snapped
}

function roundPolygonMm(polygon: Polygon): Polygon {
  return polygon.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
}

function roomFromSnappedWorking(snapped: Polygon, insetMm: number): Polygon | null {
  const workSize = sizeOf(snapped)
  if (isRectangle(snapped)) {
    return createRectanglePolygon(workSize.widthMm + 2 * insetMm, workSize.lengthMm + 2 * insetMm)
  }
  const room = offsetPolygonOutward(snapped, insetMm)
  if (!room.success) return null
  return roundPolygonMm(room.polygon)
}

export function proposeEdgingFit(input: {
  workingPolygon: Polygon
  insetMm: number
  moduleWidthMm: number
  moduleLengthMm: number
  direction: EdgingFitDirection
}): EdgingFitProposal | null {
  const snapped = snapWorkingPolygon(
    input.workingPolygon,
    input.moduleWidthMm,
    input.moduleLengthMm,
    input.direction,
  )
  if (!snapped) return null

  const workingPolygon = roundPolygonMm(snapped)
  const workSize = sizeOf(workingPolygon)
  if (workSize.widthMm <= 0 || workSize.lengthMm <= 0) return null

  const roomPolygon = roomFromSnappedWorking(workingPolygon, input.insetMm)
  if (!roomPolygon) return null

  const roomSize = sizeOf(roomPolygon)
  if (roomSize.widthMm <= 0 || roomSize.lengthMm <= 0) return null

  return {
    direction: input.direction,
    roomPolygon,
    workingPolygon,
    roomWidthMm: roomSize.widthMm,
    roomLengthMm: roomSize.lengthMm,
    workingWidthMm: workSize.widthMm,
    workingHeightMm: workSize.lengthMm,
    tilesX: Math.max(1, Math.round(workSize.widthMm / input.moduleWidthMm)),
    tilesY: Math.max(1, Math.round(workSize.lengthMm / input.moduleLengthMm)),
  }
}

export function proposeEdgingFits(input: {
  workingPolygon: Polygon
  insetMm: number
  moduleWidthMm: number
  moduleLengthMm: number
}): EdgingFitOptions {
  const orthogonal = isAxisAligned(input.workingPolygon)
  if (!orthogonal) {
    return { aligned: false, orthogonal: false, down: null, up: null }
  }

  const aligned = isWorkingFieldModuleAligned(
    input.workingPolygon,
    input.moduleWidthMm,
    input.moduleLengthMm,
  )
  if (aligned) {
    return { aligned: true, orthogonal: true, down: null, up: null }
  }

  return {
    aligned: false,
    orthogonal: true,
    down: proposeEdgingFit({ ...input, direction: 'down' }),
    up: proposeEdgingFit({ ...input, direction: 'up' }),
  }
}
