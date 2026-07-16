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

function extractOfferPhotoPaths(catalogElementJs, variantId) {
  const offerChunk = catalogElementJs.match(
    new RegExp(`\\{'ID':'${variantId}'[\\s\\S]*?'MORE_PHOTOS':\\[([\\s\\S]*?)\\],'MORE_PHOTOS_COUNT'`),
  )
  if (!offerChunk) return []
  return [...new Set([...offerChunk[1].matchAll(/'SRC':'([^']+)'/g)].map((m) => m[1]))]
}

const html = await fetch('https://plastfactor.com/catalog/detail/factor/')
const js = extractCatalogElementJs(html)
const paths = extractOfferPhotoPaths(js, '5200')
paths.forEach((p, i) => console.log(i, p))
