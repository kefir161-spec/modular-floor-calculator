import { describe, it, expect, vi } from 'vitest'
import {
  applyStageTransform,
  captureStageCanvasAtFit,
  captureStageDataUrlAtFit,
  readStageTransform,
} from '@/features/export-png/export-stage-fit'
import type { ViewTransform } from '@/shared/lib/canvas-view'

type FakeContext = {
  calls: string[]
  fillStyle: string
  globalCompositeOperation: string
}

function createFakeCanvas(width = 100, height = 80) {
  const ctx: FakeContext = { calls: [], fillStyle: '', globalCompositeOperation: '' }
  let dataUrl = ''

  return {
    canvas: {
      width,
      height,
      getContext: () => ({
        save: () => ctx.calls.push('save'),
        restore: () => ctx.calls.push('restore'),
        setTransform: () => ctx.calls.push('setTransform'),
        fillRect: (x: number, y: number, w: number, h: number) =>
          ctx.calls.push(`fillRect:${x},${y},${w},${h}`),
        set fillStyle(v: string) {
          ctx.fillStyle = v
        },
        set globalCompositeOperation(v: string) {
          ctx.globalCompositeOperation = v
        },
      }),
      toDataURL: () => dataUrl,
    },
    ctx,
    setDataUrl: (v: string) => {
      dataUrl = v
    },
  }
}

function createMockStage(initial: ViewTransform, size = { width: 1000, height: 700 }) {
  let scaleX = initial.scale
  let scaleY = initial.scale
  let x = initial.x
  let y = initial.y
  const batchDraw = vi.fn()
  const fake = createFakeCanvas()

  const toCanvas = vi.fn(() => {
    // фиксируем, что экспорт видит fit, а не user zoom
    fake.setDataUrl(`data:image/png;scale=${scaleX};x=${x};y=${y}`)
    return fake.canvas
  })

  return {
    stage: {
      width: () => size.width,
      height: () => size.height,
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
      toCanvas,
    },
    toCanvas,
    ctx: fake.ctx,
  }
}

describe('export stage at fit', () => {
  it('экспортирует fit-вид и восстанавливает пользовательский zoom/pan', () => {
    const userView = { scale: 0.6, x: 10, y: 20 }
    const fit = { scale: 0.2, x: 100, y: 80 }
    const { stage, toCanvas } = createMockStage(userView)

    const dataUrl = captureStageDataUrlAtFit(stage as never, fit, { pixelRatio: 2 })

    expect(dataUrl).toContain('scale=0.2')
    expect(dataUrl).toContain('x=100')
    expect(dataUrl).toContain('y=80')

    const restored = readStageTransform(stage as never)
    expect(restored.scaleX).toBe(0.6)
    expect(restored.x).toBe(10)
    expect(restored.y).toBe(20)
    expect(toCanvas).toHaveBeenCalledWith({ pixelRatio: 2 })
  })

  it('экспортирует в двойном разрешении, пока файл остаётся разумным', () => {
    const { stage, toCanvas } = createMockStage({ scale: 1, x: 0, y: 0 }, { width: 1068, height: 796 })

    captureStageCanvasAtFit(stage as never, { scale: 0.5, x: 0, y: 0 })

    expect(toCanvas).toHaveBeenCalledWith({ pixelRatio: 2 })
  })

  it('снижает плотность на большом Stage, чтобы PNG не раздувался', () => {
    const { stage, toCanvas } = createMockStage({ scale: 1, x: 0, y: 0 }, { width: 2500, height: 1400 })

    captureStageCanvasAtFit(stage as never, { scale: 0.5, x: 0, y: 0 })

    // 2500 × 1.28 = 3200 px по длинной стороне
    expect(toCanvas).toHaveBeenCalledWith({ pixelRatio: 3200 / 2500 })
  })

  it('не опускается ниже 1:1 даже на очень большом Stage', () => {
    const { stage, toCanvas } = createMockStage({ scale: 1, x: 0, y: 0 }, { width: 5000, height: 3000 })

    captureStageCanvasAtFit(stage as never, { scale: 0.5, x: 0, y: 0 })

    expect(toCanvas).toHaveBeenCalledWith({ pixelRatio: 1 })
  })

  it('заливает прозрачные области белым, не перекрывая схему', () => {
    const { stage, ctx } = createMockStage({ scale: 1, x: 0, y: 0 })

    captureStageCanvasAtFit(stage as never, { scale: 0.5, x: 0, y: 0 })

    expect(ctx.globalCompositeOperation).toBe('destination-over')
    expect(ctx.fillStyle).toBe('#ffffff')
    expect(ctx.calls).toContain('fillRect:0,0,100,80')
    // трансформацию Konva сбрасываем, иначе заливка уедет на pixelRatio
    expect(ctx.calls).toContain('setTransform')
  })

  it('восстанавливает вид, даже если снимок упал', () => {
    const userView = { scale: 0.6, x: 10, y: 20 }
    const { stage } = createMockStage(userView)
    stage.toCanvas = vi.fn(() => {
      throw new Error('tainted canvas')
    }) as never

    expect(() =>
      captureStageCanvasAtFit(stage as never, { scale: 0.2, x: 100, y: 80 }),
    ).toThrow('tainted canvas')

    const restored = readStageTransform(stage as never)
    expect(restored.scaleX).toBe(0.6)
    expect(restored.x).toBe(10)
    expect(restored.y).toBe(20)
  })

  it('applyStageTransform задаёт scale и position', () => {
    const { stage } = createMockStage({ scale: 1, x: 0, y: 0 })
    applyStageTransform(stage as never, { scale: 0.5, x: 12, y: 34 })
    expect(stage.scaleX()).toBe(0.5)
    expect(stage.x()).toBe(12)
    expect(stage.y()).toBe(34)
  })
})
