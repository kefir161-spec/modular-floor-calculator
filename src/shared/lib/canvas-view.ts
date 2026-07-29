export type Size = { width: number; height: number }

export type BoundingBox = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type ViewTransform = {
  scale: number
  x: number
  y: number
}

/** Пользовательский вид поверх fit: zoom=1 и pan=0 — «вписано» */
export type UserView = {
  zoom: number
  panX: number
  panY: number
}

export const DEFAULT_USER_VIEW: UserView = { zoom: 1, panX: 0, panY: 0 }

export const VIEW_ZOOM_MIN = 0.35
export const VIEW_ZOOM_MAX = 8
export const VIEW_ZOOM_STEP = 1.15

export function clampZoom(zoom: number): number {
  return Math.min(VIEW_ZOOM_MAX, Math.max(VIEW_ZOOM_MIN, zoom))
}

/**
 * Автоподгонка помещения в доступную область canvas.
 * Подписи размеров учитываются небольшим запасом; HTML-легенда в расчёт не входит.
 */
export function computeFitTransform(
  bbox: BoundingBox,
  canvasSize: Size,
  options: { showDimensions?: boolean; paddingPx?: number } = {},
): ViewTransform {
  const w = bbox.maxX - bbox.minX
  const h = bbox.maxY - bbox.minY
  if (w <= 0 || h <= 0 || canvasSize.width <= 0 || canvasSize.height <= 0) {
    return { scale: 0.1, x: 40, y: 40 }
  }

  const padPx = options.paddingPx ?? 12
  const dimPadPx = options.showDimensions ? 36 : 6

  const availW = Math.max(40, canvasSize.width - padPx * 2 - dimPadPx * 2)
  const availH = Math.max(40, canvasSize.height - padPx * 2 - dimPadPx * 2)
  const scale = Math.min(availW / w, availH / h)

  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2

  return {
    scale,
    x: canvasSize.width / 2 - cx * scale,
    y: canvasSize.height / 2 - cy * scale,
  }
}

/** Итоговая трансформация Stage = fit × user */
export function composeStageTransform(fit: ViewTransform, user: UserView): ViewTransform {
  const scale = fit.scale * user.zoom
  return {
    scale,
    x: fit.x + user.panX,
    y: fit.y + user.panY,
  }
}

/** Zoom относительно точки экрана (курсор / центр жеста) */
export function zoomUserViewAtPoint(
  fit: ViewTransform,
  user: UserView,
  point: { x: number; y: number },
  nextZoom: number,
): UserView {
  const zoom = clampZoom(nextZoom)
  const oldScale = fit.scale * user.zoom
  const newScale = fit.scale * zoom
  if (oldScale <= 0 || newScale <= 0) {
    return { ...user, zoom }
  }

  const worldX = (point.x - (fit.x + user.panX)) / oldScale
  const worldY = (point.y - (fit.y + user.panY)) / oldScale

  return {
    zoom,
    panX: point.x - worldX * newScale - fit.x,
    panY: point.y - worldY * newScale - fit.y,
  }
}

export function panUserView(user: UserView, dx: number, dy: number): UserView {
  return {
    ...user,
    panX: user.panX + dx,
    panY: user.panY + dy,
  }
}

/** Оценка размера модуля на экране при fit (для приёмки ≥ 40 px) */
export function estimateModuleScreenPx(
  fitScale: number,
  moduleSizeMm: number,
  userZoom = 1,
): number {
  return fitScale * userZoom * moduleSizeMm
}
