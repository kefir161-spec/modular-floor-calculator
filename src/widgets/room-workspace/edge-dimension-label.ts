import type { Point, Polygon } from '@/shared/types'
import { formatLength, pointInPolygon } from '@/shared/geometry/polygon'

export type EdgeLabelPlacement = {
  /** Центр подписи в мм комнаты */
  x: number
  y: number
  text: string
  /** Размер шрифта в координатах сцены (мм), чтобы на экране было ~screenFontPx */
  fontSize: number
  boxWidth: number
  boxHeight: number
}

const SCREEN_FONT_PX = 13
const SCREEN_PAD_PX = 5
const SCREEN_GAP_PX = 10

/**
 * Подпись стороны снаружи контура.
 * Размеры задаются в экранных px и делятся на scale Stage — иначе Math.min(16)
 * даёт нечитаемый текст при zoom out.
 */
export function getEdgeLabelPlacement(
  polygon: Polygon,
  edgeIndex: number,
  options: {
    scale: number
    withLetter?: boolean
    unit?: 'mm' | 'm'
  },
): EdgeLabelPlacement | null {
  if (polygon.length < 2) return null
  const i = ((edgeIndex % polygon.length) + polygon.length) % polygon.length
  const a = polygon[i]
  const b = polygon[(i + 1) % polygon.length]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const edgeLen = Math.hypot(dx, dy)
  if (edgeLen < 1) return null

  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2

  let nx = dy / edgeLen
  let ny = -dx / edgeLen
  const probeMm = Math.max(edgeLen * 0.02, 20)
  if (pointInPolygon({ x: mx + nx * probeMm, y: my + ny * probeMm }, polygon)) {
    nx = -nx
    ny = -ny
  }

  const withLetter = options.withLetter ?? false
  const unit = options.unit ?? 'mm'
  const letter = String.fromCharCode(65 + (i % 26))
  const text = withLetter ? `${letter} · ${formatLength(edgeLen, unit)}` : formatLength(edgeLen, unit)

  const scale = Math.max(options.scale, 0.001)
  const fontSize = SCREEN_FONT_PX / scale
  const pad = SCREEN_PAD_PX / scale
  const charW = fontSize * 0.62
  const boxWidth = text.length * charW + pad * 2
  const boxHeight = fontSize + pad * 2

  const gap = SCREEN_GAP_PX / scale
  const shortBoost = edgeLen < 1400 ? 6 / scale : 0
  const offset = boxHeight / 2 + gap + shortBoost

  return {
    x: mx + nx * offset,
    y: my + ny * offset,
    text,
    fontSize,
    boxWidth,
    boxHeight,
  }
}

export function edgeLabelTopLeft(placement: EdgeLabelPlacement): Point {
  return {
    x: placement.x - placement.boxWidth / 2,
    y: placement.y - placement.boxHeight / 2,
  }
}
