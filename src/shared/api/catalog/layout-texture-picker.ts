/**
 * Нормализует MORE_PHOTOS: одна запись на логическое фото, лучшее разрешение.
 * Порядок первого появления сохраняется — [0] перспектива, [1] фронталь.
 */
export function normalizePhotoPaths(paths: string[]): string[] {
  const byFile = new Map<string, { src: string; score: number }>()

  for (const src of paths) {
    const file = src.split('/').pop() ?? src
    const score =
      (src.includes('1200_1200') ? 400 : 0) +
      (src.includes('511_500') ? 300 : 0) +
      (src.includes('/iblock/') && !src.includes('resize_cache') ? 200 : 0) +
      (src.includes('160_120') ? 100 : 0)

    const prev = byFile.get(file)
    if (!prev || score > prev.score) {
      byFile.set(file, { src, score })
    }
  }

  const ordered: string[] = []
  const seen = new Set<string>()

  for (const src of paths) {
    const file = src.split('/').pop() ?? src
    if (seen.has(file)) continue
    seen.add(file)
    const best = byFile.get(file)
    if (best) ordered.push(best.src)
  }

  return ordered
}

/**
 * На странице товара plastfactor.com у каждого SKU в MORE_PHOTOS:
 * [0] — перспективное фото (то же, что в XML <picture>),
 * [1] — фронтальный вид сверху для раскладки.
 */
export function pickLayoutTexturePath(photoPaths: string[]): string | undefined {
  const unique = normalizePhotoPaths(photoPaths)
  if (unique.length >= 2) return unique[1]
  return unique[0]
}

export function toAbsoluteLayoutTextureUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `https://plastfactor.com${path}`
}
