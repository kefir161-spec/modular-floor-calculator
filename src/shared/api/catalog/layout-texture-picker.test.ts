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

  it('для City берёт первое уникальное фото, если второе общее для всех цветов', () => {
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

    expect(orange).toBe('/upload/resize_cache/iblock/a/1200/orange.jpg')
  })
})
