import { useEffect, useState } from 'react'
import useImage from 'use-image'
import { resolveLayoutTextureUrl } from '@/shared/api/catalog/layout-texture-resolver'
import {
  extractLayoutPhotoCrop,
  requiresCrossOriginImageLoad,
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
const URL_CACHE_VERSION = 17

const urlCache = new Map<string, string>()
const cropCache = new Map<string, LayoutPhotoCrop>()

function getUrlCacheKey(variantId: string): string {
  return `${URL_CACHE_VERSION}:${variantId}`
}

function getCropCacheKey(layoutUrl: string, cropOptions: LayoutPhotoCropOptions): string {
  const w = cropOptions.moduleWidthMm ?? 0
  const h = cropOptions.moduleLengthMm ?? 0
  return `${layoutUrl}|${w}|${h}`
}

export function clearTileImageCache(): void {
  urlCache.clear()
  cropCache.clear()
}

async function resolveLayoutPhotoUrl(
  variantUrl: string,
  variantId: string,
  fallbackImageUrl?: string,
): Promise<string | undefined> {
  const cached = urlCache.get(getUrlCacheKey(variantId))
  if (cached) return cached

  const layoutUrl = await resolveLayoutTextureUrl(variantUrl, variantId)
  const resolved = layoutUrl || fallbackImageUrl
  if (resolved) {
    urlCache.set(getUrlCacheKey(variantId), resolved)
  }
  return resolved
}

export function useTileImage(
  variantUrl?: string,
  variantId?: string,
  moduleWidthMm?: number,
  moduleLengthMm?: number,
  fallbackImageUrl?: string,
): TileImageState {
  const [layoutUrl, setLayoutUrl] = useState<string | undefined>()
  const [urlResolved, setUrlResolved] = useState(false)
  const [displayImage, setDisplayImage] = useState<TilePatternSource | undefined>()
  const [crop, setCrop] = useState<LayoutPhotoCrop | null>(null)

  useEffect(() => {
    let cancelled = false
    setLayoutUrl(undefined)
    setUrlResolved(false)
    setDisplayImage(undefined)
    setCrop(null)

    if (!variantUrl || !variantId) {
      return () => {
        cancelled = true
      }
    }

    void resolveLayoutPhotoUrl(variantUrl, variantId, fallbackImageUrl).then((url) => {
      if (cancelled) return
      setLayoutUrl(url)
      setUrlResolved(true)
    })

    return () => {
      cancelled = true
    }
  }, [variantUrl, variantId, fallbackImageUrl])

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

  const photoImage = (
    (proxiedUrl && proxiedImage) ||
    (tryDirect && directImage) ||
    (catalogProxied && catalogImage) ||
    undefined
  ) as HTMLImageElement | undefined

  const activeUrl =
    (proxiedUrl && proxiedImage && layoutUrl) ||
    (tryDirect && directImage && layoutUrl) ||
    (catalogProxied && catalogImage && fallbackImageUrl) ||
    undefined

  useEffect(() => {
    if (!photoImage || !activeUrl) {
      setDisplayImage(undefined)
      setCrop(null)
      return
    }

    const cropOptions: LayoutPhotoCropOptions = { moduleWidthMm, moduleLengthMm }
    const cropKey = getCropCacheKey(activeUrl, cropOptions)
    const cachedCrop = cropCache.get(cropKey)
    if (cachedCrop) {
      setDisplayImage(photoImage)
      setCrop(cachedCrop)
      return
    }

    const nextCrop = extractLayoutPhotoCrop(photoImage, cropOptions)
    if (!nextCrop) {
      setDisplayImage(undefined)
      setCrop(null)
      return
    }

    cropCache.set(cropKey, nextCrop)
    setDisplayImage(photoImage)
    setCrop(nextCrop)
  }, [photoImage, activeUrl, moduleWidthMm, moduleLengthMm])

  const loading =
    Boolean(variantUrl && variantId) &&
    (!urlResolved ||
      (Boolean(layoutUrl) &&
        !photoImage &&
        (proxiedStatus === 'loading' ||
          (tryDirect && directStatus === 'loading') ||
          (tryCatalogFallback && catalogStatus === 'loading'))))

  if (loading) {
    return { image: undefined, crop: null, status: 'loading' }
  }

  if (displayImage && crop) {
    return { image: displayImage, crop, status: 'ready' }
  }

  return { image: undefined, crop: null, status: 'error' }
}
