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
  'https://plastfactor.com/catalog/detail/factor/?oID=5200',
  'https://plastfactor.com/catalog/detail/sensor-tech/?oID=5697',
  'https://plastfactor.com/catalog/detail/aqua/?oID=5339',
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
  console.log('\n===', page, '===')
  console.log('images', urls.length)
  urls.forEach((u) => console.log(u))
}
