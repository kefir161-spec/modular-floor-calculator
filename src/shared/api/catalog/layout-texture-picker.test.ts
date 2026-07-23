import { describe, expect, it } from 'vitest'
import {
  basenameFromPath,
  detectSharedSecondBasenames,
  normalizePhotoPaths,
  pickLayoutTexturePath,
  pickLayoutTexturePathForVariant,
} from './layout-texture-picker'

describe('layout-texture-picker', () => {
  it('схлопывает размеры одного фото и сохраняет порядок', () => {
    const paths = [
      '/upload/iblock/a/a1.jpg',
      '/upload/resize_cache/iblock/a/511_500_x/a1.jpg',
      '/upload/resize_cache/iblock/a/1200_1200_x/a1.jpg',
      '/upload/iblock/b/b2.jpg',
      '/upload/resize_cache/iblock/b/511_500_x/b2.jpg',
    ]

    expect(normalizePhotoPaths(paths)).toEqual([
      '/upload/resize_cache/iblock/a/1200_1200_x/a1.jpg',
      '/upload/resize_cache/iblock/b/511_500_x/b2.jpg',
    ])
  })

  it('берёт второе уникальное фото как фронтальное', () => {
    const picked = pickLayoutTexturePath([
      '/upload/iblock/a/photo1.jpg',
      '/upload/resize_cache/iblock/a/511_500_x/photo1.jpg',
      '/upload/iblock/b/photo2.jpg',
      '/upload/resize_cache/iblock/b/511_500_x/photo2.jpg',
    ])

    expect(picked).toBe('/upload/resize_cache/iblock/b/511_500_x/photo2.jpg')
  })

  it('если [1] общее для разных цветов — берёт цветоспецифичное [0] (City/Factor)', () => {
    const shared = detectSharedSecondBasenames([
      [
        '/upload/resize_cache/iblock/a/1200/orange.jpg',
        '/upload/resize_cache/iblock/b/1200/shared-front.jpg',
      ],
      [
        '/upload/resize_cache/iblock/a/1200/blue.jpg',
        '/upload/resize_cache/iblock/b/1200/shared-front.jpg',
      ],
    ])

    expect(shared.has(basenameFromPath('/upload/resize_cache/iblock/b/1200/shared-front.jpg'))).toBe(
      true,
    )

    const orange = pickLayoutTexturePathForVariant(
      [
        '/upload/resize_cache/iblock/a/1200/orange.jpg',
        '/upload/resize_cache/iblock/b/1200/shared-front.jpg',
      ],
      shared,
    )
    const blue = pickLayoutTexturePathForVariant(
      [
        '/upload/resize_cache/iblock/a/1200/blue.jpg',
        '/upload/resize_cache/iblock/b/1200/shared-front.jpg',
      ],
      shared,
    )

    expect(orange).toBe('/upload/resize_cache/iblock/a/1200/orange.jpg')
    expect(blue).toBe('/upload/resize_cache/iblock/a/1200/blue.jpg')
    expect(orange).not.toBe(blue)
  })

  it('для Factor с общим фронталом не схлопывает цвета в одну картинку', () => {
    const variants = [
      ['/upload/a/red.jpg', '/upload/b/factor-shared.jpg'],
      ['/upload/a/green.jpg', '/upload/b/factor-shared.jpg'],
      ['/upload/a/blue.jpg', '/upload/b/factor-shared.jpg'],
    ]
    const shared = detectSharedSecondBasenames(variants)
    const urls = variants.map((paths) => pickLayoutTexturePathForVariant(paths, shared))

    expect(new Set(urls).size).toBe(3)
    expect(urls).toEqual(['/upload/a/red.jpg', '/upload/a/green.jpg', '/upload/a/blue.jpg'])
  })
})
