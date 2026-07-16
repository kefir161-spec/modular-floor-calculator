import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const xml = fs.readFileSync(
  path.resolve(__dirname, '../../PlastFactor_Cursor_bundle/plastfactor_catalog.xml'),
  'utf8',
)

const offers = [...xml.matchAll(/<offer id="(\d+)"[\s\S]*?<\/offer>/g)]
let multi = 0
const samples = []

for (const m of offers) {
  const id = m[1]
  const body = m[0]
  const pics = [...body.matchAll(/<picture>([^<]+)<\/picture>/g)].map((x) => x[1])
  if (pics.length > 1) {
    multi++
    if (samples.length < 8) {
      const name = body.match(/<name>([^<]+)/)?.[1]
      samples.push({ id, name, pics })
    }
  }
}

console.log('offers', offers.length, 'multiPicture', multi)
console.log(JSON.stringify(samples, null, 2))

const slugs = ['factor', 'sensor-tech', 'aqua', 'sporto.one']
for (const slug of slugs) {
  const hit = offers.find((m) => m[0].includes(`/detail/${slug}/`))
  if (!hit) continue
  const body = hit[0]
  const id = hit[1]
  const pics = [...body.matchAll(/<picture>([^<]+)<\/picture>/g)].map((x) => x[1])
  const name = body.match(/<name>([^<]+)/)?.[1]
  console.log('\n', slug, id, name)
  console.log(pics)
}
