import fs from 'fs'

const html = fs.readFileSync('scripts/aqua-page.html', 'utf8')
const match = html.match(/var bx_117848907_4995_detail = new JCCatalogElement\((\{[\s\S]*?\})\);/)
if (!match) {
  console.log('not found')
  process.exit(1)
}

const raw = match[1]
  .replace(/'/g, '"')
  .replace(/([{,]\s*)([A-Z_]+)(\s*:)/g, '$1"$2"$3')
  .replace(/,\s*}/g, '}')
  .replace(/,\s*]/g, ']')
  .replace(/:\s*'([^']*)'/g, ':"$1"')
  .replace(/:\s*([A-Z_]+)\s*([,}])/g, ':"$1"$2')

// simpler: extract OFFERS block manually
const offersMatch = raw.match(/OFFERS':\[([\s\S]*?)\],'OFFER_SELECTED/)
if (!offersMatch) {
  console.log('offers block not found')
  // try alternate key
  const idx = raw.indexOf("'OFFERS':")
  console.log('idx', idx)
  console.log(raw.slice(idx, idx + 5000))
  process.exit(1)
}

const offersRaw = offersMatch[1]
const offerChunks = [...offersRaw.matchAll(/\{'ID':'(\d+)'[\s\S]*?'NAME':'([^']*)'[\s\S]*?'DETAIL_PICTURE':\{[\s\S]*?'SRC':'([^']*)'[\s\S]*?'PREVIEW_PICTURE':\{[\s\S]*?'SRC':'([^']*)'/g)]

console.log('offers parsed', offerChunks.length)
for (const m of offerChunks.slice(0, 10)) {
  console.log({ id: m[1], name: m[2], detail: m[3], preview: m[4] })
}

// also search for layout/texture specific keys
for (const key of ['TEXTURE', 'SCHEME', 'LAYOUT', 'MODULE', 'TILE', 'PICTURE_TOP', 'PICTURE_PLAN']) {
  if (raw.includes(key)) console.log('found key', key)
}

// dump first offer chunk fully
const firstOffer = offersRaw.match(/\{[\s\S]*?\}/)
if (firstOffer) {
  console.log('\nFIRST OFFER KEYS SAMPLE:')
  console.log(firstOffer[0].slice(0, 2500))
}
