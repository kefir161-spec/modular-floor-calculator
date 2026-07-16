import { Group, Image } from 'react-konva'
import type { LayoutPhotoCrop, ModuleImageLayout, TilePatternSource } from '@/shared/lib/tile-texture'
import { getModuleImageLayout } from '@/shared/lib/tile-texture'

type Props = {
  width: number
  height: number
  x?: number
  y?: number
  tileImage: TilePatternSource
  crop: LayoutPhotoCrop
  imageLayout?: ModuleImageLayout | null
}

export function ModuleTextureRects({
  width,
  height,
  x = 0,
  y = 0,
  tileImage,
  crop,
  imageLayout,
}: Props) {
  const layout = imageLayout ?? getModuleImageLayout(width, height)

  return (
    <Group x={x} y={y}>
      <Image
        image={tileImage}
        crop={{ x: crop.sx, y: crop.sy, width: crop.sw, height: crop.sh }}
        x={layout.x}
        y={layout.y}
        width={layout.width}
        height={layout.height}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  )
}
