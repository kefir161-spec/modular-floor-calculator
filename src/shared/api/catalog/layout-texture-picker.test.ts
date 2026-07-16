import { describe, expect, it } from 'vitest'
import {
  normalizePhotoPaths,
  pickLayoutTexturePath,
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
})
