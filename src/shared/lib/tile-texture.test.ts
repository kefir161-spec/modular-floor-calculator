import { describe, expect, it } from 'vitest'
import { getModuleImageLayout, resolveStoredCrop, type TilePatternSource } from './tile-texture'

function fakePhoto(width: number, height: number): TilePatternSource {
  return { naturalWidth: width, naturalHeight: height, width, height } as TilePatternSource
}

describe('resolveStoredCrop', () => {
  const stored = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }

  it('пересчитывает область под фактическое разрешение фото', () => {
    expect(resolveStoredCrop(fakePhoto(500, 500), stored)).toEqual({
      sx: 50,
      sy: 50,
      sw: 400,
      sh: 400,
    })
  })

  it('подрезает область под пропорции модуля', () => {
    const crop = resolveStoredCrop(fakePhoto(1000, 1000), stored, {
      moduleWidthMm: 500,
      moduleLengthMm: 1000,
    })

    expect(crop).toEqual({ sx: 300, sy: 100, sw: 400, sh: 800 })
  })

  it('возвращает null для незагруженного фото', () => {
    expect(resolveStoredCrop(fakePhoto(0, 0), stored)).toBeNull()
  })
})

describe('getModuleImageLayout', () => {
  it('растягивает фото на перекрытие соседей', () => {
    const layout = getModuleImageLayout(500, 500)

    expect(layout.width).toBeGreaterThan(500)
    expect(layout.x).toBeLessThan(0)
    expect(layout.width + 2 * layout.x).toBeCloseTo(500, 6)
  })
})
