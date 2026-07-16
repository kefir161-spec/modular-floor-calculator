import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { requiresCrossOriginImageLoad, resolveTileImageUrl } from './tile-texture'

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
