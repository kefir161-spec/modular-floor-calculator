import { useEffect, useMemo, useState } from 'react'
import { resolveStoredTileCrop, type StoredTileCrop } from '@/shared/api/catalog/layout-crops'
import { resolveLayoutTextureUrl } from '@/shared/api/catalog/layout-texture-resolver'
import { loadTilePhoto } from './tile-image-sources'
import {
  extractLayoutPhotoCrop,
  resolveStoredCrop,
  type LayoutPhotoCrop,
  type LayoutPhotoCropOptions,
  type TilePatternSource,
} from './tile-texture'

export type TileImageStatus = 'loading' | 'ready' | 'error'

type TileImageState = {
  image: TilePatternSource | undefined
  crop: LayoutPhotoCrop | null
  status: TileImageStatus
}

const URL_CACHE_VERSION = 18

const urlCache = new Map<string, string>()

function getUrlCacheKey(variantId: string): string {
  return `${URL_CACHE_VERSION}:${variantId}`
}

export function clearTileImageCache(): void {
  urlCache.clear()
}

type ResolvedTexture = {
  url?: string
  /** Область из предрасчёта — применима только к этому URL. */
  crop?: StoredTileCrop
}

async function resolveTexture(
  variantUrl: string,
  variantId: string,
  fallbackImageUrl?: string,
): Promise<ResolvedTexture> {
  const cacheKey = getUrlCacheKey(variantId)
  const cachedUrl = urlCache.get(cacheKey)
  const layoutUrl = cachedUrl ?? (await resolveLayoutTextureUrl(variantUrl, variantId))
  if (layoutUrl) urlCache.set(cacheKey, layoutUrl)

  return {
    url: layoutUrl || fallbackImageUrl,
    crop: layoutUrl ? await resolveStoredTileCrop(variantId) : undefined,
  }
}

type LoadedSource = {
  image: HTMLImageElement
  /** Задана только для фронтального фото: к фото каталога область не относится. */
  storedCrop?: StoredTileCrop
  variantId: string
}

async function loadTexture(
  variantUrl: string,
  variantId: string,
  fallbackImageUrl: string | undefined,
  signal: AbortSignal,
): Promise<LoadedSource | null> {
  const { url, crop } = await resolveTexture(variantUrl, variantId, fallbackImageUrl)
  if (!url || signal.aborted) return null

  const layout = await loadTilePhoto(url, { signal })
  if (layout) return { image: layout, storedCrop: crop, variantId }

  if (!fallbackImageUrl || fallbackImageUrl === url || signal.aborted) return null

  const fallback = await loadTilePhoto(fallbackImageUrl, { signal })
  return fallback ? { image: fallback, variantId } : null
}

type LoadState = {
  loaded: LoadedSource | null
  status: 'loading' | 'ready' | 'error'
}

export function useTileImage(
  variantUrl?: string,
  variantId?: string,
  moduleWidthMm?: number,
  moduleLengthMm?: number,
  fallbackImageUrl?: string,
): TileImageState {
  const [state, setState] = useState<LoadState>({ loaded: null, status: 'loading' })

  useEffect(() => {
    if (!variantUrl || !variantId) {
      setState({ loaded: null, status: 'error' })
      return
    }

    const controller = new AbortController()
    // Предыдущее фото остаётся на полу до готовности нового — без белой вспышки.
    setState((prev) => ({ loaded: prev.loaded, status: 'loading' }))

    void loadTexture(variantUrl, variantId, fallbackImageUrl, controller.signal).then((next) => {
      if (controller.signal.aborted) return
      setState((prev) =>
        next ? { loaded: next, status: 'ready' } : { loaded: prev.loaded, status: 'error' },
      )
    })

    return () => controller.abort()
  }, [variantUrl, variantId, fallbackImageUrl])

  const { loaded, status } = state

  const crop = useMemo(() => {
    if (!loaded) return null

    const options: LayoutPhotoCropOptions = { moduleWidthMm, moduleLengthMm }
    const stored = loaded.storedCrop
      ? resolveStoredCrop(loaded.image, loaded.storedCrop, options)
      : null
    return stored ?? extractLayoutPhotoCrop(loaded.image, options)
  }, [loaded, moduleWidthMm, moduleLengthMm])

  if (!loaded) return { image: undefined, crop: null, status }
  if (!crop) return { image: undefined, crop: null, status: 'error' }

  return { image: loaded.image, crop, status }
}

export type PaletteTileTexture = {
  image: TilePatternSource
  crop: LayoutPhotoCrop
}

export type PaletteTileMap = Record<string, PaletteTileTexture>

function cropFromLoaded(
  loaded: LoadedSource,
  moduleWidthMm?: number,
  moduleLengthMm?: number,
): LayoutPhotoCrop | null {
  const options: LayoutPhotoCropOptions = { moduleWidthMm, moduleLengthMm }
  const stored = loaded.storedCrop
    ? resolveStoredCrop(loaded.image, loaded.storedCrop, options)
    : null
  return stored ?? extractLayoutPhotoCrop(loaded.image, options)
}

/** Текстуры цветов палитры. Не вызывать useTileImage в цикле рендера. */
export function usePaletteTileImages(
  variants: Array<{ id: string; url: string; imageUrl?: string }>,
  moduleWidthMm?: number,
  moduleLengthMm?: number,
): PaletteTileMap {
  const [loaded, setLoaded] = useState<Record<string, LoadedSource>>({})
  const signature = variants.map((item) => `${item.id}:${item.url}:${item.imageUrl ?? ''}`).join('|')

  useEffect(() => {
    if (variants.length === 0) {
      setLoaded((prev) => (Object.keys(prev).length === 0 ? prev : {}))
      return
    }

    const controller = new AbortController()

    void Promise.all(
      variants.map((item) =>
        item.url ? loadTexture(item.url, item.id, item.imageUrl, controller.signal) : Promise.resolve(null),
      ),
    ).then((results) => {
      if (controller.signal.aborted) return
      const next: Record<string, LoadedSource> = {}
      for (const src of results) {
        if (src) next[src.variantId] = src
      }
      setLoaded(next)
    })

    return () => controller.abort()
    // signature отражает состав палитры; сам массив на каждом рендере новый
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  return useMemo(() => {
    const map: PaletteTileMap = {}
    for (const [id, src] of Object.entries(loaded)) {
      const crop = cropFromLoaded(src, moduleWidthMm, moduleLengthMm)
      if (!crop) continue
      map[id] = { image: src.image, crop }
    }
    return map
  }, [loaded, moduleWidthMm, moduleLengthMm])
}
