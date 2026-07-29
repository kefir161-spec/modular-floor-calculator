import { resolvePublicUrl } from '@/shared/lib/urls'
import type { NormalizedRect } from '@/shared/lib/tile-crop'

/**
 * Область фронтального фото для раскладки, посчитанная офлайн
 * (scripts/build-tile-crops.ts) в долях кадра.
 *
 * fallback — силуэт модуля неотличим от фона (белый глянец на белом),
 * взята центральная часть кадра.
 */
export type StoredTileCrop = NormalizedRect & { fallback?: true }

let cropsPromise: Promise<Record<string, StoredTileCrop>> | null = null

function loadCrops(): Promise<Record<string, StoredTileCrop>> {
  if (!cropsPromise) {
    cropsPromise = fetch(resolvePublicUrl('data/layout-crops.json'))
      .then(async (response) => (response.ok ? response.json() : {}))
      .catch(() => ({}))
  }
  return cropsPromise
}

export async function resolveStoredTileCrop(variantId: string): Promise<StoredTileCrop | undefined> {
  const crops = await loadCrops()
  return crops[variantId]
}

export function clearStoredTileCropCache(): void {
  cropsPromise = null
}
