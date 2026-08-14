import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  buildTileImageCandidates,
  loadTilePhoto,
  requiresCrossOriginImageLoad,
  resetTileImageSources,
} from './tile-image-sources'

const PHOTO =
  'https://plastfactor.com/upload/resize_cache/iblock/ab1/1200_1200_140cd750bba9870f18aada2478b24840a/tile.jpg'

/** Заглушка <img>: «мёртвый» адрес не вызывает ни load, ни error. */
function stubImage(behaviour: (url: string) => 'load' | 'error' | 'hang'): string[] {
  const requested: string[] = []

  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      crossOrigin: string | null = null
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

describe('buildTileImageCandidates', () => {
  beforeEach(() => {
    resetTileImageSources()
    vi.stubEnv('DEV', false)
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_TILE_IMAGE_PROXY', 'wsrv')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('ставит прокси первым — только он отдаёт пиксели для обрезки и экспорта', () => {
    const candidates = buildTileImageCandidates(PHOTO)

    expect(candidates[0].url).toContain(`https://wsrv.nl/?url=${encodeURIComponent(PHOTO)}`)
    expect(candidates[0].crossOrigin).toBe('anonymous')
  })

  it('всегда оставляет прямую ссылку запасным источником', () => {
    expect(buildTileImageCandidates(PHOTO)[1]).toEqual({ url: PHOTO })
  })

  it('в dev использует прокси vite — он же даёт пиксели без crossOrigin', () => {
    vi.stubEnv('DEV', true)
    const candidates = buildTileImageCandidates('https://plastfactor.com/upload/iblock/test.jpg')

    expect(candidates[0]).toEqual({ url: '/tile-image-proxy/upload/iblock/test.jpg' })
  })

  it('не проксирует сторонние и data-адреса', () => {
    expect(buildTileImageCandidates('https://example.com/tile.jpg')).toEqual([
      { url: 'https://example.com/tile.jpg' },
    ])
    expect(buildTileImageCandidates('data:image/gif;base64,AAA')).toEqual([])
    expect(buildTileImageCandidates('')).toEqual([])
  })

  it('отключается по VITE_TILE_IMAGE_PROXY=none', () => {
    vi.stubEnv('VITE_TILE_IMAGE_PROXY', 'none')

    expect(buildTileImageCandidates(PHOTO)).toEqual([{ url: PHOTO }])
  })
})

describe('loadTilePhoto', () => {
  beforeEach(() => {
    resetTileImageSources()
    vi.stubEnv('DEV', false)
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_TILE_IMAGE_PROXY', 'wsrv')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('возвращает фото через прокси, когда он доступен', async () => {
    const requested = stubImage(() => 'load')

    await expect(loadTilePhoto(PHOTO)).resolves.toBeTruthy()
    expect(requested).toHaveLength(1)
    expect(requested[0]).toContain('wsrv.nl')
  })

  it('переходит на прямую ссылку, когда прокси недоступен', async () => {
    const requested = stubImage((url) => (url.includes('wsrv.nl') ? 'error' : 'load'))

    await expect(loadTilePhoto(PHOTO)).resolves.toBeTruthy()
    expect(requested).toEqual([expect.stringContaining('wsrv.nl'), PHOTO])
  })

  it('перестаёт дёргать прокси до конца сеанса после его отказа', async () => {
    const requested = stubImage((url) => (url.includes('wsrv.nl') ? 'error' : 'load'))

    await loadTilePhoto(PHOTO)
    requested.length = 0
    await loadTilePhoto('https://plastfactor.com/upload/iblock/next.jpg')

    expect(requested).toEqual(['https://plastfactor.com/upload/iblock/next.jpg'])
  })

  it('не помечает прокси нерабочим, когда недоступны все источники', async () => {
    stubImage(() => 'error')

    await expect(loadTilePhoto(PHOTO)).resolves.toBeNull()

    const requested = stubImage(() => 'load')
    await loadTilePhoto(PHOTO)
    expect(requested[0]).toContain('wsrv.nl')
  })
})

describe('requiresCrossOriginImageLoad', () => {
  it('различает свой и сторонний origin', () => {
    expect(requiresCrossOriginImageLoad('https://wsrv.nl/?url=test')).toBe(true)
    expect(requiresCrossOriginImageLoad('/tile-image-proxy/upload/test.jpg')).toBe(false)
    expect(requiresCrossOriginImageLoad('data:image/gif;base64,AAA')).toBe(false)
  })
})
