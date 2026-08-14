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
