import type { LayoutModule } from '@/shared/types'
import { polygonArea } from './polygon'

function cutPieceArea(mod: LayoutModule): number {
  if (mod.status !== 'cut') return 0
  if (mod.clippedPolygon && mod.clippedPolygon.length >= 3) {
    return polygonArea(mod.clippedPolygon)
  }
  return mod.widthMm * mod.lengthMm
}

/**
 * Сколько целых плиток нужно взять «на подрезку».
 * Несколько мелких кусков с одной стены нарезаются из одной-двух плиток, а не покупаются поштучно.
 */
export function estimateCutSourceModules(
  modules: LayoutModule[],
  moduleWidthMm: number,
  moduleLengthMm: number,
): number {
  const cutModules = modules.filter((m) => m.status === 'cut')
  if (cutModules.length === 0) return 0

  const moduleArea = moduleWidthMm * moduleLengthMm
  if (moduleArea <= 0) return cutModules.length

  const totalCutArea = cutModules.reduce((sum, mod) => sum + cutPieceArea(mod), 0)
  return Math.max(1, Math.ceil(totalCutArea / moduleArea))
}

export function estimateModulesToPurchase(
  modules: LayoutModule[],
  moduleWidthMm: number,
  moduleLengthMm: number,
): {
  fullModulesCount: number
  cutPlacementsCount: number
  cutSourceModulesCount: number
  modulesToPurchase: number
} {
  const fullModulesCount = modules.filter((m) => m.status === 'full').length
  const cutPlacementsCount = modules.filter((m) => m.status === 'cut').length
  const cutSourceModulesCount = estimateCutSourceModules(modules, moduleWidthMm, moduleLengthMm)

  return {
    fullModulesCount,
    cutPlacementsCount,
    cutSourceModulesCount,
    modulesToPurchase: fullModulesCount + cutSourceModulesCount,
  }
}
