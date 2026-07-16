import fs from 'fs'
import https from 'https'
import path from 'path'
import { fileURLToPath } from 'url'
import { XMLParser } from 'fast-xml-parser'
import {
  extractCatalogElementJs,
  extractOfferPhotoPaths,
  getFamilyPageUrl,
} from '../src/shared/api/catalog/layout-texture-html'
import {
  pickLayoutTexturePath,
  toAbsoluteLayoutTextureUrl,
} from '../src/shared/api/catalog/layout-texture-picker'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function fetch(url: string): Promise<string> {
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

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function extractFamilySlug(url: string): string {
  const match = String(url).match(/\/catalog\/detail\/([^/]+)\//)
  return match?.[1] ?? 'unknown'
}

const xmlPath = path.resolve(__dirname, '../public/data/plastfactor_catalog.xml')
const xml = fs.readFileSync(xmlPath, 'utf8')
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
const raw = parser.parse(xml)
const offers = asArray(raw.yml_catalog?.shop?.offers?.offer)

const families = new Map<string, { slug: string; url: string; variantIds: string[] }>()
for (const offer of offers) {
  const url = offer.url as string | undefined
  const id = offer['@_id'] as string | undefined
  if (!url || !id) continue
  const slug = extractFamilySlug(url)
  if (!families.has(slug)) {
    families.set(slug, { slug, url: getFamilyPageUrl(url), variantIds: [] })
  }
  families.get(slug)!.variantIds.push(String(id))
}

const mapping: Record<string, string> = {}
const missing: Array<{ family: string; variantId: string; reason: string }> = []
let processed = 0

for (const family of families.values()) {
  try {
    const html = await fetch(family.url)
    const catalogJs = extractCatalogElementJs(html)
    if (!catalogJs) {
      for (const variantId of family.variantIds) {
        missing.push({ family: family.slug, variantId, reason: 'no-catalog-js' })
      }
      console.warn('skip', family.slug, 'no catalog js')
      continue
    }

    for (const variantId of family.variantIds) {
      const paths = extractOfferPhotoPaths(catalogJs, variantId)
      const picked = pickLayoutTexturePath(paths)
      if (!picked) {
        missing.push({ family: family.slug, variantId, reason: 'no-photos' })
        continue
      }
      mapping[variantId] = toAbsoluteLayoutTextureUrl(picked)
      processed++
    }
    console.log('ok', family.slug, family.variantIds.length)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    for (const variantId of family.variantIds) {
      missing.push({ family: family.slug, variantId, reason: `fetch-failed:${message}` })
    }
    console.warn('fail', family.slug, message)
  }
}

const outPath = path.resolve(__dirname, '../public/data/layout-textures.json')
const auditPath = path.resolve(__dirname, '../public/data/layout-textures-audit.json')
fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2))
fs.writeFileSync(
  auditPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalOffers: offers.length,
      mappedVariants: processed,
      missingVariants: missing.length,
      missing,
    },
    null,
    2,
  ),
)

console.log('saved', processed, 'variants to', outPath)
console.log('missing', missing.length, 'see', auditPath)
