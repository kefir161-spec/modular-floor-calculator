import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { loadCatalogFromString } from '@/shared/api/catalog/xml-source'
import { YmlCatalogAdapter } from '@/shared/api/catalog/normalize'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

describe('XML catalog integration', () => {
  it('loads and normalizes real catalog snapshot', () => {
    const xmlPath = resolve(rootDir, 'public/data/plastfactor_catalog.xml')
    const xml = readFileSync(xmlPath, 'utf8')
    expect(xml.length).toBeGreaterThan(1000)
    const raw = loadCatalogFromString(xml)
    expect(raw.yml_catalog?.shop).toBeDefined()
    const adapter = new YmlCatalogAdapter()
    const data = adapter.normalize(raw)

    expect(data.families.length).toBeGreaterThan(0)
    expect(data.families.some((f) => f.slug === 'factor')).toBe(true)
    expect(data.families.some((f) => f.slug.startsWith('taktil'))).toBe(false)

    const factor = data.families.find((f) => f.slug === 'factor')
    expect(factor?.variants[0]?.lengthMm).toBe(375)
    expect(factor?.variants[0]?.priceUnit).toBe('piece')
  })
})
