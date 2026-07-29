import type { Obstacle, Opening, Point, Polygon } from '@/shared/types'
import {
  createRectanglePolygon,
  edgeLength,
  getBoundingBox,
  pointInPolygon,
  polygonArea,
} from '@/shared/geometry/polygon'
import { edgeUnitVector, pointOnEdge } from '@/shared/geometry/polygon-edit'
import { differencePolygons, intersectionArea } from '@/shared/geometry/layout'

/** Отступы прямоугольного препятствия от AABB помещения (как «от стен» в плане). */
export type ObstacleWallOffsets = {
  fromLeftMm: number
  fromTopMm: number
  fromRightMm: number
  fromBottomMm: number
}

export function obstacleWallOffsets(contour: Polygon, obs: Obstacle): ObstacleWallOffsets {
  const bb = getBoundingBox(contour)
  return {
    fromLeftMm: obs.x - bb.minX,
    fromTopMm: obs.y - bb.minY,
    fromRightMm: bb.maxX - (obs.x + obs.widthMm),
    fromBottomMm: bb.maxY - (obs.y + obs.lengthMm),
  }
}

/** Позиция препятствия по отступам слева/сверху и размеру. */
export function placeObstacleByWallOffsets(
  contour: Polygon,
  size: { widthMm: number; lengthMm: number },
  offsets: { fromLeftMm: number; fromTopMm: number },
): Pick<Obstacle, 'x' | 'y' | 'widthMm' | 'lengthMm'> {
  const bb = getBoundingBox(contour)
  return {
    x: bb.minX + offsets.fromLeftMm,
    y: bb.minY + offsets.fromTopMm,
    widthMm: size.widthMm,
    lengthMm: size.lengthMm,
  }
}

export function createObstacleId(): string {
  return `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function createOpeningId(): string {
  return `opn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Прямоугольное препятствие → полигон в координатах помещения. */
export function obstacleToPolygon(obstacle: Obstacle): Polygon {
  const local = createRectanglePolygon(obstacle.widthMm, obstacle.lengthMm)
  return local.map((p) => ({ x: p.x + obstacle.x, y: p.y + obstacle.y }))
}

export function createDefaultObstacle(roomContour: Polygon): Obstacle {
  const xs = roomContour.map((p) => p.x)
  const ys = roomContour.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  const widthMm = Math.min(1000, Math.max(400, (maxX - minX) * 0.2))
  const lengthMm = Math.min(1000, Math.max(400, (maxY - minY) * 0.2))
  return {
    id: createObstacleId(),
    kind: 'rectangle',
    x: minX + (maxX - minX - widthMm) / 2,
    y: minY + (maxY - minY - lengthMm) / 2,
    widthMm,
    lengthMm,
  }
}

/** Площадь укладки с учётом препятствий (кв. мм → вызывающий делит на 1e6). */
export function layableAreaSqMm(working: Polygon, obstacles: Obstacle[]): number {
  let area = polygonArea(working)
  for (const obs of obstacles) {
    const poly = obstacleToPolygon(obs)
    area -= intersectionArea(working, poly)
  }
  return Math.max(0, area)
}

/**
 * Вычесть препятствия из полигона модуля/зоны.
 * Возвращает наибольший оставшийся кусок или undefined.
 */
export function subtractObstacles(polygon: Polygon, obstacles: Obstacle[]): Polygon | undefined {
  let parts: Polygon[] = [polygon]
  for (const obs of obstacles) {
    const hole = obstacleToPolygon(obs)
    parts = parts.flatMap((p) => differencePolygons(p, hole))
  }
  if (parts.length === 0) return undefined
  return parts.reduce((a, b) => (polygonArea(a) >= polygonArea(b) ? a : b))
}

export function isPointInsideAnyObstacle(point: Point, obstacles: Obstacle[]): boolean {
  return obstacles.some((obs) => pointInPolygon(point, obstacleToPolygon(obs)))
}

/** Суммарная длина открытых краёв (проёмов), мм. */
export function totalOpeningsLengthMm(openings: Opening[]): number {
  return openings.reduce((sum, o) => sum + Math.max(0, o.lengthMm), 0)
}

/** Сегмент проёма в мировых координатах. */
export function openingSegment(
  contour: Polygon,
  opening: Opening,
): { start: Point; end: Point } | null {
  if (contour.length < 2) return null
  const i = ((opening.edgeIndex % contour.length) + contour.length) % contour.length
  const a = contour[i]
  const b = contour[(i + 1) % contour.length]
  const edgeLen = edgeLength(a, b)
  if (edgeLen < 1) return null
  const offset = Math.min(Math.max(0, opening.offsetMm), edgeLen)
  const length = Math.min(Math.max(0, opening.lengthMm), edgeLen - offset)
  const t0 = offset / edgeLen
  const t1 = (offset + length) / edgeLen
  return {
    start: pointOnEdge(contour, i, t0),
    end: pointOnEdge(contour, i, t1),
  }
}

export function createDefaultOpening(contour: Polygon, edgeIndex = 0): Opening {
  const i = ((edgeIndex % contour.length) + contour.length) % contour.length
  const len = edgeLength(contour[i], contour[(i + 1) % contour.length])
  const openingLen = Math.min(900, Math.max(600, len * 0.25))
  const offset = Math.max(0, (len - openingLen) / 2)
  return {
    id: createOpeningId(),
    edgeIndex: i,
    offsetMm: offset,
    lengthMm: openingLen,
  }
}

export { edgeUnitVector }
