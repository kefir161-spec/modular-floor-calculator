import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Line, Circle, Text, Group, Rect } from 'react-konva'
import type Konva from 'konva'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { Button } from '@/shared/ui/Button/Button'
import { Input } from '@/shared/ui/Input/Input'
import { KONVA_THEME } from '@/shared/config/theme'
import { useTileImage } from '@/shared/lib/use-tile-image'
import {
  createLShapePolygon,
  createNichePolygon,
  createRectanglePolygon,
  createUShapePolygon,
  formatArea,
  formatLength,
  getBoundingBox,
  getEdgeLengths,
  hasSelfIntersection,
  isPolygonValid,
  mToMm,
  mmToM,
  polygonAreaSqm,
} from '@/shared/geometry/polygon'
import { differencePolygons, findCenterModuleId } from '@/shared/geometry/layout'
import { INSTALLATION_TIPS } from '@/shared/config/installation'
import type { Polygon } from '@/shared/types'
import { LayoutModulesLayer } from './LayoutModulesLayer'
import styles from './RoomWorkspace.module.scss'

const DEFAULT_CANVAS_SIZE = { width: 900, height: 560 }

function computeViewTransform(
  bbox: ReturnType<typeof getBoundingBox>,
  canvasSize: { width: number; height: number },
  options: {
    showDimensions: boolean
    showCaption: boolean
  },
) {
  const w = bbox.maxX - bbox.minX
  const h = bbox.maxY - bbox.minY
  if (w <= 0 || h <= 0) {
    return { scale: 0.1, x: 40, y: 40 }
  }

  const padPx = 8
  const dimPadPx = options.showDimensions ? 22 : 4
  const captionPadPx = options.showCaption ? 30 : 0

  const availW = canvasSize.width - padPx * 2
  const availH = canvasSize.height - padPx * 2

  const scaleX = (availW - dimPadPx * 2) / w
  const scaleY = (availH - dimPadPx * 2 - captionPadPx) / h
  const scale = Math.min(scaleX, scaleY)

  const cx = (bbox.minX + bbox.maxX) / 2
  const cy = (bbox.minY + bbox.maxY) / 2

  return {
    scale,
    x: canvasSize.width / 2 - cx * scale,
    y: (canvasSize.height - captionPadPx) / 2 - cy * scale,
  }
}

export function RoomWorkspace({ onStageReady }: { onStageReady?: (stage: Konva.Stage) => void }) {
  const room = useCalculatorStore((s) => s.room)
  const workingContour = useCalculatorStore((s) => s.workingContour)
  const calculation = useCalculatorStore((s) => s.calculation)
  const layout = useCalculatorStore((s) => s.layout)
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const setRoom = useCalculatorStore((s) => s.setRoom)
  const setContour = useCalculatorStore((s) => s.setContour)

  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE)
  const [editMode, setEditMode] = useState<'rectangle' | 'polygon'>('rectangle')
  const [history, setHistory] = useState<Polygon[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const stageRef = useRef<Konva.Stage>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)

  const moduleWidthMm =
    selectedVariant && layout.rotation === 90
      ? selectedVariant.lengthMm
      : selectedVariant?.widthMm
  const moduleLengthMm =
    selectedVariant && layout.rotation === 90
      ? selectedVariant.widthMm
      : selectedVariant?.lengthMm
  const { image: tileImage, crop: tileCrop } = useTileImage(selectedVariant?.url, selectedVariant?.id)

  const widthMm = room.contour[1]?.x ?? 0
  const lengthMm = room.contour[2]?.y ?? 0
  const bbox = getBoundingBox(room.contour)

  const pushHistory = useCallback(
    (contour: Polygon) => {
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), contour])
      setHistoryIndex((i) => i + 1)
    },
    [historyIndex],
  )

  const undo = () => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    setContour(history[newIndex])
  }

  const redo = () => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    setContour(history[newIndex])
  }

  const viewTransform = useMemo(
    () =>
      computeViewTransform(bbox, canvasSize, {
        showDimensions: layout.showDimensions,
        showCaption: Boolean(selectedVariant && calculation),
      }),
    [bbox, canvasSize, layout.showDimensions, selectedVariant, calculation],
  )

  const { scale, x: positionX, y: positionY } = viewTransform

  useEffect(() => {
    const el = canvasWrapRef.current
    if (!el) return

    const updateSize = () => {
      const width = Math.max(320, el.clientWidth)
      setCanvasSize({
        width,
        height: Math.max(420, Math.round(width * 0.62)),
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (stage && onStageReady) onStageReady(stage)
  }, [onStageReady, room.contour, calculation?.layout.modules.length, selectedVariant?.id])

  const updateRectangle = (w: number, l: number) => {
    const contour = createRectanglePolygon(w, l)
    setRoom({ shapeType: 'rectangle', contour })
    pushHistory(contour)
  }

  const contourPoints = room.contour.flatMap((p) => [p.x, p.y])
  const workingPoints =
    workingContour.success ? workingContour.polygon.flatMap((p) => [p.x, p.y]) : []

  const gapPolygons = useMemo(() => {
    if (!workingContour.success || room.gapMm <= 0) return []
    return differencePolygons(room.contour, workingContour.polygon)
  }, [room.contour, room.gapMm, workingContour])

  const workingSizeMm = useMemo(() => {
    if (!workingContour.success) return null
    const xs = workingContour.polygon.map((p) => p.x)
    const ys = workingContour.polygon.map((p) => p.y)
    return {
      width: Math.max(...xs) - Math.min(...xs),
      length: Math.max(...ys) - Math.min(...ys),
    }
  }, [workingContour])

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

  const invalid = !isPolygonValid(room.contour)
  const selfIntersect = hasSelfIntersection(room.contour)

  const ariaDescription = calculation
    ? `Площадь ${formatArea(calculation.roomAreaSqm)}, к заказу ${calculation.modulesToPurchase} модулей`
    : selectedVariant
      ? 'Задайте размеры помещения — раскладка обновится автоматически'
      : 'Выберите плитку в каталоге'

  return (
    <div className={styles.workspace}>
      <div className={styles.controls}>
        <div className={styles.modeTabs}>
          <Button
            variant={editMode === 'rectangle' ? 'primary' : 'secondary'}
            onClick={() => setEditMode('rectangle')}
          >
            Прямоугольник
          </Button>
          <Button
            variant={editMode === 'polygon' ? 'primary' : 'secondary'}
            onClick={() => setEditMode('polygon')}
          >
            Сложная форма
          </Button>
        </div>

        {editMode === 'rectangle' ? (
          <div className={styles.dimensions}>
            <Input
              label={`Ширина (${room.unit})`}
              type="number"
              min={0.1}
              step={room.unit === 'm' ? 0.1 : 100}
              value={room.unit === 'm' ? mmToM(widthMm) : widthMm}
              onChange={(e) => {
                const val = Number(e.target.value)
                const w = room.unit === 'm' ? mToMm(val) : val
                updateRectangle(w, lengthMm)
              }}
            />
            <Input
              label={`Длина (${room.unit})`}
              type="number"
              min={0.1}
              step={room.unit === 'm' ? 0.1 : 100}
              value={room.unit === 'm' ? mmToM(lengthMm) : lengthMm}
              onChange={(e) => {
                const val = Number(e.target.value)
                const l = room.unit === 'm' ? mToMm(val) : val
                updateRectangle(widthMm, l)
              }}
            />
            <label className={styles.unitSwitch}>
              <span>Единицы</span>
              <select
                value={room.unit}
                onChange={(e) => setRoom({ unit: e.target.value as 'mm' | 'm' })}
              >
                <option value="m">метры</option>
                <option value="mm">миллиметры</option>
              </select>
            </label>
          </div>
        ) : (
          <PolygonControls
            contour={room.contour}
            onApply={(c) => {
              setContour(c)
              pushHistory(c)
            }}
            onUndo={undo}
            onRedo={redo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
          />
        )}

        <Input
          label="Технологический зазор у стен (мм)"
          type="number"
          min={0}
          max={500}
          value={room.gapMm}
          onChange={(e) => setRoom({ gapMm: Number(e.target.value) })}
        />
        <p className={styles.hint}>
          Размеры помещения — <strong>от стены до стены</strong>. {INSTALLATION_TIPS.gapHint}{' '}
          Синяя полоса у стен — этот зазор ({room.gapMm}&nbsp;мм). Раскладка идёт по зелёному
          контуру
          {workingSizeMm
            ? ` (${Math.round(workingSizeMm.width)}×${Math.round(workingSizeMm.length)} мм)`
            : ''}
          .
          Оранжевый пунктир — подрезка модулей по размеру.
        </p>

        <p className={styles.area}>
          Площадь: <strong>{formatArea(polygonAreaSqm(room.contour))}</strong>
        </p>

        {!selectedVariant ? (
          <p className={styles.notice}>← Выберите покрытие в каталоге для раскладки</p>
        ) : null}

        {!workingContour.success ? (
          <p role="alert" className={styles.alert}>
            {workingContour.reason}
          </p>
        ) : null}
        {selfIntersect ? (
          <p role="alert" className={styles.alert}>
            Контур самопересекается
          </p>
        ) : null}
        {invalid && !selfIntersect ? (
          <p role="alert" className={styles.alert}>
            Контур невалиден
          </p>
        ) : null}
      </div>

      <div className={styles.canvasWrap} ref={canvasWrapRef}>
        <div className={styles.canvasToolbar}>
          {selectedVariant && calculation ? (
            <span className={styles.legend}>
              <span className={styles.legendFull}>■ целые</span>
              <span className={styles.legendCut}>■ подрезка</span>
              <span className={styles.legendCenter}>◎ центр</span>
            </span>
          ) : (
            <span className={styles.canvasHint}>Выберите плитку слева →</span>
          )}
        </div>

        <Stage
          ref={stageRef}
          width={canvasSize.width}
          height={canvasSize.height}
          scaleX={scale}
          scaleY={scale}
          x={positionX}
          y={positionY}
          aria-label="Схема раскладки напольного покрытия"
        >
          <Layer listening={false}>
            <Rect
              x={bbox.minX - 200}
              y={bbox.minY - 200}
              width={bbox.maxX - bbox.minX + 400}
              height={bbox.maxY - bbox.minY + 400}
              fill="#fafbfc"
              listening={false}
            />

            <Line
              points={contourPoints}
              closed
              stroke={KONVA_THEME.contour}
              strokeWidth={2.5 / scale}
              fill={KONVA_THEME.contourFill}
            />

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

            {calculation && selectedVariant && workingContour.success && tileImage && tileCrop ? (
              <LayoutModulesLayer
                modules={calculation.layout.modules}
                layout={layout}
                scale={scale}
                tileImage={tileImage}
                tileCrop={tileCrop}
                moduleWidthMm={moduleWidthMm ?? 500}
                moduleLengthMm={moduleLengthMm ?? 500}
                centerModuleId={centerModuleId}
              />
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

            {editMode === 'polygon' &&
              room.contour.map((point, i) => (
                <VertexHandle
                  key={i}
                  index={i}
                  point={point}
                  scale={scale}
                  onDrag={(idx, x, y) => {
                    const next = room.contour.map((p, j) =>
                      j === idx ? { x, y } : p,
                    )
                    setContour(next)
                  }}
                  onDragEnd={() => pushHistory(room.contour)}
                />
              ))}

            {layout.showDimensions &&
              room.contour.map((point, i) => {
                const next = room.contour[(i + 1) % room.contour.length]
                const len = Math.hypot(next.x - point.x, next.y - point.y)
                const mx = (point.x + next.x) / 2
                const my = (point.y + next.y) / 2
                const dx = next.x - point.x
                const dy = next.y - point.y
                const edgeLen = Math.hypot(dx, dy) || 1
                const nx = dy / edgeLen
                const ny = -dx / edgeLen
                const offset = 24 / scale
                const fontSize = Math.max(10, 12 / scale)
                return (
                  <Text
                    key={`dim-${i}`}
                    x={mx + nx * offset - 40 / scale}
                    y={my + ny * offset - fontSize / 2}
                    width={80 / scale}
                    text={formatLength(len, 'mm')}
                    fontSize={fontSize}
                    fill={KONVA_THEME.text}
                    align="center"
                    listening={false}
                  />
                )
              })}

            {selectedVariant?.lengthMm && selectedVariant.widthMm && calculation ? (
              <Group listening={false}>
                <Rect
                  x={bbox.minX}
                  y={bbox.maxY + 28 / scale}
                  width={Math.max(220 / scale, (bbox.maxX - bbox.minX) * 0.75)}
                  height={22 / scale}
                  fill="rgba(255,255,255,0.9)"
                  cornerRadius={4 / scale}
                  listening={false}
                />
                <Text
                  x={bbox.minX + 6 / scale}
                  y={bbox.maxY + 30 / scale}
                  text={`Модуль ${selectedVariant.lengthMm}×${selectedVariant.widthMm} мм · ${calculation.fullModulesCount} целых · ${calculation.cutModulesCount} подрезок на схеме · заказ ${calculation.modulesToPurchase} шт.`}
                  fontSize={Math.max(10, 11 / scale)}
                  fill={KONVA_THEME.text}
                />
              </Group>
            ) : null}
          </Layer>
        </Stage>

        <p className="sr-only" aria-live="polite">
          {ariaDescription}
        </p>
      </div>
    </div>
  )
}

function VertexHandle({
  index,
  point,
  scale,
  onDrag,
  onDragEnd,
}: {
  index: number
  point: { x: number; y: number }
  scale: number
  onDrag: (index: number, x: number, y: number) => void
  onDragEnd: () => void
}) {
  return (
    <Circle
      x={point.x}
      y={point.y}
      radius={Math.max(6, 10 / scale)}
      fill="#f28c45"
      stroke="#fff"
      strokeWidth={2 / scale}
      draggable
      onDragMove={(e) => onDrag(index, e.target.x(), e.target.y())}
      onDragEnd={onDragEnd}
    />
  )
}

function PolygonControls({
  contour,
  onApply,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  contour: Polygon
  onApply: (c: Polygon) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}) {
  const templates = [
    { label: 'Г-образная', fn: () => createLShapePolygon(5000, 4000, 3000, 2500) },
    { label: 'П-образная', fn: () => createUShapePolygon(6000, 5000, 3000, 3000, 1000) },
    {
      label: 'С нишей',
      fn: () => createNichePolygon(5000, 4000, 1500, 1000, 2000),
    },
  ]

  const edgeLengths = getEdgeLengths(contour)

  return (
    <div className={styles.polygonControls}>
      <p className={styles.hint}>Перетаскивайте вершины на схеме</p>
      <div className={styles.templateRow}>
        {templates.map((t) => (
          <Button key={t.label} variant="secondary" onClick={() => onApply(t.fn())}>
            {t.label}
          </Button>
        ))}
      </div>
      <div className={styles.historyRow}>
        <Button variant="ghost" disabled={!canUndo} onClick={onUndo}>
          Undo
        </Button>
        <Button variant="ghost" disabled={!canRedo} onClick={onRedo}>
          Redo
        </Button>
      </div>
      <p className={styles.edges}>
        Стороны: {edgeLengths.map((l) => formatLength(l, 'mm')).join(', ')}
      </p>
    </div>
  )
}
