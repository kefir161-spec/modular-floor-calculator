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

export function basenameFromPath(path: string): string {
  return path.split('/').pop()?.replace(/\.\w+$/, '') ?? path
}

/**
 * На странице товара plastfactor.com у каждого SKU в MORE_PHOTOS:
 * [0] — перспективное фото (то же, что в XML <picture>), цветоспецифичное,
 * [1] — фронтальный вид сверху для раскладки.
 *
 * Если [1] общее для нескольких цветов с разными [0] (City, Factor и т.п.) —
 * всегда берём [0], иначе все цвета на полу схлопнутся в одну картинку.
 * Если [1] разное по цветам — берём [1] (лучшая фронталь для тайлинга).
 */
export function pickLayoutTexturePath(photoPaths: string[]): string | undefined {
  return pickLayoutTexturePathForVariant(photoPaths, new Set())
}

export function detectSharedSecondBasenames(variantsPhotos: string[][]): Set<string> {
  const secondToFirst = new Map<string, Set<string>>()

  for (const paths of variantsPhotos) {
    const unique = normalizePhotoPaths(paths)
    if (unique.length < 2) continue
    const firstBase = basenameFromPath(unique[0])
    const secondBase = basenameFromPath(unique[1])
    const firstSet = secondToFirst.get(secondBase) ?? new Set<string>()
    firstSet.add(firstBase)
    secondToFirst.set(secondBase, firstSet)
  }

  const shared = new Set<string>()
  for (const [secondBase, firstBases] of secondToFirst) {
    if (firstBases.size >= 2) {
      shared.add(secondBase)
    }
  }
  return shared
}

export function pickLayoutTexturePathForVariant(
  photoPaths: string[],
  sharedSecondBasenames: ReadonlySet<string>,
): string | undefined {
  const unique = normalizePhotoPaths(photoPaths)
  if (unique.length === 0) return undefined
  if (unique.length === 1) return unique[0]

  const secondBase = basenameFromPath(unique[1])
  if (sharedSecondBasenames.has(secondBase)) {
    return unique[0]
  }

  return unique[1]
}

export function toAbsoluteLayoutTextureUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `https://plastfactor.com${path}`
}
