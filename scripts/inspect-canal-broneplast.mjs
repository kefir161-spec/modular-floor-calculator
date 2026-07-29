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

function extractFamilySlug(url) {
  return String(url).match(/\/catalog\/detail\/([^/]+)\//)?.[1] ?? 'unknown'
}

function getFamilyPageUrl(variantUrl) {
  return String(variantUrl).replace(/\?oID=\d+/, '').replace(/\?$/, '')
}

function extractCatalogElementJs(html) {
  const detailMatch = html.match(/var\s+\S+_detail\s*=\s*new JCCatalogElement\([\s\S]*?\);\s*/)
  if (detailMatch) return detailMatch[0]
  return html.match(/new JCCatalogElement\([\s\S]*?\);\s*/)?.[0]
}

function extractOfferIds(catalogElementJs) {
  return [...catalogElementJs.matchAll(/\{'ID':'(\d+)'[\s\S]*?'MORE_PHOTOS':\[/g)].map((m) => m[1])
}

function extractOfferPhotoPaths(catalogElementJs, variantId) {
  const offerChunk = catalogElementJs.match(
    new RegExp(`\\{'ID':'${variantId}'[\\s\\S]*?'MORE_PHOTOS':\\[([\\s\\S]*?)\\],'MORE_PHOTOS_COUNT'`),
  )
  if (!offerChunk) return []
  return [...new Set([...offerChunk[1].matchAll(/'SRC':'([^']+)'/g)].map((m) => m[1]))]
}

function normalizePhotoPaths(paths) {
  const byFile = new Map()
  for (const src of paths) {
    const file = src.split('/').pop() ?? src
    const score =
      (src.includes('1200_1200') ? 400 : 0) +
      (src.includes('511_500') ? 300 : 0) +
      (src.includes('/iblock/') && !src.includes('resize_cache') ? 200 : 0)
    const prev = byFile.get(file)
    if (!prev || score > prev.score) byFile.set(file, { src, score })
  }
  const ordered = []
  const seen = new Set()
  for (const src of paths) {
    const file = src.split('/').pop() ?? src
    if (seen.has(file)) continue
    seen.add(file)
    const best = byFile.get(file)
    if (best) ordered.push(best.src)
  }
  return ordered
}

const xml = fs.readFileSync(path.resolve(__dirname, '../public/data/plastfactor_catalog.xml'), 'utf8')
const map = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data/layout-textures.json'), 'utf8'))
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
const offers = asArray(parser.parse(xml).yml_catalog?.shop?.offers?.offer)

const targets = ['canal', 'broneplast']
const families = new Map()

for (const offer of offers) {
  const slug = extractFamilySlug(offer.url)
  if (!targets.some((t) => slug === t || slug.startsWith(t))) continue
  if (!families.has(slug)) {
    families.set(slug, {
      slug,
      url: getFamilyPageUrl(offer.url),
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
  console.log('\n==========', family.slug, '==========')
  const html = await fetch(family.url)
  const catalogJs = extractCatalogElementJs(html)
  const offerIds = extractOfferIds(catalogJs)

  for (const variant of family.variants) {
    const raw = extractOfferPhotoPaths(catalogJs, variant.id)
    const unique = normalizePhotoPaths(raw)
    const pictureFile = variant.picture?.split('/').pop()?.replace(/\.\w+$/, '')
    console.log('\n', variant.id, variant.name?.slice(0, 50))
    console.log('  picture:', pictureFile)
    unique.forEach((p, i) => {
      const file = p.split('/').pop()?.replace(/\.\w+$/, '')
      const matchPicture = pictureFile && file && (file === pictureFile || pictureFile.includes(file) || file.includes(pictureFile))
      console.log(`  [${i}]${matchPicture ? ' *pic*' : ''}`, file, p.includes('1200_1200') ? '1200' : p.includes('511_500') ? '511' : 'other')
    })
    console.log('  mapped:', variant.mapped?.split('/').pop())
    console.log('  mapped==[0]:', variant.mapped?.includes(unique[0]?.split('/').pop() ?? '___'))
    console.log('  mapped==[1]:', unique[1] ? variant.mapped?.includes(unique[1]?.split('/').pop() ?? '___') : false)
  }

  // cross-variant: which unique indices share same file across colors
  const byIndex = new Map()
  for (const variant of family.variants) {
    const unique = normalizePhotoPaths(extractOfferPhotoPaths(catalogJs, variant.id))
    unique.forEach((p, i) => {
      const file = p.split('/').pop()?.replace(/\.\w+$/, '')
      if (!byIndex.has(i)) byIndex.set(i, new Map())
      const m = byIndex.get(i)
      m.set(file, (m.get(file) ?? 0) + 1)
    })
  }
  console.log('\n  Index sharing across variants:')
  for (const [idx, files] of byIndex) {
    const entries = [...files.entries()]
    const uniqueFiles = entries.length
    const maxShared = Math.max(...entries.map(([, c]) => c))
    console.log(`    index ${idx}: ${uniqueFiles} unique files, max shared count ${maxShared}`)
  }
}
