import fs from 'fs'

const html = fs.readFileSync('scripts/aqua-page.html', 'utf8')
const line = html.match(/var bx_117848907_4995_detail = new JCCatalogElement\([\s\S]*?\);\s*/)?.[0] ?? ''
console.log('line length', line.length)

const patterns = [
  'OFFERS',
  'DETAIL_PICTURE',
  'PREVIEW_PICTURE',
  'SLIDER',
  'MORE_PHOTO',
  'SKU_PROPS',
  'DISPLAY_PROPERTIES',
  'PROPERTIES',
  'TEXTURE',
  'SCHEME',
  'MODULE',
  'PLAN',
  'TOP_VIEW',
  'RAL',
  'TREE',
]

for (const p of patterns) {
  let idx = 0
  let count = 0
  while ((idx = line.indexOf(p, idx)) !== -1 && count < 3) {
    console.log(`\n[${p}] @${idx}:`, line.slice(idx, idx + 220).replace(/\s+/g, ' '))
    idx += p.length
    count++
  }
}

// extract all SRC urls from the catalog element block
const srcs = [...new Set([...line.matchAll(/'SRC':'([^']+)'/g)].map((m) => m[1]))]
console.log('\nSRC count', srcs.length)
srcs.forEach((s) => console.log(s))

// offer ids in block
const offerIds = [...line.matchAll(/'ID':'(\d+)'/g)].map((m) => m[1])
console.log('\nIDs in block', offerIds.length, offerIds.slice(0, 20))
