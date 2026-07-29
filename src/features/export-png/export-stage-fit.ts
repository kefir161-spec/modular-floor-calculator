import type Konva from 'konva'
import type { ViewTransform } from '@/shared/lib/canvas-view'

export type StageSnapshot = {
  scaleX: number
  scaleY: number
  x: number
  y: number
}

export function readStageTransform(stage: Konva.Stage): StageSnapshot {
  return {
    scaleX: stage.scaleX(),
    scaleY: stage.scaleY(),
    x: stage.x(),
    y: stage.y(),
  }
}

export function applyStageTransform(stage: Konva.Stage, transform: ViewTransform): void {
  stage.scale({ x: transform.scale, y: transform.scale })
  stage.position({ x: transform.x, y: transform.y })
}

/**
 * Снимок Stage в fit-виде, без влияния пользовательского zoom/pan.
 * Восстанавливает предыдущий вид после экспорта.
 */
export function captureStageDataUrlAtFit(
  stage: Konva.Stage,
  fit: ViewTransform,
  options: { pixelRatio?: number } = {},
): string {
  const prev = readStageTransform(stage)
  applyStageTransform(stage, fit)
  stage.batchDraw()
  try {
    return stage.toDataURL({ pixelRatio: options.pixelRatio ?? 2 })
  } finally {
    stage.scale({ x: prev.scaleX, y: prev.scaleY })
    stage.position({ x: prev.x, y: prev.y })
    stage.batchDraw()
  }
}

export async function exportStageToPngAtFit(
  stage: Konva.Stage,
  fit: ViewTransform,
  filename: string,
): Promise<void> {
  const dataUrl = captureStageDataUrlAtFit(stage, fit)
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}
