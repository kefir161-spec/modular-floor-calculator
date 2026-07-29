import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  getModuleImageLayout,
  requiresCrossOriginImageLoad,
  resolveStoredCrop,
  resolveTileImageUrl,
  type TilePatternSource,
} from './tile-texture'

function fakePhoto(width: number, height: number): TilePatternSource {
  return { naturalWidth: width, naturalHeight: height, width, height } as TilePatternSource
}

describe('resolveTileImageUrl', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_TILE_IMAGE_PROXY', 'wsrv')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses wsrv proxy in production for plastfactor images', () => {
    const source =
      'https://plastfactor.com/upload/resize_cache/iblock/ab1/1200_1200_140cd750bba9870f18aada2478b24840a/6tdbu322f1oaqn72277n08uvx4i8cy53.jpg'
    const result = resolveTileImageUrl(source)
    expect(result).toContain('https://wsrv.nl/?url=')
    expect(result).toContain(encodeURIComponent(source))
  })

  it('uses vite proxy in dev', () => {
    vi.stubEnv('DEV', true)
    const source = 'https://plastfactor.com/upload/iblock/test.jpg'
    expect(resolveTileImageUrl(source)).toBe('/tile-image-proxy/upload/iblock/test.jpg')
  })

  it('returns external urls unchanged', () => {
    expect(resolveTileImageUrl('https://example.com/tile.jpg')).toBe('https://example.com/tile.jpg')
  })
})

describe('requiresCrossOriginImageLoad', () => {
  it('detects cross-origin urls', () => {
    expect(requiresCrossOriginImageLoad('https://wsrv.nl/?url=test')).toBe(true)
    expect(requiresCrossOriginImageLoad('/tile-image-proxy/upload/test.jpg')).toBe(false)
  })
})

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
