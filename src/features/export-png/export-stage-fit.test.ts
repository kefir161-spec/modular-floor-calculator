import { describe, it, expect, vi } from 'vitest'
import {
  applyStageTransform,
  captureStageDataUrlAtFit,
  readStageTransform,
} from '@/features/export-png/export-stage-fit'
import type { ViewTransform } from '@/shared/lib/canvas-view'

function createMockStage(initial: ViewTransform) {
  let scaleX = initial.scale
  let scaleY = initial.scale
  let x = initial.x
  let y = initial.y
  const batchDraw = vi.fn()
  const toDataURL = vi.fn(() => {
    // фиксируем, что экспорт видит fit, а не user zoom
    return `data:image/png;scale=${scaleX};x=${x};y=${y}`
  })

  return {
    scaleX: () => scaleX,
    scaleY: () => scaleY,
    x: () => x,
    y: () => y,
    scale: (v?: { x: number; y: number }) => {
      if (v) {
        scaleX = v.x
        scaleY = v.y
      }
      return { x: scaleX, y: scaleY }
    },
    position: (v?: { x: number; y: number }) => {
      if (v) {
        x = v.x
        y = v.y
      }
      return { x, y }
    },
    batchDraw,
    toDataURL,
  }
}

describe('export stage at fit', () => {
  it('экспортирует fit-вид и восстанавливает пользовательский zoom/pan', () => {
    const userView = { scale: 0.6, x: 10, y: 20 }
    const fit = { scale: 0.2, x: 100, y: 80 }
    const stage = createMockStage(userView)

    const dataUrl = captureStageDataUrlAtFit(stage as never, fit, { pixelRatio: 2 })

    expect(dataUrl).toContain('scale=0.2')
    expect(dataUrl).toContain('x=100')
    expect(dataUrl).toContain('y=80')

    const restored = readStageTransform(stage as never)
    expect(restored.scaleX).toBe(0.6)
    expect(restored.x).toBe(10)
    expect(restored.y).toBe(20)
    expect(stage.toDataURL).toHaveBeenCalledWith({ pixelRatio: 2 })
  })

  it('applyStageTransform задаёт scale и position', () => {
    const stage = createMockStage({ scale: 1, x: 0, y: 0 })
    applyStageTransform(stage as never, { scale: 0.5, x: 12, y: 34 })
    expect(stage.scaleX()).toBe(0.5)
    expect(stage.x()).toBe(12)
    expect(stage.y()).toBe(34)
  })
})
