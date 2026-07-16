import type { LayoutModule, Polygon } from '@/shared/types'
import { pointInPolygon } from './polygon'

/** Глубина выступа замка (ласточкин хвост / Т-образный) от края модуля, мм */
export const LOCK_TAB_DEPTH_MM = 12
/** Ширина одного замка вдоль ребра, мм */
export const LOCK_TAB_WIDTH_MM = 45
/** Зазор между замками по ребру, мм */
export const LOCK_TAB_GAP_MM = 8

export type ModuleEdge = 'north' | 'south' | 'east' | 'west'

export type LockTab = {
  edge: ModuleEdge
  x: number
  y: number
  width: number
  height: number
  trimmed: boolean
}

type EdgeInfo = {
  edge: ModuleEdge
  midX: number
  midY: number
  outwardX: number
  outwardY: number
}

function getEdges(
  x: number,
  y: number,
  w: number,
  h: number,
): EdgeInfo[] {
  return [
    { edge: 'north', midX: x + w / 2, midY: y, outwardX: 0, outwardY: -1 },
    { edge: 'south', midX: x + w / 2, midY: y + h, outwardX: 0, outwardY: 1 },
    { edge: 'west', midX: x, midY: y + h / 2, outwardX: -1, outwardY: 0 },
    { edge: 'east', midX: x + w, midY: y + h / 2, outwardX: 1, outwardY: 0 },
  ]
}

function hasNeighbor(
  mod: LayoutModule,
  edge: ModuleEdge,
  modules: LayoutModule[],
  w: number,
  h: number,
): boolean {
  const eps = 2
  return modules.some((other) => {
    if (other.id === mod.id || other.status === 'outside') return false
    if (edge === 'east' && Math.abs(other.x - (mod.x + w)) < eps) {
      return other.y < mod.y + h - eps && other.y + other.lengthMm > mod.y + eps
    }
    if (edge === 'west' && Math.abs(other.x + other.widthMm - mod.x) < eps) {
      return other.y < mod.y + h - eps && other.y + other.lengthMm > mod.y + eps
    }
    if (edge === 'south' && Math.abs(other.y - (mod.y + h)) < eps) {
      return other.x < mod.x + w - eps && other.x + other.widthMm > mod.x + eps
    }
    if (edge === 'north' && Math.abs(other.y + other.lengthMm - mod.y) < eps) {
      return other.x < mod.x + w - eps && other.x + other.widthMm > mod.x + eps
    }
    return false
  })
}

function isWallEdge(
  mod: LayoutModule,
  edge: ModuleEdge,
  workingPolygon: Polygon,
  w: number,
  h: number,
): boolean {
  const info = getEdges(mod.x, mod.y, w, h).find((e) => e.edge === edge)
  if (!info) return false

  const outside = {
    x: info.midX + info.outwardX * 4,
    y: info.midY + info.outwardY * 4,
  }

  return !pointInPolygon(outside, workingPolygon)
}

export function getModuleLockTabs(
  mod: LayoutModule,
  allModules: LayoutModule[],
  workingPolygon: Polygon,
): LockTab[] {
  const w = mod.widthMm
  const h = mod.lengthMm
  const tabs: LockTab[] = []

  for (const edgeInfo of getEdges(mod.x, mod.y, w, h)) {
    const { edge } = edgeInfo
    const wall = isWallEdge(mod, edge, workingPolygon, w, h)
    const neighbor = hasNeighbor(mod, edge, allModules, w, h)

    if (wall || neighbor) continue

    const edgeLength = edge === 'north' || edge === 'south' ? w : h
    const tabStep = LOCK_TAB_WIDTH_MM + LOCK_TAB_GAP_MM
    const count = Math.max(1, Math.floor((edgeLength - LOCK_TAB_GAP_MM) / tabStep))

    for (let i = 0; i < count; i++) {
      const along = LOCK_TAB_GAP_MM / 2 + i * tabStep + LOCK_TAB_WIDTH_MM / 2
      let tx = 0
      let ty = 0
      let tw = LOCK_TAB_WIDTH_MM
      let th = LOCK_TAB_DEPTH_MM

      if (edge === 'north') {
        tx = mod.x + along - LOCK_TAB_WIDTH_MM / 2
        ty = mod.y - LOCK_TAB_DEPTH_MM
      } else if (edge === 'south') {
        tx = mod.x + along - LOCK_TAB_WIDTH_MM / 2
        ty = mod.y + h
      } else if (edge === 'west') {
        tx = mod.x - LOCK_TAB_DEPTH_MM
        ty = mod.y + along - LOCK_TAB_WIDTH_MM / 2
        tw = LOCK_TAB_DEPTH_MM
        th = LOCK_TAB_WIDTH_MM
      } else {
        tx = mod.x + w
        ty = mod.y + along - LOCK_TAB_WIDTH_MM / 2
        tw = LOCK_TAB_DEPTH_MM
        th = LOCK_TAB_WIDTH_MM
      }

      tabs.push({ edge, x: tx, y: ty, width: tw, height: th, trimmed: wall })
    }
  }

  return tabs
}

/**
 * Симметричная укладка «как кафель»: одинаковые подрезки слева/справа и сверху/снизу.
 * Сетка начинается на пол-модуля раньше границы, чтобы крайние куски были равны.
 */
export function computeCenteredStart(
  bboxW: number,
  bboxH: number,
  moduleWidthMm: number,
  moduleLengthMm: number,
  offsetX: number,
  offsetY: number,
): { startX: number; startY: number } {
  const remainderX = ((bboxW % moduleWidthMm) + moduleWidthMm) % moduleWidthMm
  const remainderY = ((bboxH % moduleLengthMm) + moduleLengthMm) % moduleLengthMm

  const startX =
    remainderX === 0 ? offsetX : offsetX - moduleWidthMm + remainderX / 2
  const startY =
    remainderY === 0 ? offsetY : offsetY - moduleLengthMm + remainderY / 2

  return { startX, startY }
}
