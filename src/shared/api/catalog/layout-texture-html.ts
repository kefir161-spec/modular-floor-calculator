export function getFamilyPageUrl(variantUrl: string): string {
  try {
    const parsed = new URL(variantUrl)
    parsed.search = ''
    return parsed.toString()
  } catch {
    return variantUrl.replace(/\?oID=\d+/, '').replace(/\?$/, '')
  }
}

export function extractCatalogElementJs(html: string): string | undefined {
  const detailMatch = html.match(/var\s+\S+_detail\s*=\s*new JCCatalogElement\([\s\S]*?\);\s*/)
  if (detailMatch) return detailMatch[0]

  const fallback = html.match(/new JCCatalogElement\([\s\S]*?\);\s*/)
  return fallback?.[0]
}

export function extractOfferPhotoPaths(catalogElementJs: string, variantId: string): string[] {
  const offerChunk = catalogElementJs.match(
    new RegExp(`\\{'ID':'${variantId}'[\\s\\S]*?'MORE_PHOTOS':\\[([\\s\\S]*?)\\],'MORE_PHOTOS_COUNT'`),
  )
  if (!offerChunk) return []

  return [...offerChunk[1].matchAll(/'SRC':'([^']+)'/g)].map((m) => m[1])
}
