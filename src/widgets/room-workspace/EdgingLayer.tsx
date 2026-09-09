import { Group, Line } from 'react-konva'
import type { EdgingPiece } from '@/shared/types'
import { KONVA_THEME } from '@/shared/config/tokens'

type Props = {
  pieces: EdgingPiece[]
  scale: number
}

function pieceFill(piece: EdgingPiece): string {
  if (piece.kind === 'corner') return KONVA_THEME.edgingCorner
  return piece.type === 1 ? KONVA_THEME.edgingStraight1 : KONVA_THEME.edgingStraight2
}

/**
 * Окантовка по периметру зоны укладки.
 * Каждый элемент рисуется отдельно, светлые стыки показывают их границы.
 */
export function EdgingLayer({ pieces, scale }: Props) {
  if (pieces.length === 0) return null

  return (
    <Group listening={false}>
      {pieces.map((piece) => (
        <Line
          key={piece.id}
          points={piece.polygon.flatMap((p) => [p.x, p.y])}
          closed
          fill={pieceFill(piece)}
          stroke={KONVA_THEME.edgingJoint}
          strokeWidth={1 / scale}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </Group>
  )
}
