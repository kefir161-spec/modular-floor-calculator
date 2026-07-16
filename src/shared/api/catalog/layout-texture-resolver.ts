import { resolvePublicUrl } from '@/shared/lib/urls'
import {
  detectSharedSecondBasenames,
  pickLayoutTexturePathForVariant,
  toAbsoluteLayoutTextureUrl,
} from './layout-texture-picker'
import {
  extractCatalogElementJs,
  extractOfferIds,
  extractOfferPhotoPaths,
  getFamilyPageUrl,
} from './layout-texture-html'

const cache = new Map<string, Promise<string | undefined>>()
let layoutTextureMapPromise: Promise<Record<string, string>> | null = null

async function loadLayoutTextureMap(): Promise<Record<string, string>> {
  if (!layoutTextureMapPromise) {
    layoutTextureMapPromise = fetch(resolvePublicUrl('data/layout-textures.json'))
      .then(async (response) => (response.ok ? response.json() : {}))
      .catch(() => ({}))
  }
  return layoutTextureMapPromise
}

export { getFamilyPageUrl, extractCatalogElementJs, extractOfferPhotoPaths } from './layout-texture-html'
export { pickLayoutTexturePath, normalizePhotoPaths } from './layout-texture-picker'

export function resolveLayoutTextureUrlFromHtml(
  html: string,
  variantId: string,
): string | undefined {
  const catalogJs = extractCatalogElementJs(html)
  if (!catalogJs) return undefined

  const offerIds = extractOfferIds(catalogJs)
  const sharedSecondBasenames = detectSharedSecondBasenames(
    offerIds.map((id) => extractOfferPhotoPaths(catalogJs, id)),
  )
  const photoPaths = extractOfferPhotoPaths(catalogJs, variantId)
  const picked = pickLayoutTexturePathForVariant(photoPaths, sharedSecondBasenames)
  if (!picked) return undefined

  return toAbsoluteLayoutTextureUrl(picked)
}

async function fetchFamilyHtml(familyUrl: string): Promise<string> {
  const response = await fetch(familyUrl, { credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`Не удалось загрузить страницу товара: ${response.status}`)
  }
  return response.text()
}

export async function resolveLayoutTextureUrl(
  variantUrl: string,
  variantId: string,
): Promise<string | undefined> {
  const cacheKey = `${variantUrl}|${variantId}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const promise = (async () => {
    const map = await loadLayoutTextureMap()
    if (map[variantId]) return map[variantId]

    try {
      const familyUrl = getFamilyPageUrl(variantUrl)
      const requestUrl =
        import.meta.env.DEV && familyUrl.includes('plastfactor.com')
          ? familyUrl.replace('https://plastfactor.com', '/pf-site')
          : familyUrl
      const html = await fetchFamilyHtml(requestUrl)
      return resolveLayoutTextureUrlFromHtml(html, variantId)
    } catch {
      return undefined
    }
  })()

  cache.set(cacheKey, promise)
  return promise
}

export function clearLayoutTextureCache(): void {
  cache.clear()
}
