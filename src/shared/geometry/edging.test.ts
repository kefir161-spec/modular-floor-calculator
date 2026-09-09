import { describe, it, expect } from 'vitest'
import { generateEdging } from '@/shared/geometry/edging'
import { createLShapePolygon, createRectanglePolygon, polygonArea } from '@/shared/geometry/polygon'
import { intersectionArea } from '@/shared/geometry/layout'
import { EDGING_GEOMETRY } from '@/shared/config/edging'
import type { EdgingStraightPiece } from '@/shared/types'

const { widthMm, straightLengthMm, cornerLegMm } = EDGING_GEOMETRY

function straightPieces(pieces: ReturnType<typeof generateEdging>['pieces']) {
  return pieces.filter((p): p is EdgingStraightPiece => p.kind === 'straight')
}

describe('generateEdging — прямоугольное поле', () => {
  it('стороны кратны 250 мм: углы забирают по 125 мм, остаток закрывают целые прямые', () => {
    const result = generateEdging(createRectanglePolygon(3000, 2000))

    // 3000 − 2×125 = 2750 → 11 прямых; 2000 − 2×125 = 1750 → 7 прямых
    expect(result.straightCounts).toEqual({ 1: 18, 2: 18 })
    expect(result.cornerCounts).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1 })
    expect(result.straightTotal).toBe(36)
    expect(result.cornerTotal).toBe(4)
    expect(result.trimmedStraightCount).toBe(0)
    expect(result.unsupportedCornerCount).toBe(0)
    expect(result.perimeterMm).toBe(10000)
  })

  it('сторона не кратна 250 мм: последний элемент на стороне режется', () => {
    const result = generateEdging(createRectanglePolygon(5000, 4100))

    // 4100 − 250 = 3850 → 16 элементов, последний 100 мм; таких сторон две
    expect(result.trimmedStraightCount).toBe(2)
    expect(result.straightCounts).toEqual({ 1: 35, 2: 35 })
  })

  it('элементы лежат снаружи поля и имеют паспортные габариты', () => {
    const field = createRectanglePolygon(3000, 2000)
    const result = generateEdging(field)

    // Кант примыкает к краю поля, но не заходит на плитку
    for (const piece of result.pieces) {
      expect(intersectionArea(field, piece.polygon)).toBeCloseTo(0, 6)
    }

    for (const piece of straightPieces(result.pieces)) {
      expect(polygonArea(piece.polygon)).toBeCloseTo(piece.lengthMm * widthMm, 6)
      expect(piece.lengthMm).toBeLessThanOrEqual(straightLengthMm)
    }

    const corner = result.pieces.find((p) => p.kind === 'corner')!
    // Г-образный элемент: два плеча по 125×45 минус общий квадрат 45×45
    expect(polygonArea(corner.polygon)).toBeCloseTo(
      2 * cornerLegMm * widthMm + widthMm * widthMm,
      6,
    )
  })

  it('окантовка полностью замыкает периметр без разрывов', () => {
    const result = generateEdging(createRectanglePolygon(3000, 2000))
    const straightLength = straightPieces(result.pieces).reduce((sum, p) => sum + p.lengthMm, 0)

    expect(straightLength + result.cornerTotal * 2 * cornerLegMm).toBeCloseTo(
      result.perimeterMm,
      6,
    )
  })
})

describe('generateEdging — тип элемента по стороне поля', () => {
  it('верх и левая сторона — кант №2, низ и правая — кант №1', () => {
    const result = generateEdging(createRectanglePolygon(3000, 2000))
    const byY = (piece: EdgingStraightPiece) =>
      piece.polygon.reduce((sum, p) => sum + p.y, 0) / piece.polygon.length

    const top = straightPieces(result.pieces).filter((p) => byY(p) < 0)
    const bottom = straightPieces(result.pieces).filter((p) => byY(p) > 2000)

    expect(top.every((p) => p.type === 2)).toBe(true)
    expect(bottom.every((p) => p.type === 1)).toBe(true)
  })

  it('углы прямоугольника получают все четыре варианта по схеме производителя', () => {
    const result = generateEdging(createRectanglePolygon(3000, 2000))
    const cornerAt = (x: number, y: number) =>
      result.pieces.find((p) => p.kind === 'corner' && p.polygon.some((v) => v.x === x && v.y === y))

    expect(cornerAt(0, 0)).toMatchObject({ type: 4 })
    expect(cornerAt(3000, 0)).toMatchObject({ type: 2 })
    expect(cornerAt(3000, 2000)).toMatchObject({ type: 3 })
    expect(cornerAt(0, 2000)).toMatchObject({ type: 1 })
  })
})

describe('generateEdging — сложная форма помещения', () => {
  it('Г-образное поле: угловой элемент только во внешних углах', () => {
    const result = generateEdging(createLShapePolygon(5000, 4000, 3000, 2500))

    // 6 вершин: 5 внешних углов 90° и 1 внутренний
    expect(result.cornerTotal).toBe(5)
    expect(result.cornerCounts).toEqual({ 1: 1, 2: 1, 3: 2, 4: 1 })
    expect(result.unsupportedCornerCount).toBe(0)
    // Во внутреннем углу прямые доходят до вершины, поэтому появляются подрезки
    expect(result.straightCounts).toEqual({ 1: 34, 2: 34 })
    expect(result.trimmedStraightCount).toBe(2)
  })

  it('стороны не под 90° помечаются как непригодные для углового элемента', () => {
    const diagonalCut = [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
      { x: 3000, y: 1000 },
      { x: 2000, y: 2000 },
      { x: 0, y: 2000 },
    ]
    const result = generateEdging(diagonalCut)

    expect(result.unsupportedCornerCount).toBe(2)
    expect(result.cornerTotal).toBe(3)
  })

  it('вырожденный контур не даёт элементов', () => {
    expect(generateEdging([{ x: 0, y: 0 }, { x: 100, y: 0 }]).pieces).toHaveLength(0)
    expect(generateEdging([]).straightTotal).toBe(0)
  })
})
