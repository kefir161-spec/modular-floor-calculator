import { describe, it, expect } from 'vitest'
import {
  clampZoom,
  composeStageTransform,
  computeFitTransform,
  estimateModuleScreenPx,
  VIEW_ZOOM_MAX,
  VIEW_ZOOM_MIN,
  zoomUserViewAtPoint,
  type ViewTransform,
} from '@/shared/lib/canvas-view'

describe('canvas-view', () => {
  it('computeFitTransform вписывает 5×4 м в 900×560 с запасом', () => {
    const fit = computeFitTransform(
      { minX: 0, minY: 0, maxX: 5000, maxY: 4000 },
      { width: 900, height: 560 },
    )
    expect(fit.scale).toBeGreaterThan(0)
    // помещение должно занимать большую часть меньшей стороны
    const drawnW = 5000 * fit.scale
    const drawnH = 4000 * fit.scale
    expect(drawnW / 900).toBeGreaterThan(0.7)
    expect(drawnH / 560).toBeGreaterThan(0.7)
  })

  it('на 1440×700 модуль 500 мм при комнате 5×4 ≥ 40 px', () => {
    const fit = computeFitTransform(
      { minX: 0, minY: 0, maxX: 5000, maxY: 4000 },
      { width: 1440 * 0.7, height: 700 }, // ~70% ширины под рабочую область
    )
    const px = estimateModuleScreenPx(fit.scale, 500)
    expect(px).toBeGreaterThanOrEqual(40)
  })

  it('zoomUserViewAtPoint сохраняет мировую точку под курсором', () => {
    const fit: ViewTransform = { scale: 0.2, x: 100, y: 50 }
    const user = { zoom: 1, panX: 0, panY: 0 }
    const point = { x: 400, y: 300 }
    const next = zoomUserViewAtPoint(fit, user, point, 2)

    const before = composeStageTransform(fit, user)
    const after = composeStageTransform(fit, next)

    const worldBeforeX = (point.x - before.x) / before.scale
    const worldBeforeY = (point.y - before.y) / before.scale
    const worldAfterX = (point.x - after.x) / after.scale
    const worldAfterY = (point.y - after.y) / after.scale

    expect(worldAfterX).toBeCloseTo(worldBeforeX, 6)
    expect(worldAfterY).toBeCloseTo(worldBeforeY, 6)
    expect(next.zoom).toBe(2)
  })

  it('clampZoom ограничивает диапазон', () => {
    expect(clampZoom(0.01)).toBe(VIEW_ZOOM_MIN)
    expect(clampZoom(100)).toBe(VIEW_ZOOM_MAX)
    expect(clampZoom(1.5)).toBe(1.5)
  })
})
