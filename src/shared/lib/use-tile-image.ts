import { useEffect, useState } from 'react'
import useImage from 'use-image'
import { resolveLayoutTextureUrl } from '@/shared/api/catalog/layout-texture-resolver'
import {
  extractLayoutPhotoCrop,
  requiresCrossOriginImageLoad,
  resolveTileImageUrl,
  trimLayoutPhoto,
  type LayoutPhotoCrop,
  type TilePatternSource,
} from './tile-texture'

export type TileImageStatus = 'loading' | 'ready' | 'error'

type TileImageState = {
  image: TilePatternSource | undefined
  crop: LayoutPhotoCrop | null
  status: TileImageStatus
}

const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
const URL_CACHE_VERSION = 13

const urlCache = new Map<string, string>()
const trimmedCache = new Map<string, TilePatternSource>()

function getUrlCacheKey(variantId: string): string {
  return `${URL_CACHE_VERSION}:${variantId}`
}

export function clearTileImageCache(): void {
  urlCache.clear()
  trimmedCache.clear()
}

async function resolveLayoutPhotoUrl(
  variantUrl: string,
  variantId: string,
): Promise<string | undefined> {
  const cached = urlCache.get(getUrlCacheKey(variantId))
  if (cached) return cached

  const layoutUrl = await resolveLayoutTextureUrl(variantUrl, variantId)
  if (layoutUrl) {
    urlCache.set(getUrlCacheKey(variantId), layoutUrl)
  }
  return layoutUrl
}

export function useTileImage(variantUrl?: string, variantId?: string): TileImageState {
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

    void resolveLayoutPhotoUrl(variantUrl, variantId).then((url) => {
      if (cancelled) return
      setLayoutUrl(url)
      setUrlResolved(true)
    })

    return () => {
      cancelled = true
    }
  }, [variantUrl, variantId])

  const proxiedUrl = layoutUrl ? resolveTileImageUrl(layoutUrl) : undefined
  const useCrossOrigin = proxiedUrl ? requiresCrossOriginImageLoad(proxiedUrl) : false

  const [proxiedImage, proxiedStatus] = useImage(
    proxiedUrl || EMPTY_IMAGE,
    useCrossOrigin ? 'anonymous' : undefined,
  )

  const tryDirect = proxiedStatus === 'failed' && layoutUrl && import.meta.env.DEV
  const [directImage, directStatus] = useImage(tryDirect ? layoutUrl : EMPTY_IMAGE)

  const photoImage = (
    (proxiedUrl && proxiedImage) || (tryDirect && directImage) || undefined
  ) as HTMLImageElement | undefined

  useEffect(() => {
    if (!photoImage || !layoutUrl) {
      setDisplayImage(undefined)
      setCrop(null)
      return
    }

    const cached = trimmedCache.get(layoutUrl)
    if (cached) {
      setDisplayImage(cached)
      setCrop(
        cached instanceof HTMLCanvasElement
          ? { sx: 0, sy: 0, sw: cached.width, sh: cached.height }
          : extractLayoutPhotoCrop(cached),
      )
      return
    }

    const trimmed = trimLayoutPhoto(photoImage)
    if (trimmed) {
      trimmedCache.set(layoutUrl, trimmed)
      setDisplayImage(trimmed)
      setCrop({ sx: 0, sy: 0, sw: trimmed.width, sh: trimmed.height })
      return
    }

    const nextCrop = extractLayoutPhotoCrop(photoImage)
    if (!nextCrop) {
      setDisplayImage(undefined)
      setCrop(null)
      return
    }

    trimmedCache.set(layoutUrl, photoImage)
    setDisplayImage(photoImage)
    setCrop(nextCrop)
  }, [photoImage, layoutUrl])

  const loading =
    Boolean(variantUrl && variantId) &&
    (!urlResolved ||
      (Boolean(layoutUrl) &&
        !photoImage &&
        (proxiedStatus === 'loading' || (tryDirect && directStatus === 'loading'))))

  if (loading) {
    return { image: undefined, crop: null, status: 'loading' }
  }

  if (displayImage && crop) {
    return { image: displayImage, crop, status: 'ready' }
  }

  return { image: undefined, crop: null, status: 'error' }
}
