import fs from 'fs'

const html = fs.readFileSync('scripts/aqua-page.html', 'utf8')
const line = html.match(/var bx_117848907_4995_detail = new JCCatalogElement\([\s\S]*?\);\s*/)?.[0] ?? ''

const offerBlocks = [...line.matchAll(/\{'ID':'(\d+)','NAME':'([^']*)'[\s\S]*?'MORE_PHOTOS':\[([\s\S]*?)\],'MORE_PHOTOS_COUNT':'(\d+)'/g)]

console.log('offers with MORE_PHOTOS', offerBlocks.length)

for (const m of offerBlocks.slice(0, 5)) {
  const id = m[1]
  const name = m[2]
  const photosBlock = m[3]
  const count = m[4]
  const srcs = [...photosBlock.matchAll(/'SRC':'([^']+)'/g)].map((x) => x[1])
  const unique = [...new Set(srcs.filter((s) => s.includes('1200_1200')))]
  console.log('\n---', id, name, 'photos', count)
  unique.forEach((u, i) => console.log(i, u))
}

// specific offer from XML
const target = offerBlocks.find((m) => m[1] === '5339')
if (target) {
  const srcs = [...target[3].matchAll(/'SRC':'([^']+)'/g)].map((x) => x[1])
  const unique = [...new Set(srcs.filter((s) => s.includes('1200_1200')))]
  console.log('\n=== OFFER 5339 (beige aqua from XML) ===')
  unique.forEach((u, i) => console.log(i, u))
}

// search properties in offer block for texture-related fields
const offer5339 = line.match(/\{'ID':'5339'[\s\S]*?'MORE_PHOTOS_COUNT':'[^']*'/)?.[0] ?? ''
for (const key of ['DETAIL_PICTURE', 'PREVIEW_PICTURE', 'DISPLAY_PROPERTIES', 'PROPERTIES', 'SKU_LIST_CHARS']) {
  const idx = offer5339.indexOf(key)
  if (idx >= 0) console.log('\n5339', key, offer5339.slice(idx, idx + 400))
}
