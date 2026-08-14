import type Konva from 'konva'
import type { ViewTransform } from '@/shared/lib/canvas-view'
import { canvasToPngBlob, downloadBlob } from './download-file'

export type StageSnapshot = {
  scaleX: number
  scaleY: number
  x: number
  y: number
}

/** Вне контура помещения Konva оставляет прозрачность — в PNG это тёмные поля. */
const EXPORT_BACKGROUND = '#ffffff'

const EXPORT_PIXEL_RATIO = 2

/**
 * Предел длинной стороны PNG. Без него схема с большого монитора уходила
 * в файл 6936×4112 на 37 МБ — таким не поделишься с клиентом. 3200 px
 * покрывает печать A4 при 300 dpi.
 */
const MAX_EXPORT_SIDE = 3200

/** Плотность снимка: до 2×, но не в ущерб размеру файла и не ниже 1:1. */
function resolveExportPixelRatio(stage: Konva.Stage): number {
  const longestSide = Math.max(stage.width(), stage.height())
  if (longestSide <= 0) return EXPORT_PIXEL_RATIO
  return Math.min(EXPORT_PIXEL_RATIO, Math.max(1, MAX_EXPORT_SIDE / longestSide))
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

function fillTransparentAreas(canvas: HTMLCanvasElement, background: string): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.save()
  // Konva оставляет на контексте масштаб pixelRatio — заливаем в пикселях холста.
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
}

/**
 * Снимок Stage в fit-виде на непрозрачном фоне, без влияния пользовательского
 * zoom/pan. Восстанавливает предыдущий вид после экспорта.
 */
export function captureStageCanvasAtFit(
  stage: Konva.Stage,
  fit: ViewTransform,
  options: { pixelRatio?: number } = {},
): HTMLCanvasElement {
  const prev = readStageTransform(stage)
  applyStageTransform(stage, fit)
  stage.batchDraw()
  try {
    const canvas = stage.toCanvas({
      pixelRatio: options.pixelRatio ?? resolveExportPixelRatio(stage),
    })
    fillTransparentAreas(canvas, EXPORT_BACKGROUND)
    return canvas
  } finally {
    stage.scale({ x: prev.scaleX, y: prev.scaleY })
    stage.position({ x: prev.x, y: prev.y })
    stage.batchDraw()
  }
}

/** Для PDF: jsPDF принимает изображение строкой. */
export function captureStageDataUrlAtFit(
  stage: Konva.Stage,
  fit: ViewTransform,
  options: { pixelRatio?: number } = {},
): string {
  return captureStageCanvasAtFit(stage, fit, options).toDataURL('image/png')
}

export async function exportStageToPngAtFit(
  stage: Konva.Stage,
  fit: ViewTransform,
  filename: string,
): Promise<void> {
  const canvas = captureStageCanvasAtFit(stage, fit)
  downloadBlob(await canvasToPngBlob(canvas), filename)
}
