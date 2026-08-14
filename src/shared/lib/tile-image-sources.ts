/**
 * Выбор источника фронтального фото модуля.
 *
 * Сайт отдаёт фото без заголовков CORS, поэтому пиксели доступны только через
 * прокси. Пиксели нужны дважды: для поиска области обрезки и для экспорта PNG/PDF
 * (tainted canvas ломает toDataURL). Поэтому прокси идёт первым.
 *
 * Но прокси — сторонний сервис: в части сетей он недоступен, а заблокированный
 * запрос не вызывает событие error. Раньше это навсегда оставляло пол без плитки,
 * поэтому прямая ссылка всегда остаётся запасным источником: экспорт на ней
 * недоступен, зато раскладка видна.
 */
import { loadFirstImage, type ImageCandidate, type LoadImageOptions } from './load-image'

export function requiresCrossOriginImageLoad(url: string): boolean {
  if (!url || url.startsWith('data:')) return false

  if (typeof window === 'undefined') {
    return !url.startsWith('/')
  }

  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin !== window.location.origin
  } catch {
    return true
  }
}

function resolveProxyUrl(url: string): string | null {
  if (!url.includes('plastfactor.com')) return null

  if (import.meta.env.DEV || import.meta.env.MODE === 'preview') {
    try {
      const { pathname, search } = new URL(url)
      return `/tile-image-proxy${pathname}${search}`
    } catch {
      return null
    }
  }

  const proxyMode = import.meta.env.VITE_TILE_IMAGE_PROXY ?? 'wsrv'
  if (proxyMode === 'none' || proxyMode === 'off') return null

  const encoded = encodeURIComponent(url)
  if (proxyMode === 'wsrv') return `https://wsrv.nl/?url=${encoded}&w=1200&output=jpg`
  if (proxyMode.includes('{url}')) return proxyMode.replace('{url}', encoded)

  return `${proxyMode}${encoded}`
}

/**
 * Прокси недоступен в этой сети: проверяем один раз за сеанс, иначе каждый модуль
 * ждал бы таймаут заново.
 */
let proxyBlocked = false

export function resetTileImageSources(): void {
  proxyBlocked = false
}

export function buildTileImageCandidates(url: string): ImageCandidate[] {
  if (!url || url.startsWith('data:')) return []

  const direct: ImageCandidate = { url }
  const proxyUrl = proxyBlocked ? null : resolveProxyUrl(url)
  if (!proxyUrl) return [direct]

  const proxied: ImageCandidate = requiresCrossOriginImageLoad(proxyUrl)
    ? { url: proxyUrl, crossOrigin: 'anonymous' }
    : { url: proxyUrl }

  return [proxied, direct]
}

/** Первый доступный источник фото. null — не удалось загрузить ни один. */
export async function loadTilePhoto(
  url: string,
  options: LoadImageOptions = {},
): Promise<HTMLImageElement | null> {
  const candidates = buildTileImageCandidates(url)
  const loaded = await loadFirstImage(candidates, options)
  if (!loaded) return null

  // Прямая ссылка сработала там, где прокси не смог — значит дело в прокси.
  if (candidates.length > 1 && loaded.candidate !== candidates[0]) {
    proxyBlocked = true
  }

  return loaded.image
}
