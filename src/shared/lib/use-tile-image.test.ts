import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { clearTileImageCache, useTileImage } from './use-tile-image'
import { resetTileImageSources } from './tile-image-sources'

const PHOTO_URL = 'https://plastfactor.com/upload/iblock/ab1/tile.jpg'

const resolveLayoutTextureUrl = vi.fn<() => Promise<string | undefined>>()
const resolveStoredTileCrop = vi.fn<() => Promise<{ x: number; y: number; w: number; h: number } | undefined>>()

vi.mock('@/shared/api/catalog/layout-texture-resolver', () => ({
  resolveLayoutTextureUrl: () => resolveLayoutTextureUrl(),
}))

vi.mock('@/shared/api/catalog/layout-crops', () => ({
  resolveStoredTileCrop: () => resolveStoredTileCrop(),
}))

/** Заглушка <img>: «мёртвый» адрес не вызывает ни load, ни error. */
function stubImage(behaviour: (url: string) => 'load' | 'error' | 'hang'): string[] {
  const requested: string[] = []

  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      crossOrigin: string | null = null
      naturalWidth = 1000
      naturalHeight = 1000
      #src = ''

      get src() {
        return this.#src
      }

      set src(value: string) {
        this.#src = value
        if (!value) return

        requested.push(value)
        const outcome = behaviour(value)
        if (outcome === 'hang') return
        setTimeout(() => {
          if (outcome === 'load') this.onload?.()
          else this.onerror?.()
        }, 0)
      }
    },
  )

  return requested
}

describe('useTileImage на статическом хостинге', () => {
  beforeEach(() => {
    clearTileImageCache()
    resetTileImageSources()
    resolveLayoutTextureUrl.mockReset().mockResolvedValue(PHOTO_URL)
    resolveStoredTileCrop.mockReset().mockResolvedValue(undefined)
    vi.stubEnv('DEV', false)
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_TILE_IMAGE_PROXY', 'wsrv')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('показывает плитку, когда сторонний прокси недоступен', async () => {
    const requested = stubImage((url) => (url.includes('wsrv.nl') ? 'hang' : 'load'))

    const { result } = renderHook(() =>
      useTileImage('https://plastfactor.com/catalog/tile/', '5200', 500, 500),
    )

    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('ready'), { timeout: 15000 })
    expect(result.current.image).toBeDefined()
    expect(result.current.crop).not.toBeNull()
    expect(requested.at(-1)).toBe(PHOTO_URL)
  }, 20000)

  it('берёт область обрезки из предрасчёта, не сканируя пиксели', async () => {
    resolveStoredTileCrop.mockResolvedValue({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
    stubImage(() => 'load')

    const { result } = renderHook(() =>
      useTileImage('https://plastfactor.com/catalog/tile/', '5200', 500, 500),
    )

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.crop).toEqual({ sx: 100, sy: 100, sw: 800, sh: 800 })
  })

  it('переходит на фото каталога, когда фронтальное фото недоступно', async () => {
    const catalogUrl = 'https://plastfactor.com/upload/iblock/catalog.jpg'
    stubImage((url) => (url.includes('catalog.jpg') ? 'load' : 'error'))

    const { result } = renderHook(() =>
      useTileImage('https://plastfactor.com/catalog/tile/', '5200', 500, 500, catalogUrl),
    )

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.image).toBeDefined()
  })

  it('заканчивает ошибкой, а не бесконечной загрузкой, если недоступны все источники', async () => {
    stubImage(() => 'hang')

    const { result } = renderHook(() =>
      useTileImage('https://plastfactor.com/catalog/tile/', '5200', 500, 500),
    )

    await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 25000 })
    expect(result.current.image).toBeUndefined()
  }, 30000)
})
