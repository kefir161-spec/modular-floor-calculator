import { useMemo, useState } from 'react'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Button } from '@/shared/ui/Button/Button'
import { DimInput, parseDimInput } from '@/shared/ui/DimInput/DimInput'
import {
  createLShapePolygon,
  createNichePolygon,
  createRectanglePolygon,
  createUShapePolygon,
  formatArea,
  formatLength,
  getEdgeLengths,
  polygonAreaSqm,
} from '@/shared/geometry/polygon'
import type { Polygon, RoomShapeType } from '@/shared/types'
import { ObstaclesPanel } from './ObstaclesPanel'
import { OpeningsPanel } from './OpeningsPanel'
import styles from './RoomParamsPanel.module.scss'

type ShapeId = 'rectangle' | 'l' | 'u' | 'niche' | 'custom'

const SHAPE_OPTIONS: { id: ShapeId; label: string; hint: string }[] = [
  { id: 'rectangle', label: 'Прямоуг.', hint: '□' },
  { id: 'l', label: 'Г-образн.', hint: '⌜' },
  { id: 'u', label: 'П-образн.', hint: '⊓' },
  { id: 'niche', label: 'С нишей', hint: '▭' },
  { id: 'custom', label: 'Своя', hint: '⬠' },
]

const AREA_PRESETS: { label: string; widthMm: number; lengthMm: number }[] = [
  { label: '3×4 м', widthMm: 3000, lengthMm: 4000 },
  { label: '5×4 м', widthMm: 5000, lengthMm: 4000 },
  { label: '6×4 м', widthMm: 6000, lengthMm: 4000 },
  { label: '6×6 м', widthMm: 6000, lengthMm: 6000 },
]

function detectShape(shapeType: RoomShapeType, contour: Polygon): ShapeId {
  if (shapeType === 'rectangle' && contour.length === 4) return 'rectangle'
  if (shapeType === 'polygon') return 'custom'
  return 'rectangle'
}

export function RoomParamsPanel() {
  const room = useCalculatorStore((s) => s.room)
  const setRoom = useCalculatorStore((s) => s.setRoom)
  const applyContour = useCalculatorStore((s) => s.applyContour)
  const workingContour = useCalculatorStore((s) => s.workingContour)
  const roomConfigured = useCalculatorStore((s) => s.ui.roomConfigured)

  const [shape, setShape] = useState<ShapeId>(() => detectShape(room.shapeType, room.contour))
  const widthMm = room.contour[1]?.x ?? 0
  const lengthMm = room.contour[2]?.y ?? 0

  const [widthError, setWidthError] = useState<string | null>(null)
  const [lengthError, setLengthError] = useState<string | null>(null)

  const unitLabel = room.unit === 'm' ? 'м' : 'мм'
  const edgeLengths = useMemo(() => getEdgeLengths(room.contour), [room.contour])
  const edgeLabels = useMemo(
    () => edgeLengths.map((_, i) => String.fromCharCode(65 + i)),
    [edgeLengths],
  )

  const commitDimension = (axis: 'width' | 'length', raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === '') {
      if (axis === 'width') setWidthError('Укажите ширину')
      else setLengthError('Укажите длину')
      return
    }
    const mm = parseDimInput(raw, room.unit)
    if (mm === null) {
      if (axis === 'width') setWidthError('Введите положительное число')
      else setLengthError('Введите положительное число')
      return
    }
    if (axis === 'width') {
      setWidthError(null)
      applyContour(createRectanglePolygon(mm, lengthMm || mm), 'rectangle')
      setShape('rectangle')
    } else {
      setLengthError(null)
      applyContour(createRectanglePolygon(widthMm || mm, mm), 'rectangle')
      setShape('rectangle')
    }
  }

  const applyShape = (id: ShapeId) => {
    setShape(id)
    if (id === 'rectangle') {
      const w = widthMm > 0 ? widthMm : 4000
      const l = lengthMm > 0 ? lengthMm : 3000
      applyContour(createRectanglePolygon(w, l), 'rectangle', { resetExtras: true })
      return
    }
    if (id === 'l') {
      applyContour(createLShapePolygon(5000, 4000, 3000, 2500), 'polygon', { resetExtras: true })
      return
    }
    if (id === 'u') {
      applyContour(createUShapePolygon(6000, 5000, 3000, 3000, 1000), 'polygon', {
        resetExtras: true,
      })
      return
    }
    if (id === 'niche') {
      applyContour(createNichePolygon(5000, 4000, 1500, 1000, 2000), 'polygon', {
        resetExtras: true,
      })
      return
    }
    if (room.shapeType === 'rectangle') {
      applyContour(room.contour, 'polygon')
    }
  }

  const commitEdgeLength = (index: number, raw: string) => {
    const mm = parseDimInput(raw, room.unit)
    if (mm === null) return
    const contour = room.contour
    const a = contour[index]
    const b = contour[(index + 1) % contour.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const scale = mm / len
    const next = contour.map((p, i) => {
      if (i === (index + 1) % contour.length) {
        return { x: a.x + dx * scale, y: a.y + dy * scale }
      }
      return p
    })
    applyContour(next, 'polygon')
  }

  return (
    <div className={styles.panel}>
      <p className={styles.sectionLabel}>Форма помещения</p>
      <div className={styles.shapes} role="radiogroup" aria-label="Форма помещения">
        {SHAPE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={shape === opt.id}
            className={`${styles.shapeBtn} ${shape === opt.id ? styles.shapeActive : ''}`}
            onClick={() => applyShape(opt.id)}
          >
            <span className={styles.shapeGlyph} aria-hidden>
              {opt.hint}
            </span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {shape === 'rectangle' ? (
        <div className={styles.dims}>
          <div className={styles.presets} role="group" aria-label="Быстрый размер">
            {AREA_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={styles.presetBtn}
                onClick={() => {
                  applyContour(
                    createRectanglePolygon(preset.widthMm, preset.lengthMm),
                    'rectangle',
                    { resetExtras: true },
                  )
                  setShape('rectangle')
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className={styles.field}>
            <span>Ширина ({unitLabel})</span>
            <DimInput
              valueMm={roomConfigured ? widthMm : 0}
              unit={room.unit}
              placeholder={room.unit === 'm' ? 'например 5' : 'например 5000'}
              aria-invalid={Boolean(widthError)}
              aria-describedby={widthError ? 'width-error' : undefined}
              onCommit={(raw) => commitDimension('width', raw)}
            />
            {widthError ? (
              <span id="width-error" className={styles.fieldError}>
                {widthError}
              </span>
            ) : null}
          </label>
          <label className={styles.field}>
            <span>Длина ({unitLabel})</span>
            <DimInput
              valueMm={roomConfigured ? lengthMm : 0}
              unit={room.unit}
              placeholder={room.unit === 'm' ? 'например 4' : 'например 4000'}
              aria-invalid={Boolean(lengthError)}
              aria-describedby={lengthError ? 'length-error' : undefined}
              onCommit={(raw) => commitDimension('length', raw)}
            />
            {lengthError ? (
              <span id="length-error" className={styles.fieldError}>
                {lengthError}
              </span>
            ) : null}
          </label>
        </div>
      ) : (
        <div className={styles.edges}>
          {edgeLengths.map((len, i) => (
            <label key={`edge-${i}`} className={styles.field}>
              <span>
                Сторона {edgeLabels[i]} ({unitLabel})
              </span>
              <DimInput
                key={`edge-input-${i}-${room.unit}`}
                valueMm={len}
                unit={room.unit}
                onCommit={(raw) => commitEdgeLength(i, raw)}
              />
              <span className={styles.edgeHint}>{formatLength(len, 'mm')}</span>
            </label>
          ))}
          {shape === 'custom' ? (
            <Button
              variant="secondary"
              onClick={() =>
                applyContour(createLShapePolygon(5000, 4000, 3000, 2500), 'polygon', {
                  resetExtras: true,
                })
              }
            >
              Шаблон Г-образной
            </Button>
          ) : null}
        </div>
      )}

      <SegmentedControl
        ariaLabel="Единицы измерения"
        value={room.unit}
        onChange={(unit) => setRoom({ unit })}
        options={[
          { value: 'm', label: 'м' },
          { value: 'mm', label: 'мм' },
        ]}
      />

      <label className={styles.field}>
        <span>Зазор от стен (мм)</span>
        <DimInput
          valueMm={room.gapMm}
          unit="mm"
          onCommit={(raw) => {
            const v = parseDimInput(raw, 'mm', { allowZero: true })
            if (v === null) return
            setRoom({ gapMm: v })
          }}
        />
        <span className={styles.edgeHint}>
          Расстояние между плиткой и стеной для температурного расширения.
        </span>
      </label>

      <p className={styles.area}>
        {roomConfigured ? (
          <>
            Площадь: <strong>{formatArea(polygonAreaSqm(room.contour))}</strong>
          </>
        ) : null}
        {!roomConfigured ? <>Укажите размеры или выберите пресет</> : null}
      </p>

      <ObstaclesPanel />
      <OpeningsPanel />

      {!workingContour.success ? (
        <p role="alert" className={styles.alert}>
          {workingContour.reason}
        </p>
      ) : null}
    </div>
  )
}
