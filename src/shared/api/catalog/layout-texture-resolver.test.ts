import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import {
  extractCatalogElementJs,
  extractOfferPhotoPaths,
  pickLayoutTexturePath,
  resolveLayoutTextureUrlFromHtml,
} from './layout-texture-resolver'
import { normalizePhotoPaths } from './layout-texture-picker'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtureHtml = fs.readFileSync(path.resolve(__dirname, '../../../../scripts/aqua-page.html'), 'utf8')

describe('layout-texture-resolver', () => {
  it('берёт фронтальное фото [1], а не перспективу [0]', () => {
    const catalogJs = extractCatalogElementJs(fixtureHtml)
    expect(catalogJs).toBeTruthy()

    const paths = extractOfferPhotoPaths(catalogJs!, '5339')
    const unique = normalizePhotoPaths(paths)
    expect(unique.length).toBeGreaterThanOrEqual(2)

    const picked = pickLayoutTexturePath(paths)
    expect(picked).toBe(unique[1])
    expect(picked).toContain('/upload/resize_cache/iblock/04f/')
    expect(unique[0]).toContain('/upload/resize_cache/iblock/5ec/')
  })

  it('собирает абсолютный URL для раскладки', () => {
    const url = resolveLayoutTextureUrlFromHtml(fixtureHtml, '5339')
    expect(url).toBe(
      'https://plastfactor.com/upload/resize_cache/iblock/04f/1200_1200_140cd750bba9870f18aada2478b24840a/v4nbb4swcp25intsmfj9xfvmvxwnp4ps.jpg',
    )
  })
})
