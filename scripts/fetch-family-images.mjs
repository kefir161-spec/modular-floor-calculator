import https from 'https'

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

const pages = [
  'https://plastfactor.com/catalog/detail/factor/',
  'https://plastfactor.com/catalog/detail/aqua/',
  'https://plastfactor.com/catalog/detail/sensor-tech/',
  'https://plastfactor.com/catalog/for-playgrounds/',
]

for (const page of pages) {
  const html = await fetch(page)
  const urls = [
    ...new Set(
      [...html.matchAll(/https:\/\/plastfactor\.com\/upload\/[^"'\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map(
        (m) => m[0],
      ),
    ),
  ]
  const jsonUrls = [
    ...new Set(
      [...html.matchAll(/\/upload\/[^"'\\s>]+\.(?:jpg|jpeg|png|webp)/gi)].map(
        (m) => `https://plastfactor.com${m[0]}`,
      ),
    ),
  ]
  const all = [...new Set([...urls, ...jsonUrls])]
  console.log('\n===', page, '===')
  console.log('images', all.length)
  all.slice(0, 20).forEach((u) => console.log(u))
  if (all.length > 20) console.log('...')
}
