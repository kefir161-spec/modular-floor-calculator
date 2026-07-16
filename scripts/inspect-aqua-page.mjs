import https from 'https'
import fs from 'fs'

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

const html = await fetch('https://plastfactor.com/catalog/detail/aqua/')
fs.writeFileSync('scripts/aqua-page.html', html)

const keywords = [
  'TEXTURE',
  'texture',
  'scheme',
  'layout',
  'module',
  'MODULE',
  'tile',
  'TILE',
  'расклад',
  'текстур',
  'модул',
  'DETAIL_PICTURE',
  'MORE_PHOTO',
  'SLIDER',
  'offers',
  'SKU',
  'color',
  'COLOR',
  'resize_cache',
  'phoenix',
  '/upload/uf/',
]

for (const kw of keywords) {
  const idx = html.indexOf(kw)
  if (idx >= 0) {
    console.log('\n---', kw, '---')
    console.log(html.slice(Math.max(0, idx - 120), idx + 300).replace(/\s+/g, ' '))
  }
}

// extract script blocks with offer/color data
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((m) => m[1])
  .filter((s) => s.includes('upload') || s.includes('offer') || s.includes('COLOR'))

console.log('\nscript blocks with upload/offer:', scripts.length)
for (const s of scripts.slice(0, 5)) {
  console.log('\nSCRIPT SNIP:', s.slice(0, 800).replace(/\s+/g, ' '))
}
