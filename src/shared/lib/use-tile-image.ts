import { useEffect, useMemo, useState } from 'react'
import useImage from 'use-image'
import { resolveStoredTileCrop, type StoredTileCrop } from '@/shared/api/catalog/layout-crops'
import { resolveLayoutTextureUrl } from '@/shared/api/catalog/layout-texture-resolver'
import {
  extractLayoutPhotoCrop,
  requiresCrossOriginImageLoad,
  resolveStoredCrop,
  resolveTileImageUrl,
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

const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
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

export function useTileImage(
  variantUrl?: string,
  variantId?: string,
  moduleWidthMm?: number,
  moduleLengthMm?: number,
  fallbackImageUrl?: string,
): TileImageState {
  const [texture, setTexture] = useState<ResolvedTexture>({})
  const [resolved, setResolved] = useState(false)
  const [stable, setStable] = useState<{
    image: TilePatternSource
    crop: LayoutPhotoCrop
    variantId?: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    // не очищаем texture сразу — оставляем предыдущий URL до готовности нового
    setResolved(false)

    if (!variantUrl || !variantId) {
      setTexture({})
      setStable(null)
      setResolved(true)
      return () => {
        cancelled = true
      }
    }

    void resolveTexture(variantUrl, variantId, fallbackImageUrl).then((next) => {
      if (cancelled) return
      setTexture(next)
      setResolved(true)
    })

    return () => {
      cancelled = true
    }
  }, [variantUrl, variantId, fallbackImageUrl])

  const layoutUrl = texture.url
  const proxiedUrl = layoutUrl ? resolveTileImageUrl(layoutUrl) : undefined
  const useCrossOrigin = proxiedUrl ? requiresCrossOriginImageLoad(proxiedUrl) : false

  const [proxiedImage, proxiedStatus] = useImage(
    proxiedUrl || EMPTY_IMAGE,
    useCrossOrigin ? 'anonymous' : undefined,
  )

  const tryDirect = proxiedStatus === 'failed' && Boolean(layoutUrl) && import.meta.env.DEV
  const [directImage, directStatus] = useImage(tryDirect ? layoutUrl! : EMPTY_IMAGE)

  const tryCatalogFallback =
    Boolean(fallbackImageUrl) &&
    fallbackImageUrl !== layoutUrl &&
    proxiedStatus === 'failed' &&
    (!tryDirect || directStatus === 'failed')
  const catalogProxied = tryCatalogFallback ? resolveTileImageUrl(fallbackImageUrl!) : undefined
  const catalogNeedsCors = catalogProxied ? requiresCrossOriginImageLoad(catalogProxied) : false
  const [catalogImage, catalogStatus] = useImage(
    catalogProxied || EMPTY_IMAGE,
    catalogNeedsCors ? 'anonymous' : undefined,
  )

  const layoutPhoto = ((proxiedUrl && proxiedImage) || (tryDirect && directImage) || undefined) as
    | HTMLImageElement
    | undefined
  const catalogPhoto = (catalogProxied && catalogImage) || undefined
  const photoImage = layoutPhoto ?? catalogPhoto

  const crop = useMemo(() => {
    if (!photoImage) return null

    const options: LayoutPhotoCropOptions = { moduleWidthMm, moduleLengthMm }
    const stored =
      layoutPhoto && texture.crop ? resolveStoredCrop(photoImage, texture.crop, options) : null
    return stored ?? extractLayoutPhotoCrop(photoImage, options)
  }, [photoImage, layoutPhoto, texture.crop, moduleWidthMm, moduleLengthMm])

  const loading =
    Boolean(variantUrl && variantId) &&
    (!resolved ||
      (Boolean(layoutUrl) &&
        !photoImage &&
        (proxiedStatus === 'loading' ||
          (tryDirect && directStatus === 'loading') ||
          (tryCatalogFallback && catalogStatus === 'loading'))))

  useEffect(() => {
    if (photoImage && crop && variantId) {
      setStable({ image: photoImage, crop, variantId })
    }
  }, [photoImage, crop, variantId])

  // Пока грузится новый вариант — показываем предыдущую готовую текстуру (без белой вспышки)
  if (loading) {
    if (stable && stable.variantId === variantId) {
      return { image: stable.image, crop: stable.crop, status: 'loading' }
    }
    if (stable && stable.variantId !== variantId) {
      return { image: stable.image, crop: stable.crop, status: 'loading' }
    }
    return { image: undefined, crop: null, status: 'loading' }
  }

  if (photoImage && crop) {
    return { image: photoImage, crop, status: 'ready' }
  }

  if (stable) {
    return { image: stable.image, crop: stable.crop, status: 'error' }
  }

  return { image: undefined, crop: null, status: 'error' }
}
