import { describe, it, expect } from 'vitest'
import {
  createLShapePolygon,
  createRectanglePolygon,
  offsetPolygonInward,
} from '@/shared/geometry/polygon'
import { workingInsetMm } from '@/shared/geometry/edging'
import {
  isWorkingFieldModuleAligned,
  proposeEdgingFit,
  proposeEdgingFits,
  spanRemainder,
} from '@/shared/geometry/edging-fit'

const MODULE = 250
const GAP = 5
const INSET = workingInsetMm(GAP, { enabled: true, thicknessMm: 9 })

function workingOf(roomW: number, roomH: number) {
  const room = createRectanglePolygon(roomW, roomH)
  const working = offsetPolygonInward(room, INSET)
  if (!working.success) throw new Error(working.reason)
  return working.polygon
}

describe('spanRemainder', () => {
  it('ноль, если сторона кратна модулю', () => {
    expect(spanRemainder(1000, 250)).toBe(0)
    expect(spanRemainder(1000.2, 250)).toBe(0)
  })

  it('остаток для некратной стороны', () => {
    expect(spanRemainder(1100, 250)).toBe(100)
    expect(spanRemainder(700, 250)).toBe(200)
  })
})

describe('proposeEdgingFit — сценарий 1200×800', () => {
  const working = workingOf(1200, 800)

  it('поле 1100×700 не кратно 250 мм', () => {
    expect(isWorkingFieldModuleAligned(working, MODULE, MODULE)).toBe(false)
  })

  it('меньше: 4×2 плитки, помещение 1100×600', () => {
    const down = proposeEdgingFit({
      workingPolygon: working,
      insetMm: INSET,
      moduleWidthMm: MODULE,
      moduleLengthMm: MODULE,
      direction: 'down',
    })

    expect(down).toMatchObject({
      tilesX: 4,
      tilesY: 2,
      workingWidthMm: 1000,
      workingHeightMm: 500,
      roomWidthMm: 1100,
      roomLengthMm: 600,
    })
    expect(isWorkingFieldModuleAligned(down!.workingPolygon, MODULE, MODULE)).toBe(true)
    expect(down!.roomPolygon).toEqual([
      { x: 0, y: 0 },
      { x: 1100, y: 0 },
      { x: 1100, y: 600 },
      { x: 0, y: 600 },
    ])
  })

  it('больше: 5×3 плитки, помещение 1350×850', () => {
    const up = proposeEdgingFit({
      workingPolygon: working,
      insetMm: INSET,
      moduleWidthMm: MODULE,
      moduleLengthMm: MODULE,
      direction: 'up',
    })

    expect(up).toMatchObject({
      tilesX: 5,
      tilesY: 3,
      workingWidthMm: 1250,
      workingHeightMm: 750,
      roomWidthMm: 1350,
      roomLengthMm: 850,
    })
    expect(isWorkingFieldModuleAligned(up!.workingPolygon, MODULE, MODULE)).toBe(true)
  })

  it('после подгонки вниз повторный расчёт не предлагает сдвиг', () => {
    const down = proposeEdgingFit({
      workingPolygon: working,
      insetMm: INSET,
      moduleWidthMm: MODULE,
      moduleLengthMm: MODULE,
      direction: 'down',
    })
    const nextWorking = offsetPolygonInward(down!.roomPolygon, INSET)
    expect(nextWorking.success).toBe(true)
    if (!nextWorking.success) return

    const fits = proposeEdgingFits({
      workingPolygon: nextWorking.polygon,
      insetMm: INSET,
      moduleWidthMm: MODULE,
      moduleLengthMm: MODULE,
    })
    expect(fits.aligned).toBe(true)
    expect(fits.down).toBeNull()
    expect(fits.up).toBeNull()
  })
})

describe('proposeEdgingFits', () => {
  it('ровное поле 3000×2000 — уже без подрезок', () => {
    const working = workingOf(3100, 2100)
    const fits = proposeEdgingFits({
      workingPolygon: working,
      insetMm: INSET,
      moduleWidthMm: MODULE,
      moduleLengthMm: MODULE,
    })
    expect(isWorkingFieldModuleAligned(working, MODULE, MODULE)).toBe(true)
    expect(fits.aligned).toBe(true)
    expect(fits.down).toBeNull()
    expect(fits.up).toBeNull()
  })

  it('Г-образная: обе стороны меняют габарит и остаются ортогональными', () => {
    const room = createLShapePolygon(1230, 870, 700, 500)
    const working = offsetPolygonInward(room, INSET)
    expect(working.success).toBe(true)
    if (!working.success) return

    const fits = proposeEdgingFits({
      workingPolygon: working.polygon,
      insetMm: INSET,
      moduleWidthMm: MODULE,
      moduleLengthMm: MODULE,
    })
    expect(fits.orthogonal).toBe(true)
    expect(fits.down || fits.up).toBeTruthy()
    for (const proposal of [fits.down, fits.up]) {
      if (!proposal) continue
      expect(proposal.roomWidthMm).toBeGreaterThan(0)
      expect(proposal.roomLengthMm).toBeGreaterThan(0)
      expect(proposal.roomPolygon.length).toBeGreaterThanOrEqual(3)
    }
  })
})
