import { describe, expect, it } from 'vitest'
import {
  createLShapePolygon,
  createNichePolygon,
  createRectanglePolygon,
  createUShapePolygon,
  getEdgeLengths,
} from '@/shared/geometry/polygon'
import {
  applyLParams,
  applyNicheParams,
  applyUParams,
  extractLParams,
  extractNicheParams,
  extractUParams,
  inferShapePreset,
  interiorAnglesDeg,
  isAxisAligned,
  setInteriorAngle,
  setOrthogonalEdgeLength,
  setRoomEdgeLength,
} from '@/shared/geometry/room-contour'

function expectRightOrReflex(angles: number[]) {
  for (const a of angles) {
    const right = Math.abs(a - 90) < 0.6
    const reflex = Math.abs(a - 270) < 0.6
    expect(right || reflex).toBe(true)
  }
}

describe('ортогональный сдвиг стены', () => {
  it('Г-образная не теряет 90° при смене стороны A', () => {
    const l = createLShapePolygon(5000, 4000, 3000, 2500)
    const next = setRoomEdgeLength(l, 0, 6000)
    expect(next).not.toBeNull()
    expect(isAxisAligned(next!)).toBe(true)
    expectRightOrReflex(interiorAnglesDeg(next!))
    expect(getEdgeLengths(next!)[0]).toBeCloseTo(6000, 5)
    const params = extractLParams(next!)
    expect(params?.outerW).toBeCloseTo(6000, 5)
    expect(params?.innerW).toBeCloseTo(3000, 5)
    expect(params?.innerH).toBeCloseTo(2500, 5)
  })

  it('Г-образная сохраняет уступ при смене внешней длины', () => {
    const l = createLShapePolygon(5000, 4000, 3000, 2500)
    const next = applyLParams(l, { outerH: 4500 })
    expect(next).not.toBeNull()
    const params = extractLParams(next!)
    expect(params?.outerH).toBeCloseTo(4500, 5)
    expect(params?.innerH).toBeCloseTo(2500, 5)
    expectRightOrReflex(interiorAnglesDeg(next!))
  })

  it('уступы Г-образной правятся от внутреннего угла', () => {
    const l = createLShapePolygon(5000, 4000, 3000, 2500)
    const next = applyLParams(l, { innerW: 2800, innerH: 2200 })
    expect(extractLParams(next!)).toMatchObject({ innerW: 2800, innerH: 2200, outerW: 5000 })
    expect(isAxisAligned(next!)).toBe(true)
  })

  it('П-образная держит прямые углы при смене стороны', () => {
    const u = createUShapePolygon(6000, 5000, 3000, 3000, 1000)
    const next = setRoomEdgeLength(u, 0, 7000)
    expect(next).not.toBeNull()
    expect(isAxisAligned(next!)).toBe(true)
    expectRightOrReflex(interiorAnglesDeg(next!))
    expect(getEdgeLengths(next!)[0]).toBeCloseTo(7000, 5)
  })

  it('П-образная меняет ножки независимо', () => {
    const u = createUShapePolygon(6000, 5000, 3000, 3000, 1000)
    const next = applyUParams(u, { leftLeg: 1200, rightLeg: 800 })
    expect(extractUParams(next!)).toMatchObject({ leftLeg: 1200, rightLeg: 800, outerW: 6000 })
    expectRightOrReflex(interiorAnglesDeg(next!))
  })

  it('ниша не плывёт при смене глубины', () => {
    const niche = createNichePolygon(5000, 4000, 1500, 1000, 2000)
    const next = applyNicheParams(niche, { nicheH: 1200 })
    expect(extractNicheParams(next!)?.nicheH).toBeCloseTo(1200, 5)
    expect(isAxisAligned(next!)).toBe(true)
    expectRightOrReflex(interiorAnglesDeg(next!))
  })

  it('сдвиг ортогонального ребра двигает всю стену', () => {
    const rect = createRectanglePolygon(4000, 3000)
    const next = setOrthogonalEdgeLength(rect, 0, 4500)
    expect(next).toEqual([
      { x: 0, y: 0 },
      { x: 4500, y: 0 },
      { x: 4500, y: 3000 },
      { x: 0, y: 3000 },
    ])
  })

  it('отклоняет вырождение Г-образной', () => {
    const l = createLShapePolygon(5000, 4000, 3000, 2500)
    expect(applyLParams(l, { innerW: 5000 })).toBeNull()
    expect(setRoomEdgeLength(l, 0, 0)).toBeNull()
  })
})

describe('обход с углами', () => {
  it('меняет угол и сохраняет остальные, кроме замыкающей стороны', () => {
    const rect = createRectanglePolygon(4000, 3000)
    const next = setInteriorAngle(rect, 1, 100)
    expect(next).not.toBeNull()
    expect(isAxisAligned(next!)).toBe(false)
    expect(interiorAnglesDeg(next!)[1]).toBeCloseTo(100, 0)
    expect(getEdgeLengths(next!)[0]).toBeCloseTo(4000, 0)
    expect(getEdgeLengths(next!)[1]).toBeCloseTo(3000, 0)
  })

  it('длина в неортогональном контуре не ломает заданные углы', () => {
    const skewed = setInteriorAngle(createRectanglePolygon(4000, 3000), 1, 110)!
    const anglesBefore = interiorAnglesDeg(skewed)
    const next = setRoomEdgeLength(skewed, 0, 4500)!
    expect(getEdgeLengths(next)[0]).toBeCloseTo(4500, 0)
    expect(interiorAnglesDeg(next)[1]).toBeCloseTo(anglesBefore[1], 0)
  })
})

describe('inferShapePreset', () => {
  it('распознаёт пресеты', () => {
    expect(inferShapePreset(createRectanglePolygon(5000, 4000), 'rectangle')).toBe('rectangle')
    expect(inferShapePreset(createLShapePolygon(5000, 4000, 3000, 2500))).toBe('l')
    expect(inferShapePreset(createUShapePolygon(6000, 5000, 3000, 3000, 1000))).toBe('u')
    expect(inferShapePreset(createNichePolygon(5000, 4000, 1500, 1000, 2000))).toBe('niche')
  })

  it('уважает hint для U/ниши', () => {
    const u = createUShapePolygon(6000, 5000, 3000, 3000, 1000)
    expect(inferShapePreset(u, 'polygon', 'u')).toBe('u')
    const niche = createNichePolygon(5000, 4000, 1500, 1000, 2000)
    expect(inferShapePreset(niche, 'polygon', 'niche')).toBe('niche')
  })
})
