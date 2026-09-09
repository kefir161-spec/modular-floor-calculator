import { describe, expect, it } from 'vitest'
import type { ProductFamily, ProductVariant } from '@/shared/types'
import {
  applyPaintOverride,
  colorOverridesEqual,
  findFamilyByVariant,
  findLayoutModuleAt,
  isSamePaintSize,
  modulePaintKey,
  paintPalette,
} from '@/shared/lib/paint'

const variant = (id: string, extra: Partial<ProductVariant> = {}): ProductVariant => ({
  id,
  sourceId: id,
  url: `https://plastfactor.com/catalog/${id}`,
  name: id,
  available: true,
  price: 100,
  priceUnit: 'piece',
  lengthMm: 250,
  widthMm: 250,
  thicknessMm: 9,
  colorName: id,
  rawParams: {},
  calculable: true,
  ...extra,
})

const family: ProductFamily = {
  id: 'optima',
  slug: 'optima-duos',
  name: 'Optima Duos',
  categoryId: '1255',
  categoryName: 'Плитка ПВХ',
  variants: [
    variant('black'),
    variant('gray'),
    variant('red', { thicknessMm: 16 }),
    variant('black-dup', { colorName: 'black' }),
    variant('uncalc', { calculable: false, colorName: 'yellow' }),
  ],
}

describe('paint helpers', () => {
  it('строит ключ модуля по округлённым координатам', () => {
    expect(modulePaintKey({ x: 10.4, y: 20.6 })).toBe('10:21')
  })

  it('палитра: только тот же размер и толщина, без дублей цвета', () => {
    const selected = family.variants[0]
    const palette = paintPalette(family, selected)
    expect(palette.map((item) => item.id)).toEqual(['black', 'gray'])
  })

  it('палитра 16 мм не смешивается с 9 мм', () => {
    const thick = family.variants[2]
    expect(isSamePaintSize(family.variants[0], thick)).toBe(false)
    expect(paintPalette(family, thick).map((item) => item.id)).toEqual(['red'])
  })

  it('находит семейство по варианту', () => {
    expect(findFamilyByVariant([family], family.variants[1])?.id).toBe('optima')
  })

  it('покраска базовым цветом стирает override', () => {
    const painted = applyPaintOverride({}, '0:0', 'gray', 'black')
    expect(painted).toEqual({ '0:0': 'gray' })
    expect(applyPaintOverride(painted, '0:0', 'black', 'black')).toEqual({})
    expect(applyPaintOverride(painted, '0:0', 'gray', 'black')).toBe(painted)
  })

  it('сравнивает карты покраски', () => {
    expect(colorOverridesEqual({ a: '1' }, { a: '1' })).toBe(true)
    expect(colorOverridesEqual({ a: '1' }, { a: '2' })).toBe(false)
  })

  it('hit-test находит модуль под точкой', () => {
    const modules = [
      {
        id: 'a',
        row: 0,
        col: 0,
        x: 0,
        y: 0,
        widthMm: 250,
        lengthMm: 250,
        status: 'full' as const,
        polygon: [
          { x: 0, y: 0 },
          { x: 250, y: 0 },
          { x: 250, y: 250 },
          { x: 0, y: 250 },
        ],
      },
      {
        id: 'b',
        row: 0,
        col: 1,
        x: 250,
        y: 0,
        widthMm: 250,
        lengthMm: 250,
        status: 'full' as const,
        polygon: [
          { x: 250, y: 0 },
          { x: 500, y: 0 },
          { x: 500, y: 250 },
          { x: 250, y: 250 },
        ],
      },
    ]
    expect(findLayoutModuleAt(modules, 10, 10)?.id).toBe('a')
    expect(findLayoutModuleAt(modules, 260, 10)?.id).toBe('b')
    expect(findLayoutModuleAt(modules, -1, 10)).toBeUndefined()
  })
})
