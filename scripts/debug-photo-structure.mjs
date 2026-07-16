import https from 'https'

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => resolve(data))
      })
      .on('error', reject)
  })
}

function extractCatalogElementJs(html) {
  const detailMatch = html.match(/var\s+\S+_detail\s*=\s*new JCCatalogElement\([\s\S]*?\);\s*/)
  if (detailMatch) return detailMatch[0]
  return html.match(/new JCCatalogElement\([\s\S]*?\);\s*/)?.[0]
}

function extractRawPaths(catalogElementJs, variantId) {
  const offerChunk = catalogElementJs.match(
    new RegExp(`\\{'ID':'${variantId}'[\\s\\S]*?'MORE_PHOTOS':\\[([\\s\\S]*?)\\],'MORE_PHOTOS_COUNT'`),
  )
  if (!offerChunk) return []
  return [...offerChunk[1].matchAll(/'SRC':'([^']+)'/g)].map((m) => m[1])
}

function normalizePhotoPaths(paths) {
  const byFile = new Map()
  for (const src of paths) {
    const file = src.split('/').pop() ?? src
    const score =
      (src.includes('1200_1200') ? 400 : 0) +
      (src.includes('511_500') ? 300 : 0) +
      (src.includes('/iblock/') && !src.includes('resize_cache') ? 200 : 0) +
      (src.includes('160_120') ? 100 : 0)
    const prev = byFile.get(file)
    if (!prev || score > prev.score) byFile.set(file, { src, score })
  }
  return [...byFile.values()].map((v) => v.src)
}

function pickLayoutTexturePath(photoPaths) {
  const unique = normalizePhotoPaths(photoPaths)
  if (unique.length >= 2) return unique[1]
  return unique[0]
}

for (const [slug, id] of [
  ['sensor-avers', '5513'],
  ['factor', '5200'],
]) {
  const html = await fetch(`https://plastfactor.com/catalog/detail/${slug}/`)
  const js = extractCatalogElementJs(html)
  const raw = extractRawPaths(js, id)
  const unique = normalizePhotoPaths(raw)
  const picked = pickLayoutTexturePath(raw)
  console.log('\n', slug, id)
  console.log(' raw', raw.length, 'unique', unique.length)
  unique.forEach((p, i) => console.log(' ', i, p.includes('1200') ? '1200' : p.includes('511') ? '511' : 'orig', p.slice(-40)))
  console.log(' picked idx', unique.indexOf(picked), picked)
}
