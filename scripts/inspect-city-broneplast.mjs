import fs from 'fs'
import https from 'https'
import path from 'path'
import { fileURLToPath } from 'url'
import { XMLParser } from 'fast-xml-parser'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

function head(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      res.resume()
      resolve(res.statusCode)
    })
    req.on('error', () => resolve(0))
    req.setTimeout(15000, () => {
      req.destroy()
      resolve(0)
    })
  })
}

function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function extractFamilySlug(url) {
  return String(url).match(/\/catalog\/detail\/([^/]+)\//)?.[1] ?? 'unknown'
}

function extractCatalogElementJs(html) {
  const detailMatch = html.match(/var\s+\S+_detail\s*=\s*new JCCatalogElement\([\s\S]*?\);\s*/)
  if (detailMatch) return detailMatch[0]
  return html.match(/new JCCatalogElement\([\s\S]*?\);\s*/)?.[0]
}

function extractOfferChunk(catalogElementJs, variantId) {
  return catalogElementJs.match(
    new RegExp(`\\{'ID':'${variantId}'[\\s\\S]*?'MORE_PHOTOS':\\[([\\s\\S]*?)\\],'MORE_PHOTOS_COUNT'`),
  )
}

function extractAllPhotoPaths(catalogElementJs, variantId) {
  const offerChunk = extractOfferChunk(catalogElementJs, variantId)
  if (!offerChunk) return []
  return [...new Set([...offerChunk[1].matchAll(/'SRC':'([^']+)'/g)].map((m) => m[1]))]
}

function wsrv(url) {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&output=jpg`
}

const xml = fs.readFileSync(path.resolve(__dirname, '../public/data/plastfactor_catalog.xml'), 'utf8')
const map = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/layout-textures.json'), 'utf8'))
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
const offers = asArray(parser.parse(xml).yml_catalog?.shop?.offers?.offer)

const targets = ['city', 'broneplast', 'city-decking']
const families = new Map()

for (const offer of offers) {
  const slug = extractFamilySlug(offer.url)
  if (!targets.some((t) => slug.startsWith(t))) continue
  if (!families.has(slug)) {
    families.set(slug, {
      slug,
      url: String(offer.url).replace(/\?oID=\d+/, '').replace(/\?$/, ''),
      variants: [],
    })
  }
  families.get(slug).variants.push({
    id: String(offer['@_id']),
    name: offer.name,
    picture: offer.picture,
    mapped: map[String(offer['@_id'])],
  })
}

for (const family of families.values()) {
  console.log('\n===', family.slug, '===')
  const html = await fetch(family.url)
  const catalogJs = extractCatalogElementJs(html)
  console.log('catalog js:', Boolean(catalogJs))

  for (const variant of family.variants.slice(0, 8)) {
    const photos = catalogJs ? extractAllPhotoPaths(catalogJs, variant.id) : []
    const mapped = variant.mapped
    const direct = mapped ? await head(mapped) : 0
    const proxy = mapped ? await head(wsrv(mapped)) : 0
    console.log({
      id: variant.id,
      name: variant.name?.slice(0, 40),
      photoCount: photos.length,
      photos: photos.map((p) => p.split('/').pop()),
      mappedTail: mapped?.split('/').pop(),
      direct,
      proxy,
      sameAsPicture: mapped === variant.picture,
    })
  }
}
