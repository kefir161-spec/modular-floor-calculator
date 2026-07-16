import { useMemo } from 'react'
import { Image } from 'react-konva'
import {
  buildFloorTiledTextureCanvas,
  getFullModulesBounds,
} from '@/shared/lib/floor-tiled-texture'
import type { LayoutPhotoCrop, TilePatternSource } from '@/shared/lib/tile-texture'
import type { LayoutModule } from '@/shared/types'

type Props = {
  modules: LayoutModule[]
  tileImage: TilePatternSource
  crop: LayoutPhotoCrop
  moduleWidthMm: number
}

export function FloorTiledTexture({ modules, tileImage, crop, moduleWidthMm }: Props) {
  const bounds = useMemo(() => getFullModulesBounds(modules), [modules])

  const canvas = useMemo(() => {
    if (!bounds) return null
    return buildFloorTiledTextureCanvas(modules, tileImage, crop, moduleWidthMm, bounds)
  }, [modules, tileImage, crop, moduleWidthMm, bounds])

  if (!bounds || !canvas) return null

  return (
    <Image
      x={bounds.x}
      y={bounds.y}
      width={bounds.widthMm}
      height={bounds.heightMm}
      image={canvas}
      listening={false}
      perfectDrawEnabled={false}
    />
  )
}
