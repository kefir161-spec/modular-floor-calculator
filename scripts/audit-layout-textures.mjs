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

function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getFamilyPageUrl(variantUrl) {
  try {
    const parsed = new URL(variantUrl)
    parsed.search = ''
    return parsed.toString()
  } catch {
    return String(variantUrl).replace(/\?oID=\d+/, '').replace(/\?$/, '')
  }
}

function extractFamilySlug(url) {
  const match = String(url).match(/\/catalog\/detail\/([^/]+)\//)
  return match?.[1] ?? 'unknown'
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
  if (!offerChunk) return { paths: [], reason: 'no-offer-chunk' }
  const paths = [...new Set([...offerChunk[1].matchAll(/'SRC':'([^']+)'/g)].map((m) => m[1]))]
  if (paths.length === 0) return { paths: [], reason: 'no-photos' }
  return { paths, reason: 'ok' }
}

function pickLayoutTexturePath(photoPaths) {
  const hiRes = photoPaths.filter((src) => src.includes('1200_1200'))
  const pool = hiRes.length > 0 ? hiRes : photoPaths
  if (pool.length >= 2) return pool[1]
  return pool[0]
}

const xmlPath = path.resolve(__dirname, '../public/data/plastfactor_catalog.xml')
const mapPath = path.resolve(__dirname, '../public/data/layout-textures.json')
const xml = fs.readFileSync(xmlPath, 'utf8')
const existing = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
const offers = asArray(parser.parse(xml).yml_catalog?.shop?.offers?.offer)

const families = new Map()
for (const offer of offers) {
  const url = offer.url
  const id = offer['@_id']
  if (!url || !id) continue
  const slug = extractFamilySlug(url)
  if (!families.has(slug)) {
    families.set(slug, { slug, url: getFamilyPageUrl(url), variantIds: [] })
  }
  families.get(slug).variantIds.push(String(id))
}

const missingFamilies = [...families.values()].filter((f) =>
  f.variantIds.some((id) => !existing[id]),
)

console.log('families with missing textures:', missingFamilies.length)

for (const family of missingFamilies.slice(0, 5)) {
  const html = await fetch(family.url)
  const catalogJs = extractCatalogElementJs(html)
  if (!catalogJs) {
    console.log(family.slug, 'NO CATALOG JS')
    continue
  }
  const sampleId = family.variantIds.find((id) => !existing[id])
  const result = extractAllPhotoPaths(catalogJs, sampleId)
  const picked = pickLayoutTexturePath(result.paths)
  console.log(family.slug, sampleId, result.reason, 'photos:', result.paths.length, 'picked:', picked?.slice(0, 80))
}
