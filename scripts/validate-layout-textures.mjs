/**
 * Проверяет layout-textures.json: у серий с разными picture в каталоге
 * не должно быть одной общей текстуры на полу (регресс Factor/City).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { XMLParser } from 'fast-xml-parser'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function asArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function extractFamilySlug(url) {
  const match = String(url).match(/\/catalog\/detail\/([^/]+)\//)
  return match?.[1] ?? 'unknown'
}

const xmlPath = path.resolve(__dirname, '../public/data/plastfactor_catalog.xml')
const mapPath = path.resolve(__dirname, '../public/data/layout-textures.json')
const xml = fs.readFileSync(xmlPath, 'utf8')
const mapping = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
const offers = asArray(parser.parse(xml).yml_catalog?.shop?.offers?.offer)

const families = new Map()
for (const offer of offers) {
  const url = offer.url
  const id = String(offer['@_id'] ?? '')
  if (!url || !id) continue
  const slug = extractFamilySlug(url)
  if (!families.has(slug)) {
    families.set(slug, { slug, offers: [] })
  }
  families.get(slug).offers.push({
    id,
    picture: asArray(offer.picture)[0],
    layoutUrl: mapping[id],
  })
}

let ok = 0
const problems = []
let missing = 0

for (const family of families.values()) {
  const withLayout = family.offers.filter((o) => o.layoutUrl)
  missing += family.offers.length - withLayout.length
  if (withLayout.length === 0) continue

  const uniqueLayout = new Set(withLayout.map((o) => o.layoutUrl)).size
  const uniquePictures = new Set(withLayout.map((o) => o.picture).filter(Boolean)).size

  if (uniquePictures > 1 && uniqueLayout === 1 && withLayout.length > 2) {
    problems.push({
      family: family.slug,
      offers: withLayout.length,
      uniquePictures,
      uniqueLayout,
    })
    continue
  }

  ok++
}

console.log(`families ok: ${ok}`)
console.log(`missing layout urls: ${missing}`)
if (problems.length === 0) {
  console.log('no color-collapse detected')
  process.exit(0)
}

console.error('COLOR COLLAPSE detected:')
for (const row of problems) {
  console.error(
    `  ${row.family}: ${row.offers} offers, catalog pictures=${row.uniquePictures}, layout textures=${row.uniqueLayout}`,
  )
}
process.exit(1)
