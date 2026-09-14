import type {
  CardinalDirection,
  CoverageDimensions,
  EdgingCornerType,
  EdgingLayout,
  EdgingPiece,
  EdgingSettings,
  EdgingStraightType,
  Point,
  Polygon,
} from '@/shared/types'
import {
  EDGING_CORNER_TYPE_BY_SIDES,
  EDGING_GEOMETRY,
  EDGING_STRAIGHT_TYPE_BY_SIDE,
  cornerKey,
} from '@/shared/config/edging'
import { edgeLength, getBoundingBox } from '@/shared/geometry/polygon'

const EPS = 1e-6
/** Допуск на «прямой угол»: элементы 90° не встают в скошенный угол. */
const ORTHOGONAL_TOLERANCE = 1e-3
/** Короче — считаем, что участок под прямой элемент отсутствует. */
const MIN_RUN_MM = 1
/** Недобор меньше допуска — элемент считается целым, а не подрезанным. */
const TRIM_TOLERANCE_MM = 0.5

/**
 * Отступ зоны укладки от заданного контура.
 * `outer` — кант внутри заданного размера, поле плитки сжимается на 45 мм.
 * `inner` — задан размер поля плитки, кант добавляется снаружи и в inset не входит.
 */
export function workingInsetMm(gapMm: number, edging: EdgingSettings | undefined): number {
  if (!edging?.enabled) return gapMm
  if (edging.sizeRef === 'inner') return gapMm
  return gapMm + EDGING_GEOMETRY.widthMm
}

/** Габарит поля плитки и покрытия с кантами (кант 45 мм с каждой стороны). */
export function coverageDimensions(
  workingPolygon: Polygon,
  withEdging: boolean,
): CoverageDimensions {
  const box = getBoundingBox(workingPolygon)
  const tileWidthMm = box.maxX - box.minX
  const tileLengthMm = box.maxY - box.minY
  const extra = withEdging ? EDGING_GEOMETRY.widthMm * 2 : 0
  return {
    tileWidthMm,
    tileLengthMm,
    outerWidthMm: tileWidthMm + extra,
    outerLengthMm: tileLengthMm + extra,
  }
}

function unitVector(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < EPS) return { x: 0, y: 0 }
  return { x: dx / len, y: dy / len }
}

/** Знаковая площадь; > 0 — обход по часовой стрелке в экранных координатах (y вниз). */
function signedArea(polygon: Polygon): number {
  let sum = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

function outwardNormal(direction: Point, clockwise: boolean): Point {
  return clockwise
    ? { x: direction.y, y: -direction.x }
    : { x: -direction.y, y: direction.x }
}

export function cardinalOf(normal: Point): CardinalDirection {
  if (Math.abs(normal.x) >= Math.abs(normal.y)) {
    return normal.x > 0 ? 'east' : 'west'
  }
  return normal.y > 0 ? 'south' : 'north'
}

function translate(point: Point, direction: Point, distance: number): Point {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance }
}

type EdgeInfo = {
  start: Point
  direction: Point
  normal: Point
  side: CardinalDirection
  lengthMm: number
}

/**
 * `element` — внешний угол 90°, ставится угловой кант;
 * `reflex` — внутренний угол, прямые канты стыкуются подрезкой (штатный случай);
 * `unsupported` — угол не 90°, стандартный элемент не встаёт.
 */
type CornerKind = 'element' | 'reflex' | 'unsupported'

type CornerInfo = {
  kind: CornerKind
  type?: EdgingCornerType
}

function describeEdges(polygon: Polygon, clockwise: boolean): EdgeInfo[] {
  return polygon.map((start, i) => {
    const end = polygon[(i + 1) % polygon.length]
    const direction = unitVector(start, end)
    const normal = outwardNormal(direction, clockwise)
    return {
      start,
      direction,
      normal,
      side: cardinalOf(normal),
      lengthMm: edgeLength(start, end),
    }
  })
}

/**
 * Угловой элемент ставится только во внешний угол 90°.
 * Во внутренних (вогнутых) углах прямые канты стыкуются подрезкой по месту.
 */
function describeCorner(incoming: EdgeInfo, outgoing: EdgeInfo, clockwise: boolean): CornerInfo {
  const cross = incoming.direction.x * outgoing.direction.y - incoming.direction.y * outgoing.direction.x
  const convex = clockwise ? cross > EPS : cross < -EPS
  if (!convex) return { kind: 'reflex' }

  const dot = incoming.direction.x * outgoing.direction.x + incoming.direction.y * outgoing.direction.y
  if (Math.abs(dot) > ORTHOGONAL_TOLERANCE) return { kind: 'unsupported' }

  const type = EDGING_CORNER_TYPE_BY_SIDES[cornerKey(incoming.side, outgoing.side)]
  if (type === undefined) return { kind: 'unsupported' }

  return { kind: 'element', type }
}

/**
 * Г-образный элемент, огибающий внешний угол:
 * плечи по 125 мм вдоль обеих сторон, вылет 45 мм наружу.
 */
function cornerPolygon(vertex: Point, incoming: EdgeInfo, outgoing: EdgeInfo): Polygon {
  const { widthMm, cornerLegMm } = EDGING_GEOMETRY
  const alongNext = translate(vertex, outgoing.direction, cornerLegMm)
  const alongPrev = translate(vertex, incoming.direction, -cornerLegMm)
  return [
    alongNext,
    translate(alongNext, outgoing.normal, widthMm),
    translate(translate(vertex, incoming.normal, widthMm), outgoing.normal, widthMm),
    translate(alongPrev, incoming.normal, widthMm),
    alongPrev,
    vertex,
  ]
}

function straightPolygon(edge: EdgeInfo, offsetMm: number, lengthMm: number): Polygon {
  const { widthMm } = EDGING_GEOMETRY
  const inner1 = translate(edge.start, edge.direction, offsetMm)
  const inner2 = translate(edge.start, edge.direction, offsetMm + lengthMm)
  return [
    inner1,
    inner2,
    translate(inner2, edge.normal, widthMm),
    translate(inner1, edge.normal, widthMm),
  ]
}

function emptyLayout(): EdgingLayout {
  return {
    pieces: [],
    straightCounts: { 1: 0, 2: 0 },
    cornerCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
    straightTotal: 0,
    cornerTotal: 0,
    trimmedStraightCount: 0,
    unsupportedCornerCount: 0,
    perimeterMm: 0,
  }
}

/**
 * Раскладка окантовки по периметру зоны укладки.
 * Углы забирают по 125 мм с каждой примыкающей стороны, остаток закрывают
 * прямые элементы по 250 мм; последний на стороне при необходимости режется.
 */
export function generateEdging(fieldPolygon: Polygon): EdgingLayout {
  if (fieldPolygon.length < 3) return emptyLayout()

  const area = signedArea(fieldPolygon)
  if (Math.abs(area) < EPS) return emptyLayout()

  const clockwise = area > 0
  const edges = describeEdges(fieldPolygon, clockwise)
  const corners = fieldPolygon.map((_, i) =>
    describeCorner(edges[(i - 1 + edges.length) % edges.length], edges[i], clockwise),
  )

  const pieces: EdgingPiece[] = []
  const straightCounts: Record<EdgingStraightType, number> = { 1: 0, 2: 0 }
  const cornerCounts: Record<EdgingCornerType, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  let trimmedStraightCount = 0

  fieldPolygon.forEach((vertex, i) => {
    const corner = corners[i]
    if (corner.kind !== 'element' || corner.type === undefined) return
    const incoming = edges[(i - 1 + edges.length) % edges.length]
    pieces.push({
      id: `edging-corner-${i}`,
      kind: 'corner',
      type: corner.type,
      polygon: cornerPolygon(vertex, incoming, edges[i]),
    })
    cornerCounts[corner.type] += 1
  })

  edges.forEach((edge, i) => {
    const { straightLengthMm, cornerLegMm } = EDGING_GEOMETRY
    const startTrim = corners[i].kind === 'element' ? cornerLegMm : 0
    const endTrim = corners[(i + 1) % corners.length].kind === 'element' ? cornerLegMm : 0
    const run = edge.lengthMm - startTrim - endTrim
    if (run < MIN_RUN_MM) return

    const type = EDGING_STRAIGHT_TYPE_BY_SIDE[edge.side]
    const count = Math.ceil(run / straightLengthMm - EPS)

    for (let k = 0; k < count; k++) {
      const lengthMm = Math.min(straightLengthMm, run - k * straightLengthMm)
      if (lengthMm < straightLengthMm - TRIM_TOLERANCE_MM) trimmedStraightCount += 1
      pieces.push({
        id: `edging-straight-${i}-${k}`,
        kind: 'straight',
        type,
        polygon: straightPolygon(edge, startTrim + k * straightLengthMm, lengthMm),
        lengthMm,
      })
      straightCounts[type] += 1
    }
  })

  return {
    pieces,
    straightCounts,
    cornerCounts,
    straightTotal: straightCounts[1] + straightCounts[2],
    cornerTotal: cornerCounts[1] + cornerCounts[2] + cornerCounts[3] + cornerCounts[4],
    trimmedStraightCount,
    unsupportedCornerCount: corners.filter((c) => c.kind === 'unsupported').length,
    perimeterMm: edges.reduce((sum, edge) => sum + edge.lengthMm, 0),
  }
}
