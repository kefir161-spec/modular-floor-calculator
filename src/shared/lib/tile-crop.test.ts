import { describe, expect, it } from 'vitest'
import {
  buildSilhouetteMask,
  buildTileCrop,
  detectTileBodyRect,
  estimateBackgroundColor,
  fitAspectRect,
  fromNormalizedRect,
  measureBackgroundBleed,
  selectGridCell,
  toNormalizedRect,
  type RgbaImage,
} from './tile-crop'

type Rgb = [number, number, number]

function createImage(size: number, background: Rgb): RgbaImage & { set: (x: number, y: number, color: Rgb) => void } {
  const data = new Uint8ClampedArray(size * size * 4)
  for (let p = 0; p < size * size; p++) {
    data[p * 4] = background[0]
    data[p * 4 + 1] = background[1]
    data[p * 4 + 2] = background[2]
    data[p * 4 + 3] = 255
  }
  return {
    data,
    width: size,
    height: size,
    set(x, y, color) {
      const i = (y * size + x) * 4
      data[i] = color[0]
      data[i + 1] = color[1]
      data[i + 2] = color[2]
      data[i + 3] = 255
    },
  }
}

/** Квадратная плитка в центре кадра с пазловыми зубцами по краям. */
function createTilePhoto(options: {
  size?: number
  margin?: number
  tile: Rgb
  background?: Rgb
  holeStep?: number
}): RgbaImage {
  const size = options.size ?? 200
  const margin = options.margin ?? 30
  const image = createImage(size, options.background ?? [255, 255, 255])

  for (let y = margin; y < size - margin; y++) {
    for (let x = margin; x < size - margin; x++) {
      image.set(x, y, options.tile)
    }
  }

  // выемки пазла: фон, врезанный в край плитки
  for (let i = 0; i < 4; i++) {
    const from = margin + 10 + i * 30
    for (let d = 0; d < 10; d++) {
      for (let t = 0; t < 6; t++) {
        image.set(from + d, margin + t, options.background ?? [255, 255, 255])
        image.set(margin + t, from + d, options.background ?? [255, 255, 255])
      }
    }
  }

  // отверстия решётчатого модуля
  if (options.holeStep) {
    for (let y = margin + 12; y < size - margin - 12; y += options.holeStep) {
      for (let x = margin + 12; x < size - margin - 12; x += options.holeStep) {
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 4; dx++) {
            image.set(x + dx, y + dy, options.background ?? [255, 255, 255])
          }
        }
      }
    }
  }

  return { data: image.data, width: image.width, height: image.height }
}

describe('estimateBackgroundColor', () => {
  it('берёт цвет рамки кадра, а не плитки', () => {
    const image = createTilePhoto({ tile: [10, 20, 30] })
    expect(estimateBackgroundColor(image)).toEqual([255, 255, 255])
  })
})

describe('detectTileBodyRect', () => {
  it('находит область внутри плитки контрастного цвета', () => {
    const image = createTilePhoto({ tile: [20, 120, 200] })
    const rect = detectTileBodyRect(image)

    expect(rect).not.toBeNull()
    expect(rect!.sx).toBeGreaterThanOrEqual(30)
    expect(rect!.sx + rect!.sw).toBeLessThanOrEqual(170)
  })

  it('находит светлую плитку, почти совпадающую с фоном', () => {
    const image = createTilePhoto({ tile: [247, 247, 247] })
    const rect = detectTileBodyRect(image)

    expect(rect).not.toBeNull()
    expect(rect!.sw).toBeGreaterThan(100)
  })

  it('не принимает отверстия решётки за границу модуля', () => {
    const image = createTilePhoto({ tile: [180, 150, 110], holeStep: 12 })
    const rect = detectTileBodyRect(image)

    expect(rect).not.toBeNull()
    expect(rect!.sw).toBeGreaterThan(100)
  })

  it('возвращает null, когда фон занимает весь кадр', () => {
    const image = createImage(120, [255, 255, 255])
    expect(detectTileBodyRect({ data: image.data, width: 120, height: 120 })).toBeNull()
  })
})

describe('buildTileCrop', () => {
  it('не захватывает фон — иначе на схеме появятся светлые щели', () => {
    const image = createTilePhoto({ tile: [40, 90, 160] })
    const crop = buildTileCrop(image)

    expect(measureBackgroundBleed(image, crop)).toBe(0)
  })

  it('сохраняет пропорции модуля', () => {
    const image = createTilePhoto({ tile: [40, 90, 160] })
    const crop = buildTileCrop(image, 0.5)

    expect(crop.sw / crop.sh).toBeCloseTo(0.5, 2)
  })

  it('при ненайденном силуэте берёт центральную часть кадра', () => {
    const image = createImage(200, [255, 255, 255])
    const crop = buildTileCrop({ data: image.data, width: 200, height: 200 })

    expect(crop.sw).toBe(140)
    expect(crop.sx).toBe(30)
  })
})

describe('measureBackgroundBleed', () => {
  it('считает долю фона в области', () => {
    const image = createTilePhoto({ tile: [40, 90, 160] })
    const mask = buildSilhouetteMask(image)
    const wholeFrame = { sx: 0, sy: 0, sw: image.width, sh: image.height }

    expect(measureBackgroundBleed(image, wholeFrame, mask)).toBeGreaterThan(0.2)
  })
})

describe('selectGridCell', () => {
  it('берёт одну ячейку с фото, где снято несколько модулей', () => {
    const rect = { sx: 100, sy: 100, sw: 400, sh: 400 }
    expect(selectGridCell(rect, 2, 2)).toEqual({ sx: 100, sy: 100, sw: 200, sh: 200 })
  })

  it('оставляет область без изменений для одиночного модуля', () => {
    const rect = { sx: 10, sy: 10, sw: 80, sh: 80 }
    expect(selectGridCell(rect, 1, 1)).toBe(rect)
  })
})

describe('fitAspectRect', () => {
  it('вписывает вытянутый прямоугольник в квадрат', () => {
    const rect = fitAspectRect({ sx: 0, sy: 0, sw: 100, sh: 100 }, 0.5)
    expect(rect).toEqual({ sx: 25, sy: 0, sw: 50, sh: 100 })
  })
})

describe('нормированные координаты', () => {
  it('переводятся в пиксели любого разрешения', () => {
    const normalized = toNormalizedRect({ sx: 100, sy: 100, sw: 800, sh: 800 }, 1000, 1000)
    expect(fromNormalizedRect(normalized, 500, 500)).toEqual({ sx: 50, sy: 50, sw: 400, sh: 400 })
  })
})
