import { Group, Line, Rect } from 'react-konva'
import type { LayoutModule, LayoutSettings } from '@/shared/types'
import type { LayoutPhotoCrop, TilePatternSource } from '@/shared/lib/tile-texture'
import {
  CUT_VISUAL,
  getClippedRenderRect,
  getCutModuleImageLayout,
  getCutOutlineEdges,
  toLocalPolygon,
} from './cut-module-visual'
import { FloorTiledTexture } from './FloorTiledTexture'
import { ModuleTextureRects } from './ModuleTextureRects'

type Props = {
  modules: LayoutModule[]
  layout: LayoutSettings
  scale: number
  tileImage: TilePatternSource
  tileCrop: LayoutPhotoCrop
  moduleWidthMm: number
  moduleLengthMm: number
  centerModuleId?: string
}

function CutOutline({ mod, rect }: { mod: LayoutModule; rect: ReturnType<typeof getClippedRenderRect> }) {
  const edges = getCutOutlineEdges(mod, rect)

  return (
    <>
      {edges.map((edge, index) => (
        <Line
          key={index}
          points={[edge.x1, edge.y1, edge.x2, edge.y2]}
          stroke={CUT_VISUAL.stroke}
          strokeWidth={CUT_VISUAL.strokeWidth}
          dash={CUT_VISUAL.dash}
          lineCap="butt"
          lineJoin="miter"
          strokeScaleEnabled={false}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </>
  )
}

function ModuleShape({
  mod,
  scale,
  tileImage,
  tileCrop,
  moduleWidthMm,
  moduleLengthMm,
  showCut,
  isCenter,
  useFloorTexture,
}: {
  mod: LayoutModule
  scale: number
  tileImage: TilePatternSource
  tileCrop: LayoutPhotoCrop
  moduleWidthMm: number
  moduleLengthMm: number
  showCut: boolean
  isCenter: boolean
  useFloorTexture: boolean
}) {
  const isCut = mod.status === 'cut'
  const clipped = mod.clippedPolygon && mod.clippedPolygon.length >= 3 ? mod.clippedPolygon : null

  const centerHighlight = isCenter ? (
    <Rect
      x={0}
      y={0}
      width={moduleWidthMm}
      height={moduleLengthMm}
      stroke="#f5c518"
      strokeWidth={2.5 / scale}
      listening={false}
    />
  ) : null

  if (isCut && clipped) {
    const renderRect = getClippedRenderRect(clipped)
    const localClip = toLocalPolygon(clipped, renderRect.x, renderRect.y)
    return (
      <Group x={renderRect.x} y={renderRect.y} listening={false}>
        <Group
          clipFunc={(ctx) => {
            ctx.beginPath()
            ctx.moveTo(localClip[0], localClip[1])
            for (let i = 2; i < localClip.length; i += 2) {
              ctx.lineTo(localClip[i], localClip[i + 1])
            }
            ctx.closePath()
          }}
        >
          <ModuleTextureRects
            width={renderRect.width}
            height={renderRect.height}
            tileImage={tileImage}
            crop={tileCrop}
            imageLayout={getCutModuleImageLayout(mod, renderRect)}
          />
          <Rect
            x={0}
            y={0}
            width={renderRect.width}
            height={renderRect.height}
            fill={CUT_VISUAL.hatch}
            opacity={CUT_VISUAL.hatchOpacity}
            listening={false}
          />
        </Group>
        {showCut ? <CutOutline mod={mod} rect={renderRect} /> : null}
        {isCenter ? (
          <Group x={mod.x - renderRect.x} y={mod.y - renderRect.y}>
            {centerHighlight}
          </Group>
        ) : null}
      </Group>
    )
  }

  if (mod.status === 'full' && useFloorTexture) {
    if (!isCenter) return null
    return (
      <Group x={mod.x} y={mod.y} listening={false}>
        {centerHighlight}
      </Group>
    )
  }

  return (
    <Group x={mod.x} y={mod.y} listening={false}>
      <ModuleTextureRects
        width={mod.widthMm}
        height={mod.lengthMm}
        tileImage={tileImage}
        crop={tileCrop}
      />
      {centerHighlight}
    </Group>
  )
}

export function LayoutModulesLayer({
  modules,
  layout,
  scale,
  tileImage,
  tileCrop,
  moduleWidthMm,
  moduleLengthMm,
  centerModuleId,
}: Props) {
  const visible = modules.filter((m) => m.status !== 'outside')
  const hasFullModules = visible.some((m) => m.status === 'full')
  const useFloorTexture = hasFullModules

  return (
    <Group>
      {useFloorTexture ? (
        <FloorTiledTexture
          modules={visible}
          tileImage={tileImage}
          crop={tileCrop}
          moduleWidthMm={moduleWidthMm}
        />
      ) : null}
      {visible.map((mod) => (
        <ModuleShape
          key={mod.id}
          mod={mod}
          scale={scale}
          tileImage={tileImage}
          tileCrop={tileCrop}
          moduleWidthMm={moduleWidthMm}
          moduleLengthMm={moduleLengthMm}
          showCut={layout.showCutVisualization}
          isCenter={mod.id === centerModuleId}
          useFloorTexture={useFloorTexture}
        />
      ))}
    </Group>
  )
}
