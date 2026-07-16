import type Konva from 'konva'
import type { CalculationResult, LayoutSettings, Polygon, ProductVariant } from '@/shared/types'

export type ExportSceneInput = {
  roomContour: Polygon
  workingContour: Polygon | null
  calculation: CalculationResult
  layout: LayoutSettings
  variant: ProductVariant
  projectName: string
}

export async function exportStageToPng(stage: Konva.Stage, filename: string): Promise<void> {
  const dataUrl = stage.toDataURL({ pixelRatio: 2 })
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export function buildExportFilename(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${prefix}-${date}.png`
}
