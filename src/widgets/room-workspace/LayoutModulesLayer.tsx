import { Group, Line, Rect } from 'react-konva'
import type { LayoutModule, Polygon } from '@/shared/types'
import type { LayoutPhotoCrop, TilePatternSource } from '@/shared/lib/tile-texture'
import { differencePolygons } from '@/shared/geometry/layout'
import {
  CUT_VISUAL,
  getClippedRenderRect,
  getCutModuleImageLayout,
  getHatchLines,
  getSawCutEdges,
  toLocalPolygon,
} from './cut-module-visual'
import { FloorTiledTexture } from './FloorTiledTexture'
import { ModuleTextureRects } from './ModuleTextureRects'

type Props = {
  modules: LayoutModule[]
  showCutVisualization: boolean
  scale: number
  tileImage: TilePatternSource
  tileCrop: LayoutPhotoCrop
  moduleWidthMm: number
  moduleLengthMm: number
  centerModuleId?: string
}

function polygonPoints(poly: Polygon): number[] {
  return poly.flatMap((p) => [p.x, p.y])
}

function CutMarks({
  mod,
  clipped,
  renderRect,
  localClip,
}: {
  mod: LayoutModule
  clipped: Polygon
  renderRect: ReturnType<typeof getClippedRenderRect>
  localClip: number[]
}) {
  const sawEdges = getSawCutEdges(clipped, mod)
  const hatch = getHatchLines(renderRect.width, renderRect.height, CUT_VISUAL.hatchStepMm)
  const remnants = differencePolygons(mod.polygon, clipped)

  return (
    <>
      {/* Отрезанный «хвост» модуля — полупрозрачный контур */}
      {remnants.map((rem, i) => (
        <Group key={`rem-${i}`} listening={false}>
          <Line
            points={polygonPoints(rem)}
            closed
            fill={CUT_VISUAL.remnantFill}
            stroke={CUT_VISUAL.remnantStroke}
            strokeWidth={CUT_VISUAL.remnantStrokeWidth}
            dash={CUT_VISUAL.remnantDash}
            strokeScaleEnabled={false}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      ))}

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
          {hatch.map((line, i) => (
            <Line
              key={`h-${i}`}
              points={[line.x1, line.y1, line.x2, line.y2]}
              stroke={CUT_VISUAL.hatch}
              strokeWidth={1.25}
              opacity={CUT_VISUAL.hatchOpacity}
              strokeScaleEnabled={false}
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}
        </Group>

        {/* Контур оставшегося куска */}
        <Line
          points={localClip}
          closed
          stroke={CUT_VISUAL.stroke}
          strokeWidth={1.25}
          opacity={0.55}
          dash={CUT_VISUAL.dash}
          strokeScaleEnabled={false}
          listening={false}
          perfectDrawEnabled={false}
        />

        {/* Акцент на линии реза (внутри исходного модуля) */}
        {sawEdges.map((edge, i) => (
          <Line
            key={`saw-${i}`}
            points={[
              edge.x1 - renderRect.x,
              edge.y1 - renderRect.y,
              edge.x2 - renderRect.x,
              edge.y2 - renderRect.y,
            ]}
            stroke={CUT_VISUAL.stroke}
            strokeWidth={CUT_VISUAL.strokeWidth}
            dash={CUT_VISUAL.dash}
            lineCap="round"
            strokeScaleEnabled={false}
            listening={false}
            perfectDrawEnabled={false}
          />
        ))}
      </Group>
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
  const clipped =
    mod.clippedPolygon && mod.clippedPolygon.length >= 3 ? mod.clippedPolygon : null

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

  if (isCut) {
    const renderPoly = clipped ?? mod.polygon
    const renderRect = getClippedRenderRect(renderPoly)
    if (renderRect.width < 0.5 || renderRect.height < 0.5) return null
    const localClip = toLocalPolygon(renderPoly, renderRect.x, renderRect.y)

    return (
      <Group listening={false}>
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
          </Group>
        </Group>

        {showCut && clipped ? (
          <CutMarks
            mod={mod}
            clipped={clipped}
            renderRect={renderRect}
            localClip={localClip}
          />
        ) : null}

        {isCenter ? (
          <Group x={mod.x} y={mod.y}>
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
  showCutVisualization,
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
          showCut={showCutVisualization}
          isCenter={mod.id === centerModuleId}
          useFloorTexture={useFloorTexture}
        />
      ))}
    </Group>
  )
}
