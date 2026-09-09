import { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Line, Circle, Text, Rect, Group } from 'react-konva'
import type Konva from 'konva'
import {
  selectCanRedo,
  selectCanRedoPaint,
  selectCanUndo,
  selectCanUndoPaint,
  useCalculatorStore,
} from '@/app/store/calculator-store'
import { KONVA_THEME, tokens } from '@/shared/config/tokens'
import { findFamilyByVariant, findLayoutModuleAt, modulePaintKey, paintPalette } from '@/shared/lib/paint'
import { usePaletteTileImages, useTileImage } from '@/shared/lib/use-tile-image'
import { computeFitTransform, type ViewTransform } from '@/shared/lib/canvas-view'
import {
  formatArea,
  formatLength,
  getBoundingBox,
  isPolygonValid,
} from '@/shared/geometry/polygon'
import { differencePolygons, findCenterModuleId } from '@/shared/geometry/layout'
import {
  createDefaultObstacle,
  createDefaultOpening,
  openingSegment,
  obstacleWallOffsets,
} from '@/shared/geometry/obstacles'
import { insertVertexOnEdge, removeVertex, snapVertexDrag } from '@/shared/geometry/polygon-edit'
import { edgeLabelTopLeft, getEdgeLabelPlacement, getVertexAnglePlacement } from './edge-dimension-label'
import { useToast } from '@/shared/ui/Toast'
import { LayoutModulesLayer } from './LayoutModulesLayer'
import { EdgingLayer } from './EdgingLayer'
import { CanvasToolbar } from './CanvasToolbar'
import { PolygonToolsBar } from './PolygonToolsBar'
import { BrushPalette } from './BrushPalette'
import { LayoutSettingsPopover } from './LayoutSettingsPopover'
import { useCanvasViewController } from './use-canvas-view-controller'
import styles from './RoomWorkspace.module.scss'

const DEFAULT_CANVAS_SIZE = { width: 900, height: 560 }
const EMPTY_COLOR_PALETTE: ReturnType<typeof paintPalette> = []

const OBSTACLE_FILL = 'rgba(71, 84, 103, 0.28)'
const OBSTACLE_STROKE = tokens.color.textMuted
const OPENING_STROKE = tokens.color.brandText

export type StageExportApi = {
  stage: Konva.Stage
  getFitTransform: () => ViewTransform
}

export function RoomWorkspace({
  onStageReady,
}: {
  onStageReady?: (api: StageExportApi) => void
}) {
  const room = useCalculatorStore((s) => s.room)
  const workingContour = useCalculatorStore((s) => s.workingContour)
  const calculation = useCalculatorStore((s) => s.calculation)
  const layout = useCalculatorStore((s) => s.layout)
  const display = useCalculatorStore((s) => s.display)
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const setContour = useCalculatorStore((s) => s.setContour)
  const applyContour = useCalculatorStore((s) => s.applyContour)
  const commitContourHistory = useCalculatorStore((s) => s.commitContourHistory)
  const undoContour = useCalculatorStore((s) => s.undoContour)
  const redoContour = useCalculatorStore((s) => s.redoContour)
  const undoPaint = useCalculatorStore((s) => s.undoPaint)
  const redoPaint = useCalculatorStore((s) => s.redoPaint)
  const paintModule = useCalculatorStore((s) => s.paintModule)
  const commitPaintStroke = useCalculatorStore((s) => s.commitPaintStroke)
  const setPaintColorId = useCalculatorStore((s) => s.setPaintColorId)
  const colorOverrides = useCalculatorStore((s) => s.colorOverrides)
  const paintColorId = useCalculatorStore((s) => s.paintColorId)
  const catalog = useCalculatorStore((s) => s.catalog)
  const canUndoContour = useCalculatorStore(selectCanUndo)
  const canRedoContour = useCalculatorStore(selectCanRedo)
  const canUndoPaint = useCalculatorStore(selectCanUndoPaint)
  const canRedoPaint = useCalculatorStore(selectCanRedoPaint)
  const canvasMode = useCalculatorStore((s) => s.ui.canvasMode)
  const fullscreen = useCalculatorStore((s) => s.ui.fullscreen)
  const roomConfigured = useCalculatorStore((s) => s.ui.roomConfigured)
  const polygonTool = useCalculatorStore((s) => s.ui.polygonTool)
  const snapOrtho = useCalculatorStore((s) => s.ui.snapOrtho)
  const snapGridMm = useCalculatorStore((s) => s.ui.snapGridMm)
  const selectedEdgeIndex = useCalculatorStore((s) => s.ui.selectedEdgeIndex)
  const selectedObstacleId = useCalculatorStore((s) => s.ui.selectedObstacleId)
  const setUi = useCalculatorStore((s) => s.setUi)
  const addObstacle = useCalculatorStore((s) => s.addObstacle)
  const updateObstacle = useCalculatorStore((s) => s.updateObstacle)
  const addOpening = useCalculatorStore((s) => s.addOpening)
  const toast = useToast()

  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE)
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null)
  const [pixelRatio] = useState(() =>
    typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1,
  )
  const stageRef = useRef<Konva.Stage>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const fitRef = useRef<ViewTransform>({ scale: 0.1, x: 0, y: 0 })
  const paintingRef = useRef(false)

  const moduleWidthMm =
    selectedVariant && layout.rotation === 90
      ? selectedVariant.lengthMm
      : selectedVariant?.widthMm
  const moduleLengthMm =
    selectedVariant && layout.rotation === 90
      ? selectedVariant.widthMm
      : selectedVariant?.lengthMm
  const { image: tileImage, crop: tileCrop, status: tileStatus } = useTileImage(
    selectedVariant?.url,
    selectedVariant?.id,
    moduleWidthMm,
    moduleLengthMm,
    selectedVariant?.imageUrl,
  )
  const colorPalette = useMemo(() => {
    if (!catalog || !selectedVariant) return EMPTY_COLOR_PALETTE
    const family = findFamilyByVariant(catalog.families, selectedVariant)
    return family ? paintPalette(family, selectedVariant) : EMPTY_COLOR_PALETTE
  }, [catalog, selectedVariant])
  const showBrush = colorPalette.length >= 2
  const brushActive = canvasMode === 'edit' && polygonTool === 'brush'
  const paletteTextures = usePaletteTileImages(
    polygonTool === 'brush' || Object.keys(colorOverrides).length > 0
      ? colorPalette
      : EMPTY_COLOR_PALETTE,
    moduleWidthMm,
    moduleLengthMm,
  )

  const bbox = getBoundingBox(room.contour)
  const polygonEdit = room.shapeType === 'polygon'
  const editActive = canvasMode === 'edit'
  const contourValid = isPolygonValid(room.contour)
  const obstacles = room.obstacles ?? []
  const openings = room.openings ?? []

  const fitTransform = useMemo(
    () =>
      computeFitTransform(bbox, canvasSize, {
        showDimensions: display.showDimensions,
        paddingPx: 10,
      }),
    [bbox, canvasSize, display.showDimensions],
  )
  fitRef.current = fitTransform

  const { stageTransform, resetView, zoomIn, zoomOut } = useCanvasViewController({
    fit: fitTransform,
    mode: canvasMode,
    stageRef,
    bindKey: `${canvasSize.width}x${canvasSize.height}`,
  })

  const { scale, x: positionX, y: positionY } = stageTransform

  useEffect(() => {
    const el = canvasWrapRef.current
    if (!el) return

    let raf = 0
    const updateSize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const width = Math.max(280, Math.floor(el.clientWidth))
        const height = Math.max(320, Math.floor(el.clientHeight))
        setCanvasSize((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height },
        )
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !onStageReady) return
    onStageReady({
      stage,
      getFitTransform: () => fitRef.current,
    })
  }, [onStageReady, room.contour, calculation?.layout.modules.length, selectedVariant?.id, fitTransform])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUi({ fullscreen: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen, setUi])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return
      }
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      const paintHistory = polygonTool === 'brush'
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (paintHistory) undoPaint()
        else undoContour()
        return
      }
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        if (paintHistory) redoPaint()
        else redoContour()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undoContour, redoContour, undoPaint, redoPaint, polygonTool])

  useEffect(() => {
    if (polygonTool === 'brush' && colorPalette.length < 2) {
      setUi({ polygonTool: 'select' })
    }
  }, [colorPalette.length, polygonTool, setUi])

  useEffect(() => {
    const endStroke = () => {
      if (!paintingRef.current) return
      paintingRef.current = false
      commitPaintStroke()
    }
    window.addEventListener('pointerup', endStroke)
    window.addEventListener('pointercancel', endStroke)
    return () => {
      window.removeEventListener('pointerup', endStroke)
      window.removeEventListener('pointercancel', endStroke)
    }
  }, [commitPaintStroke])

  const contourPoints = room.contour.flatMap((p) => [p.x, p.y])
  const workingPoints =
    workingContour.success ? workingContour.polygon.flatMap((p) => [p.x, p.y]) : []

  const gapPolygons = useMemo(() => {
    if (!workingContour.success || room.gapMm <= 0) return []
    return differencePolygons(room.contour, workingContour.polygon)
  }, [room.contour, room.gapMm, workingContour])

  const centerModuleId = useMemo(() => {
    if (!calculation?.layout.modules.length) return undefined
    const bb = calculation.layout.boundingBox
    return findCenterModuleId(
      calculation.layout.modules,
      bb.minX,
      bb.minY,
      bb.maxX,
      bb.maxY,
    )
  }, [calculation?.layout])

  const ariaDescription = useMemo(() => {
    const shapeHint =
      room.shapeType === 'polygon'
        ? 'Стороны можно задать числом в панели помещения; вершины на схеме перетаскиваются мышью.'
        : 'Размеры задаются полями ширины и длины в панели помещения.'

    if (calculation) {
      return [
        `Схема укладки: площадь помещения ${formatArea(calculation.roomAreaSqm)},`,
        `зона укладки ${formatArea(calculation.workingAreaSqm)},`,
        `к покупке ${calculation.modulesWithWasteCount} плиток`,
        `(${calculation.fullModulesCount} целых, ${calculation.cutModulesCount} с подрезкой).`,
        calculation.edging
          ? `Окантовка по периметру: ${calculation.edging.straightTotal} прямых и ${calculation.edging.cornerTotal} угловых кантов.`
          : '',
        shapeHint,
      ]
        .filter(Boolean)
        .join(' ')
    }
    if (selectedVariant && !roomConfigured) {
      return `Выбрано покрытие. ${shapeHint}`
    }
    if (selectedVariant) {
      return `Покрытие выбрано. ${shapeHint}`
    }
    return 'Выберите покрытие в каталоге, затем укажите размеры помещения.'
  }, [calculation, selectedVariant, room.shapeType, roomConfigured])

  const showTexture =
    Boolean(calculation && selectedVariant && workingContour.success && tileImage && tileCrop)

  const edgingPieces = calculation?.edging?.pieces ?? []

  const showVertices =
    editActive &&
    !brushActive &&
    (polygonEdit || polygonTool === 'add-vertex' || polygonTool === 'remove-vertex')

  const obstacleDraggable =
    editActive && !brushActive && (polygonTool === 'select' || polygonTool === 'obstacle')

  const paintAtPointer = () => {
    const stage = stageRef.current
    const modules = calculation?.layout.modules
    if (!stage || !modules?.length) return
    const pos = stage.getRelativePointerPosition()
    if (!pos) return
    const mod = findLayoutModuleAt(modules, pos.x, pos.y)
    if (!mod) return
    paintModule(modulePaintKey(mod))
  }

  const handleBrushPointerDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true
    e.evt.preventDefault()
    paintingRef.current = true
    paintAtPointer()
  }

  const handleBrushPointerMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!paintingRef.current) return
    e.cancelBubble = true
    e.evt.preventDefault()
    paintAtPointer()
  }

  const handleEdgeClick = (edgeIndex: number, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true
    if (!editActive || brushActive) return

    if (polygonTool === 'add-vertex') {
      const next = insertVertexOnEdge(room.contour, edgeIndex)
      applyContour(next, 'polygon')
      setUi({ selectedEdgeIndex: edgeIndex })
      return
    }

    if (polygonTool === 'opening') {
      addOpening(createDefaultOpening(room.contour, edgeIndex))
      setUi({ selectedEdgeIndex: edgeIndex })
      return
    }

    setUi({ selectedEdgeIndex: edgeIndex })
  }

  const handleVertexClick = (vertexIndex: number, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true
    if (!editActive || brushActive) return

    if (polygonTool === 'remove-vertex') {
      const next = removeVertex(room.contour, vertexIndex)
      if (!next) {
        toast.push('Нельзя удалить вершину: останется меньше трёх или контур станет некорректным', 'warning')
        return
      }
      applyContour(next, 'polygon')
      setSelectedVertex(null)
      return
    }

    setSelectedVertex(vertexIndex)
  }

  const handleEmptyClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!editActive || polygonTool !== 'obstacle') return
    if (e.target.name() !== 'empty-hit') return
    e.cancelBubble = true

    const stage = stageRef.current
    if (!stage) return
    const pos = stage.getRelativePointerPosition()
    if (!pos) return

    const draft = createDefaultObstacle(room.contour)
    addObstacle({
      ...draft,
      x: pos.x - draft.widthMm / 2,
      y: pos.y - draft.lengthMm / 2,
    })
  }

  return (
    <div className={`${styles.workspace} ${fullscreen ? styles.workspaceFullscreen : ''}`.trim()}>
      <div
        className={`${styles.canvasWrap} ${brushActive ? styles.canvasBrush : ''}`.trim()}
        ref={canvasWrapRef}
      >
        <div className={styles.floatingChrome}>
          <CanvasToolbar
            mode={canvasMode}
            onModeChange={(mode) => setUi({ canvasMode: mode })}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onFit={resetView}
            onToggleFullscreen={() => setUi({ fullscreen: !fullscreen })}
            fullscreen={fullscreen}
            onUndo={brushActive ? undoPaint : undoContour}
            onRedo={brushActive ? redoPaint : redoContour}
            canUndo={brushActive ? canUndoPaint : canUndoContour}
            canRedo={brushActive ? canRedoPaint : canRedoContour}
          />
          {editActive ? (
            <PolygonToolsBar
              tool={polygonTool}
              onToolChange={(tool) => {
                if (polygonTool === 'brush' && tool !== 'brush') commitPaintStroke()
                setUi({ polygonTool: tool })
              }}
              snapOrtho={snapOrtho}
              onSnapOrthoChange={(value) => setUi({ snapOrtho: value })}
              snapGridMm={snapGridMm}
              onSnapGridChange={(mm) => setUi({ snapGridMm: mm })}
              showBrush={showBrush}
            />
          ) : null}
          <LayoutSettingsPopover />
        </div>
        {editActive && brushActive ? (
          <div className={styles.paletteDock}>
            <BrushPalette
              colors={colorPalette}
              selectedId={paintColorId}
              onSelect={setPaintColorId}
            />
          </div>
        ) : null}

        <div className={styles.htmlOverlay}>
          {!contourValid ? (
            <div className={styles.warningBanner} role="alert">
              Контур самопересекается или некорректен — расчёт недоступен. Исправьте форму.
            </div>
          ) : null}
          {selectedVariant && calculation ? (
            <>
              <div className={styles.legend}>
                <span className={styles.legendFull}>целые</span>
                <span className={styles.legendCut}>подрезка</span>
                <span className={styles.legendCenter}>центр</span>
                {calculation.edging ? (
                  <>
                    <span className={styles.legendEdgingStraight1}>кант №1</span>
                    <span className={styles.legendEdgingStraight2}>кант №2</span>
                    <span className={styles.legendEdgingCorner}>угловой</span>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <span className={styles.canvasHint}>
              {!selectedVariant
                ? 'Выберите покрытие'
                : !roomConfigured
                  ? 'Укажите размеры помещения'
                  : 'Задайте параметры для расчёта'}
            </span>
          )}
          {tileStatus === 'loading' ? (
            <span className={styles.textureLoading} role="status">
              Загрузка текстуры…
            </span>
          ) : null}
          {tileStatus === 'error' && selectedVariant ? (
            <span className={styles.textureError} role="status">
              Изображение недоступно
            </span>
          ) : null}
        </div>

        <Stage
          ref={stageRef}
          width={canvasSize.width}
          height={canvasSize.height}
          scaleX={scale}
          scaleY={scale}
          x={positionX}
          y={positionY}
          pixelRatio={pixelRatio}
          aria-label="Схема раскладки напольного покрытия"
        >
          <Layer listening={false}>
            <Rect
              x={bbox.minX - 400}
              y={bbox.minY - 400}
              width={bbox.maxX - bbox.minX + 800}
              height={bbox.maxY - bbox.minY + 800}
              fill={KONVA_THEME.canvasBackground}
              listening={false}
            />

            <Line
              points={contourPoints}
              closed
              stroke={KONVA_THEME.contour}
              strokeWidth={2.5 / scale}
              fill={KONVA_THEME.contourFill}
            />

            {selectedEdgeIndex !== null &&
              room.contour[selectedEdgeIndex] &&
              (() => {
                const a = room.contour[selectedEdgeIndex]
                const b = room.contour[(selectedEdgeIndex + 1) % room.contour.length]
                return (
                  <Line
                    points={[a.x, a.y, b.x, b.y]}
                    stroke={KONVA_THEME.contour}
                    strokeWidth={5 / scale}
                    lineCap="round"
                    listening={false}
                  />
                )
              })()}

            {gapPolygons.map((gap, i) => (
              <Line
                key={`gap-${i}`}
                points={gap.flatMap((p) => [p.x, p.y])}
                closed
                fill="rgba(29, 79, 122, 0.18)"
                stroke="rgba(29, 79, 122, 0.35)"
                strokeWidth={1 / scale}
                listening={false}
              />
            ))}

            {showTexture ? (
              <LayoutModulesLayer
                modules={calculation!.layout.modules}
                showCutVisualization={display.showCutVisualization}
                scale={scale}
                tileImage={tileImage!}
                tileCrop={tileCrop!}
                moduleWidthMm={moduleWidthMm ?? 500}
                moduleLengthMm={moduleLengthMm ?? 500}
                centerModuleId={centerModuleId}
                colorOverrides={colorOverrides}
                paletteTextures={paletteTextures}
              />
            ) : null}

            {edgingPieces.length > 0 ? (
              <EdgingLayer pieces={edgingPieces} scale={scale} />
            ) : null}

            {workingContour.success ? (
              <Line
                points={workingPoints}
                closed
                stroke={KONVA_THEME.working}
                strokeWidth={1.5 / scale}
                dash={[8 / scale, 4 / scale]}
                listening={false}
              />
            ) : null}

            {openings.map((opn) => {
              const seg = openingSegment(room.contour, opn)
              if (!seg) return null
              return (
                <Line
                  key={`opening-${opn.id}`}
                  points={[seg.start.x, seg.start.y, seg.end.x, seg.end.y]}
                  stroke={OPENING_STROKE}
                  strokeWidth={6 / scale}
                  lineCap="butt"
                  listening={false}
                />
              )
            })}

            {display.showDimensions &&
              room.contour.map((_, i) => {
                const placement = getEdgeLabelPlacement(room.contour, i, {
                  scale,
                  withLetter: room.shapeType === 'polygon' || room.contour.length !== 4,
                })
                if (!placement) return null
                const origin = edgeLabelTopLeft(placement)
                const strokeW = 1 / scale
                const radius = 4 / scale
                return (
                  <Group key={`dim-${i}`} listening={false}>
                    <Rect
                      x={origin.x}
                      y={origin.y}
                      width={placement.boxWidth}
                      height={placement.boxHeight}
                      fill="rgba(255,255,255,0.95)"
                      cornerRadius={radius}
                      stroke="rgba(16,24,40,0.12)"
                      strokeWidth={strokeW}
                      shadowColor="rgba(16,24,40,0.12)"
                      shadowBlur={4 / scale}
                      shadowOffsetY={1 / scale}
                      shadowOpacity={1}
                      listening={false}
                    />
                    <Text
                      x={origin.x}
                      y={origin.y}
                      width={placement.boxWidth}
                      height={placement.boxHeight}
                      text={placement.text}
                      fontSize={placement.fontSize}
                      fontFamily="system-ui, Segoe UI, sans-serif"
                      fontStyle="600"
                      fill={KONVA_THEME.text}
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  </Group>
                )
              })}

            {display.showDimensions &&
              (room.shapeType === 'polygon' || room.contour.length !== 4) &&
              room.contour.map((_, i) => {
                const placement = getVertexAnglePlacement(room.contour, i, { scale })
                if (!placement) return null
                const origin = edgeLabelTopLeft(placement)
                const strokeW = 1 / scale
                const radius = 4 / scale
                return (
                  <Group key={`ang-${i}`} listening={false}>
                    <Rect
                      x={origin.x}
                      y={origin.y}
                      width={placement.boxWidth}
                      height={placement.boxHeight}
                      fill="rgba(255,255,255,0.92)"
                      cornerRadius={radius}
                      stroke="rgba(16,24,40,0.1)"
                      strokeWidth={strokeW}
                      listening={false}
                    />
                    <Text
                      x={origin.x}
                      y={origin.y}
                      width={placement.boxWidth}
                      height={placement.boxHeight}
                      text={placement.text}
                      fontSize={placement.fontSize}
                      fontFamily="system-ui, Segoe UI, sans-serif"
                      fontStyle="600"
                      fill={KONVA_THEME.text}
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  </Group>
                )
              })}
          </Layer>

          <Layer listening={editActive}>
            {editActive ? (
              <Rect
                name="empty-hit"
                x={bbox.minX - 400}
                y={bbox.minY - 400}
                width={bbox.maxX - bbox.minX + 800}
                height={bbox.maxY - bbox.minY + 800}
                fill="transparent"
                onClick={handleEmptyClick}
                onTap={handleEmptyClick}
              />
            ) : null}

            {editActive &&
              !brushActive &&
              room.contour.map((point, i) => {
                const next = room.contour[(i + 1) % room.contour.length]
                return (
                  <Line
                    key={`edge-hit-${i}`}
                    points={[point.x, point.y, next.x, next.y]}
                    stroke="transparent"
                    strokeWidth={Math.max(14, 18 / scale)}
                    onClick={(e) => handleEdgeClick(i, e)}
                    onTap={(e) => handleEdgeClick(i, e)}
                  />
                )
              })}

            {editActive &&
              !brushActive &&
              polygonTool === 'add-vertex' &&
              room.contour.map((point, i) => {
                const next = room.contour[(i + 1) % room.contour.length]
                const mx = (point.x + next.x) / 2
                const my = (point.y + next.y) / 2
                return (
                  <Circle
                    key={`mid-${i}`}
                    x={mx}
                    y={my}
                    radius={Math.max(5, 8 / scale)}
                    fill={tokens.color.brand}
                    stroke="#fff"
                    strokeWidth={2 / scale}
                    onClick={(e) => handleEdgeClick(i, e)}
                    onTap={(e) => handleEdgeClick(i, e)}
                  />
                )
              })}

            {obstacles.map((obs) => {
              const selected = selectedObstacleId === obs.id
              return (
                <Rect
                  key={obs.id}
                  name={`obstacle-${obs.id}`}
                  x={obs.x}
                  y={obs.y}
                  width={obs.widthMm}
                  height={obs.lengthMm}
                  fill={OBSTACLE_FILL}
                  stroke={selected ? tokens.color.brandText : OBSTACLE_STROKE}
                  strokeWidth={(selected ? 2.5 : 1.5) / scale}
                  draggable={obstacleDraggable}
                  onClick={(e) => {
                    e.cancelBubble = true
                    if (!editActive) return
                    setUi({
                      selectedObstacleId: obs.id,
                      ...(polygonTool === 'obstacle' ? { polygonTool: 'select' as const } : {}),
                    })
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true
                    if (!editActive) return
                    setUi({ selectedObstacleId: obs.id })
                  }}
                  onDragEnd={(e) => {
                    updateObstacle(obs.id, { x: e.target.x(), y: e.target.y() })
                  }}
                />
              )
            })}

            {editActive &&
              selectedObstacleId &&
              (() => {
                const obs = obstacles.find((o) => o.id === selectedObstacleId)
                if (!obs) return null
                const off = obstacleWallOffsets(room.contour, obs)
                const stroke = tokens.color.brandText
                const fontSize = Math.max(11, 12 / scale)
                const midY = obs.y + obs.lengthMm / 2
                const midX = obs.x + obs.widthMm / 2
                return (
                  <>
                    <Line
                      points={[bbox.minX, midY, obs.x, midY]}
                      stroke={stroke}
                      strokeWidth={1.25 / scale}
                      dash={[6 / scale, 4 / scale]}
                      listening={false}
                    />
                    <Text
                      x={bbox.minX + off.fromLeftMm / 2 - 36 / scale}
                      y={midY - fontSize - 2 / scale}
                      width={72 / scale}
                      align="center"
                      text={formatLength(Math.max(0, off.fromLeftMm), 'mm')}
                      fontSize={fontSize}
                      fill={stroke}
                      listening={false}
                    />
                    <Line
                      points={[midX, bbox.minY, midX, obs.y]}
                      stroke={stroke}
                      strokeWidth={1.25 / scale}
                      dash={[6 / scale, 4 / scale]}
                      listening={false}
                    />
                    <Text
                      x={midX - 36 / scale}
                      y={bbox.minY + off.fromTopMm / 2 - fontSize / 2}
                      width={72 / scale}
                      align="center"
                      text={formatLength(Math.max(0, off.fromTopMm), 'mm')}
                      fontSize={fontSize}
                      fill={stroke}
                      listening={false}
                    />
                  </>
                )
              })()}

            {showVertices &&
              room.contour.map((point, i) => (
                <Circle
                  key={`v-${i}`}
                  x={point.x}
                  y={point.y}
                  radius={Math.max(6, 10 / scale)}
                  fill={selectedVertex === i ? '#c2410c' : '#e07a2f'}
                  stroke="#fff"
                  strokeWidth={(selectedVertex === i ? 3 : 2) / scale}
                  draggable={polygonTool === 'select' || polygonTool === 'add-vertex'}
                  onClick={(e) => handleVertexClick(i, e)}
                  onTap={(e) => handleVertexClick(i, e)}
                  onDragMove={(e) => {
                    setSelectedVertex(i)
                    const raw = { x: e.target.x(), y: e.target.y() }
                    const snapped = snapVertexDrag(room.contour, i, raw, {
                      ortho: snapOrtho,
                      gridMm: snapGridMm,
                    })
                    e.target.position(snapped)
                    const next = room.contour.map((p, j) => (j === i ? snapped : p))
                    setContour(next)
                  }}
                    onDragEnd={commitContourHistory}
                />
              ))}

            {editActive && brushActive ? (
              <Rect
                name="brush-hit"
                x={bbox.minX - 400}
                y={bbox.minY - 400}
                width={bbox.maxX - bbox.minX + 800}
                height={bbox.maxY - bbox.minY + 800}
                fill="transparent"
                onMouseDown={handleBrushPointerDown}
                onTouchStart={handleBrushPointerDown}
                onMouseMove={handleBrushPointerMove}
                onTouchMove={handleBrushPointerMove}
              />
            ) : null}
          </Layer>
        </Stage>

        {polygonEdit && canvasMode === 'edit' ? (
          <details className={styles.vertexA11y}>
            <summary>Координаты вершин</summary>
            <p className={styles.vertexHint}>
              Альтернатива перетаскиванию: числа или стрелки на поле Y (Shift — шаг 50 мм).
            </p>
            <div className={styles.vertexList}>
              {room.contour.map((point, i) => (
                <label key={i} className={styles.vertexField}>
                  <span>V{i + 1}</span>
                  <input
                    type="number"
                    aria-label={`Вершина ${i + 1}, X мм`}
                    value={Math.round(point.x)}
                    onFocus={() => setSelectedVertex(i)}
                    onChange={(e) => {
                      const x = Number(e.target.value)
                      if (!Number.isFinite(x)) return
                      const next = room.contour.map((p, j) => (j === i ? { ...p, x } : p))
                      setContour(next)
                    }}
                    onBlur={commitContourHistory}
                  />
                  <input
                    type="number"
                    aria-label={`Вершина ${i + 1}, Y мм`}
                    value={Math.round(point.y)}
                    onFocus={() => setSelectedVertex(i)}
                    onChange={(e) => {
                      const y = Number(e.target.value)
                      if (!Number.isFinite(y)) return
                      const next = room.contour.map((p, j) => (j === i ? { ...p, y } : p))
                      setContour(next)
                    }}
                    onBlur={commitContourHistory}
                    onKeyDown={(e) => {
                      if (selectedVertex !== i) return
                      const step = e.shiftKey ? 50 : 10
                      let dx = 0
                      let dy = 0
                      if (e.key === 'ArrowLeft') dx = -step
                      else if (e.key === 'ArrowRight') dx = step
                      else if (e.key === 'ArrowUp') dy = -step
                      else if (e.key === 'ArrowDown') dy = step
                      else return
                      e.preventDefault()
                      const next = room.contour.map((p, j) =>
                        j === i ? { x: p.x + dx, y: p.y + dy } : p,
                      )
                      setContour(next)
                    }}
                  />
                </label>
              ))}
            </div>
          </details>
        ) : null}

        <p className="sr-only" aria-live="polite">
          {ariaDescription}
        </p>
      </div>
    </div>
  )
}
