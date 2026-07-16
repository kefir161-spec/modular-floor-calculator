import { intersection, diff } from 'martinez-polygon-clipping'
import type { Polygon } from '@/shared/types'
import { computeCenteredStart } from './module-locks'
import { polygonArea } from './polygon'

const EPS = 0.01

type Ring = [number, number][]

function toPolygon(polygon: Polygon): Ring[] {
  const ring: Ring = polygon.map((p) => [p.x, p.y])
  if (ring.length > 0) {
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]])
    }
  }
  return [ring]
}

function fromMultiPolygon(result: number[][][][]): Polygon[] {
  const polygons: Polygon[] = []
  for (const poly of result) {
    if (!poly[0]) continue
    const ring = poly[0]
    const points: Polygon = ring.slice(0, -1).map(([x, y]) => ({ x, y }))
    if (points.length >= 3) polygons.push(points)
  }
  return polygons
}

export function intersectPolygons(a: Polygon, b: Polygon): Polygon[] {
  try {
    const result = intersection(toPolygon(a), toPolygon(b)) as number[][][][]
    if (!result || result.length === 0) return []
    return fromMultiPolygon(result)
  } catch {
    return []
  }
}

export function differencePolygons(a: Polygon, b: Polygon): Polygon[] {
  try {
    const result = diff(toPolygon(a), toPolygon(b)) as number[][][][]
    if (!result || result.length === 0) return []
    return fromMultiPolygon(result)
  } catch {
    return []
  }
}

export function intersectionArea(a: Polygon, b: Polygon): number {
  const parts = intersectPolygons(a, b)
  return parts.reduce((sum, p) => sum + polygonArea(p), 0)
}

export function isPolygonFullyInside(inner: Polygon, outer: Polygon): boolean {
  const innerArea = polygonArea(inner)
  if (innerArea < EPS) return false
  const interArea = intersectionArea(inner, outer)
  return Math.abs(interArea - innerArea) < EPS * innerArea
}

export function classifyModule(moduleRect: Polygon, workingPolygon: Polygon): 'full' | 'cut' | 'outside' {
  const moduleArea = polygonArea(moduleRect)
  if (moduleArea < EPS) return 'outside'
  const interArea = intersectionArea(moduleRect, workingPolygon)
  if (interArea < EPS) return 'outside'
  if (Math.abs(interArea - moduleArea) < EPS) return 'full'
  return 'cut'
}

/**
 * Обрезка только из‑за технологического зазора у стены (≈5 мм) — не считается подрезкой модуля.
 */
export function resolveModuleStatus(
  moduleRect: Polygon,
  workingPolygon: Polygon,
  gapMm = 0,
): 'full' | 'cut' | 'outside' {
  const status = classifyModule(moduleRect, workingPolygon)
  if (status !== 'cut' || gapMm <= 0) return status

  const moduleArea = polygonArea(moduleRect)
  const interArea = intersectionArea(moduleRect, workingPolygon)
  const { width, height } = getPolygonBounds(moduleRect)
  const maxGapLossRatio = (2 * gapMm) / Math.min(width, height) + 0.002

  if (interArea / moduleArea >= 1 - maxGapLossRatio) {
    return 'full'
  }

  return 'cut'
}

function getPolygonBounds(polygon: Polygon) {
  const xs = polygon.map((p) => p.x)
  const ys = polygon.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export function getClippedPolygon(moduleRect: Polygon, workingPolygon: Polygon): Polygon | undefined {
  const parts = intersectPolygons(moduleRect, workingPolygon)
  if (parts.length === 0) return undefined
  return parts.reduce((largest, p) => (polygonArea(p) > polygonArea(largest) ? p : largest))
}

export function createModuleRect(x: number, y: number, widthMm: number, lengthMm: number): Polygon {
  return [
    { x, y },
    { x: x + widthMm, y },
    { x: x + widthMm, y: y + lengthMm },
    { x, y: y + lengthMm },
  ]
}

type AxisLayoutMode = 'symmetric' | 'from-edge'

function axisRemainder(bboxSize: number, moduleSize: number): number {
  return ((bboxSize % moduleSize) + moduleSize) % moduleSize
}

function computeSymmetricAxisStart(remainder: number, moduleSize: number, offset: number): number {
  if (remainder < 0.01) return offset
  return offset - moduleSize + remainder / 2
}

function isCenterModuleFull(
  workingPolygon: Polygon,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  startX: number,
  startY: number,
  moduleWidthMm: number,
  moduleLengthMm: number,
): boolean {
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const col = Math.floor((cx - startX) / moduleWidthMm)
  const row = Math.floor((cy - startY) / moduleLengthMm)
  const x = startX + col * moduleWidthMm
  const y = startY + row * moduleLengthMm
  const rect = createModuleRect(x, y, moduleWidthMm, moduleLengthMm)
  return classifyModule(rect, workingPolygon) === 'full'
}

function computeBalancedLayoutStart(
  workingPolygon: Polygon,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  moduleWidthMm: number,
  moduleLengthMm: number,
  offsetX: number,
  offsetY: number,
) {
  const bboxW = maxX - minX
  const bboxH = maxY - minY
  const remainderX = axisRemainder(bboxW, moduleWidthMm)
  const remainderY = axisRemainder(bboxH, moduleLengthMm)
  const symStartX = computeSymmetricAxisStart(remainderX, moduleWidthMm, offsetX)
  const symStartY = computeSymmetricAxisStart(remainderY, moduleLengthMm, offsetY)

  const centerModuleFull = isCenterModuleFull(
    workingPolygon,
    minX,
    minY,
    maxX,
    maxY,
    minX + symStartX,
    minY + symStartY,
    moduleWidthMm,
    moduleLengthMm,
  )

  if (centerModuleFull) {
    return {
      startX: minX + symStartX,
      startY: minY + symStartY,
      axisModeX: remainderX < 0.01 ? 'from-edge' : 'symmetric',
      axisModeY: remainderY < 0.01 ? 'from-edge' : 'symmetric',
      centerModuleFull,
    }
  }

  return {
    startX: minX + symStartX,
    startY: minY + symStartY,
    axisModeX: 'symmetric' as AxisLayoutMode,
    axisModeY: 'symmetric' as AxisLayoutMode,
    centerModuleFull,
  }
}

export function findCenterModuleId(
  modules: Array<{ id: string; x: number; y: number; widthMm: number; lengthMm: number; status: string }>,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): string | undefined {
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return modules.find(
    (m) =>
      m.status !== 'outside' &&
      cx >= m.x &&
      cx < m.x + m.widthMm &&
      cy >= m.y &&
      cy < m.y + m.lengthMm,
  )?.id
}

export type GenerateLayoutInput = {
  workingPolygon: Polygon
  /** Контур помещения от стены до стены — для выравнивания сетки модулей */
  roomPolygon?: Polygon
  /** Технологический зазор: мелкая обрезка у стены не считается подрезкой модуля */
  gapMm?: number
  moduleWidthMm: number
  moduleLengthMm: number
  rotation: 0 | 90
  offsetX: number
  offsetY: number
  startPoint: 'corner' | 'center'
}

export function generateLayout(input: GenerateLayoutInput) {
  const { workingPolygon, rotation, offsetX, offsetY, startPoint, gapMm = 0 } = input
  const alignmentPolygon = input.roomPolygon ?? workingPolygon
  let { moduleWidthMm, moduleLengthMm } = input

  if (rotation === 90) {
    ;[moduleWidthMm, moduleLengthMm] = [moduleLengthMm, moduleWidthMm]
  }

  const align = getPolygonBounds(alignmentPolygon)
  const work = getPolygonBounds(workingPolygon)
  const { minX, minY, maxX, maxY } = align
  const bboxW = maxX - minX
  const bboxH = maxY - minY

  let startX = minX + offsetX
  let startY = minY + offsetY
  let layoutMeta:
    | {
        centerModuleFull?: boolean
        axisModeX?: string
        axisModeY?: string
      }
    | undefined

  if (startPoint === 'center') {
    const centered = computeCenteredStart(bboxW, bboxH, moduleWidthMm, moduleLengthMm, offsetX, offsetY)
    startX = align.minX + centered.startX
    startY = align.minY + centered.startY
    layoutMeta = { axisModeX: 'symmetric', axisModeY: 'symmetric' }
  } else {
    const balanced = computeBalancedLayoutStart(
      workingPolygon,
      align.minX,
      align.minY,
      align.maxX,
      align.maxY,
      moduleWidthMm,
      moduleLengthMm,
      offsetX,
      offsetY,
    )
    startX = balanced.startX
    startY = balanced.startY
    layoutMeta = {
      centerModuleFull: balanced.centerModuleFull,
      axisModeX: balanced.axisModeX,
      axisModeY: balanced.axisModeY,
    }
  }

  const cols = Math.ceil((work.maxX - startX + moduleWidthMm) / moduleWidthMm) + 2
  const rows = Math.ceil((work.maxY - startY + moduleLengthMm) / moduleLengthMm) + 2

  const modules = []
  let id = 0

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * moduleWidthMm
      const y = startY + row * moduleLengthMm
      const rect = createModuleRect(x, y, moduleWidthMm, moduleLengthMm)
      const status = resolveModuleStatus(rect, workingPolygon, gapMm)

      if (status === 'outside') continue

      const clippedPolygon =
        status === 'cut' ? getClippedPolygon(rect, workingPolygon) : undefined

      modules.push({
        id: `m-${id++}`,
        row,
        col,
        x,
        y,
        widthMm: moduleWidthMm,
        lengthMm: moduleLengthMm,
        status,
        polygon: rect,
        clippedPolygon,
      })
    }
  }

  return {
    modules,
    boundingBox: { minX: align.minX, minY: align.minY, maxX: align.maxX, maxY: align.maxY },
    layoutMeta,
  }
}

export type OptimizeLayoutInput = {
  workingPolygon: Polygon
  roomPolygon?: Polygon
  gapMm?: number
  moduleWidthMm: number
  moduleLengthMm: number
  rotation: 0 | 90
  startPoint: 'corner' | 'center'
}

export function optimizeLayout(input: OptimizeLayoutInput) {
  let { moduleWidthMm, moduleLengthMm } = input
  if (input.rotation === 90) {
    ;[moduleWidthMm, moduleLengthMm] = [moduleLengthMm, moduleWidthMm]
  }

  if (input.startPoint === 'center' || input.startPoint === 'corner') {
    const layout = generateLayout({ ...input, offsetX: 0, offsetY: 0 })
    return {
      offsetX: 0,
      offsetY: 0,
      cutCount: layout.modules.filter((m) => m.status === 'cut').length,
      totalCount: layout.modules.length,
    }
  }

  let best = { offsetX: 0, offsetY: 0, cutCount: Infinity, totalCount: Infinity }
  const stepX = Math.max(moduleWidthMm / 4, 10)
  const stepY = Math.max(moduleLengthMm / 4, 10)

  for (let ox = 0; ox < moduleWidthMm; ox += stepX) {
    for (let oy = 0; oy < moduleLengthMm; oy += stepY) {
      const layout = generateLayout({ ...input, offsetX: ox, offsetY: oy })
      const cutCount = layout.modules.filter((m) => m.status === 'cut').length
      const totalCount = layout.modules.length
      if (
        cutCount < best.cutCount ||
        (cutCount === best.cutCount && totalCount < best.totalCount)
      ) {
        best = { offsetX: ox, offsetY: oy, cutCount, totalCount }
      }
    }
  }

  return best
}
