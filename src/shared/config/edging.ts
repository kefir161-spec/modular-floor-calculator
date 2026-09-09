import type {
  CardinalDirection,
  EdgingColorGroup,
  EdgingCornerType,
  EdgingSettings,
  EdgingStraightType,
  EdgingThickness,
} from '@/shared/types'

/** Единственная серия с окантовочными элементами. */
export const EDGING_FAMILY_SLUG = 'optima-duos'

/**
 * Габариты окантовочных элементов Optima, мм.
 * Прямой: толщина × 45 × 250. Угловой: толщина × 45 × 125 × 125,
 * где 125 — плечо вдоль каждой из двух сторон поля укладки.
 */
export const EDGING_GEOMETRY = {
  widthMm: 45,
  straightLengthMm: 250,
  cornerLegMm: 125,
} as const

export const EDGING_THICKNESSES: readonly EdgingThickness[] = [9, 16]

export const DEFAULT_EDGING: EdgingSettings = {
  enabled: false,
  thicknessMm: 9,
}

export function isEdgingThickness(value: number | undefined): value is EdgingThickness {
  return value === 9 || value === 16
}

/**
 * Прямой кант по стороне поля укладки.
 * У плитки Optima Duos «гвоздики» на двух смежных сторонах и «дырочки» на двух других,
 * поэтому верхняя и левая стороны поля требуют кант №2, нижняя и правая — кант №1.
 * Источник: инструкция производителя по креплению кантов.
 */
export const EDGING_STRAIGHT_TYPE_BY_SIDE: Record<CardinalDirection, EdgingStraightType> = {
  north: 2,
  west: 2,
  south: 1,
  east: 1,
}

/**
 * Угловой кант по паре сторон, сходящихся во внешнем углу 90°.
 * Ключ — стороны в алфавитном порядке (см. cornerKey).
 */
export const EDGING_CORNER_TYPE_BY_SIDES: Record<string, EdgingCornerType> = {
  'north|west': 4,
  'east|north': 2,
  'east|south': 3,
  'south|west': 1,
}

export function cornerKey(a: CardinalDirection, b: CardinalDirection): string {
  return [a, b].sort().join('|')
}

export const EDGING_COLOR_LABELS: Record<EdgingColorGroup, string> = {
  black: 'чёрный',
  colored: 'цветной',
}

/**
 * Прайс производителя: чёрный кант дешевле цветного, толщина на цену не влияет.
 * Цвет канта на первом этапе совпадает с выбранной плиткой.
 */
export const EDGING_PRICES: Record<EdgingColorGroup, { straight: number; corner: number }> = {
  black: { straight: 66, corner: 136 },
  colored: { straight: 74, corner: 148 },
}

/** «Чёрный RAL 9005» и варианты написания — чёрный кант, остальное цветное. */
export function resolveEdgingColorGroup(colorName?: string): EdgingColorGroup {
  if (colorName && /ч[её]рн|black/i.test(colorName)) return 'black'
  return 'colored'
}
