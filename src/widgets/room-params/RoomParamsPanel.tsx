import type { ComponentType } from 'react'
import { useMemo, useState } from 'react'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Button } from '@/shared/ui/Button/Button'
import { DimInput, parseDimInput } from '@/shared/ui/DimInput/DimInput'
import {
  ShapeCustomIcon,
  ShapeLIcon,
  ShapeNicheIcon,
  ShapeRectangleIcon,
  ShapeUIcon,
  type IconProps,
} from '@/shared/ui/icons'
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
import {
  applyLParams,
  applyNicheParams,
  applyUParams,
  extractLParams,
  extractNicheParams,
  extractUParams,
  formatAngleDeg,
  inferShapePreset,
  interiorAnglesDeg,
  isAxisAligned,
  setInteriorAngle,
  setRoomEdgeLength,
} from '@/shared/geometry/room-contour'
import type { Polygon, RoomShapePreset } from '@/shared/types'
import { EdgingPanel } from './EdgingPanel'
import { ObstaclesPanel } from './ObstaclesPanel'
import { OpeningsPanel } from './OpeningsPanel'
import styles from './RoomParamsPanel.module.scss'

type ShapeId = RoomShapePreset

const SHAPE_OPTIONS: {
  id: ShapeId
  label: string
  Icon: ComponentType<IconProps>
}[] = [
  { id: 'rectangle', label: 'Прямоуг.', Icon: ShapeRectangleIcon },
  { id: 'l', label: 'Г-образн.', Icon: ShapeLIcon },
  { id: 'u', label: 'П-образн.', Icon: ShapeUIcon },
  { id: 'niche', label: 'С нишей', Icon: ShapeNicheIcon },
  { id: 'custom', label: 'Своя', Icon: ShapeCustomIcon },
]

const AREA_PRESETS: { label: string; widthMm: number; lengthMm: number }[] = [
  { label: '3×4 м', widthMm: 3000, lengthMm: 4000 },
  { label: '5×4 м', widthMm: 5000, lengthMm: 4000 },
  { label: '6×4 м', widthMm: 6000, lengthMm: 4000 },
  { label: '6×6 м', widthMm: 6000, lengthMm: 6000 },
]

function parseAngleDeg(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (trimmed === '' || trimmed === '.' || trimmed === '-' || trimmed === '+') return null
  const val = Number(trimmed)
  if (!Number.isFinite(val) || val <= 0 || val >= 360) return null
  return val
}

export function RoomParamsPanel() {
  const room = useCalculatorStore((s) => s.room)
  const setRoom = useCalculatorStore((s) => s.setRoom)
  const applyContour = useCalculatorStore((s) => s.applyContour)
  const workingContour = useCalculatorStore((s) => s.workingContour)
  const roomConfigured = useCalculatorStore((s) => s.ui.roomConfigured)

  const shape = room.shapePreset ?? inferShapePreset(room.contour, room.shapeType)
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
  const angles = useMemo(() => interiorAnglesDeg(room.contour), [room.contour])
  const ortho = isAxisAligned(room.contour)
  const lParams = shape === 'l' ? extractLParams(room.contour) : null
  const uParams = shape === 'u' ? extractUParams(room.contour) : null
  const nicheParams = shape === 'niche' ? extractNicheParams(room.contour) : null

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
      applyContour(createRectanglePolygon(mm, lengthMm || mm), 'rectangle', {
        shapePreset: 'rectangle',
      })
    } else {
      setLengthError(null)
      applyContour(createRectanglePolygon(widthMm || mm, mm), 'rectangle', {
        shapePreset: 'rectangle',
      })
    }
  }

  const applyShape = (id: ShapeId) => {
    if (id === 'rectangle') {
      const w = widthMm > 0 ? widthMm : 4000
      const l = lengthMm > 0 ? lengthMm : 3000
      applyContour(createRectanglePolygon(w, l), 'rectangle', {
        resetExtras: true,
        shapePreset: 'rectangle',
      })
      return
    }
    if (id === 'l') {
      applyContour(createLShapePolygon(5000, 4000, 3000, 2500), 'polygon', {
        resetExtras: true,
        shapePreset: 'l',
      })
      return
    }
    if (id === 'u') {
      applyContour(createUShapePolygon(6000, 5000, 3000, 3000, 1000), 'polygon', {
        resetExtras: true,
        shapePreset: 'u',
      })
      return
    }
    if (id === 'niche') {
      applyContour(createNichePolygon(5000, 4000, 1500, 1000, 2000), 'polygon', {
        resetExtras: true,
        shapePreset: 'niche',
      })
      return
    }
    applyContour(room.contour, 'polygon', { shapePreset: 'custom' })
  }

  const commitPolygon = (next: Polygon | null, preset: ShapeId = shape) => {
    if (!next) return
    applyContour(next, 'polygon', { shapePreset: preset })
  }

  const commitEdgeLength = (index: number, raw: string) => {
    const mm = parseDimInput(raw, room.unit)
    if (mm === null) return
    commitPolygon(setRoomEdgeLength(room.contour, index, mm))
  }

  const commitAngle = (index: number, raw: string) => {
    const deg = parseAngleDeg(raw)
    if (deg === null) return
    const next = setInteriorAngle(room.contour, index, deg)
    if (!next) return
    commitPolygon(next, isAxisAligned(next) ? shape : 'custom')
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
              <opt.Icon width={22} height={22} />
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
                    { resetExtras: true, shapePreset: 'rectangle' },
                  )
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className={styles.field}>
            <span>Ширина ({unitLabel})</span>
            <DimInput
              valueMm={widthMm}
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
              valueMm={lengthMm}
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
          {lParams ? (
            <div className={styles.offsets}>
              <p className={styles.offsetsTitle}>Габарит и уступы</p>
              <label className={styles.field}>
                <span>Ширина ({unitLabel})</span>
                <DimInput
                  valueMm={lParams.outerW}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyLParams(room.contour, { outerW: mm }), 'l')
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Длина ({unitLabel})</span>
                <DimInput
                  valueMm={lParams.outerH}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyLParams(room.contour, { outerH: mm }), 'l')
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Уступ по ширине ({unitLabel})</span>
                <DimInput
                  valueMm={lParams.innerW}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyLParams(room.contour, { innerW: mm }), 'l')
                  }}
                />
                <span className={styles.edgeHint}>От внутреннего угла до внешней стены.</span>
              </label>
              <label className={styles.field}>
                <span>Уступ по длине ({unitLabel})</span>
                <DimInput
                  valueMm={lParams.outerH - lParams.innerH}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyLParams(room.contour, { innerH: lParams.outerH - mm }), 'l')
                  }}
                />
                <span className={styles.edgeHint}>От внутреннего угла до внешней стены.</span>
              </label>
            </div>
          ) : null}

          {uParams ? (
            <div className={styles.offsets}>
              <p className={styles.offsetsTitle}>Габарит и вырез</p>
              <label className={styles.field}>
                <span>Ширина ({unitLabel})</span>
                <DimInput
                  valueMm={uParams.outerW}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyUParams(room.contour, { outerW: mm }), 'u')
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Длина ({unitLabel})</span>
                <DimInput
                  valueMm={uParams.outerH}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyUParams(room.contour, { outerH: mm }), 'u')
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Левая ножка ({unitLabel})</span>
                <DimInput
                  valueMm={uParams.leftLeg}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyUParams(room.contour, { leftLeg: mm }), 'u')
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Правая ножка ({unitLabel})</span>
                <DimInput
                  valueMm={uParams.rightLeg}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyUParams(room.contour, { rightLeg: mm }), 'u')
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Глубина выреза ({unitLabel})</span>
                <DimInput
                  valueMm={uParams.openingHeight}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyUParams(room.contour, { openingHeight: mm }), 'u')
                  }}
                />
              </label>
            </div>
          ) : null}

          {nicheParams ? (
            <div className={styles.offsets}>
              <p className={styles.offsetsTitle}>Габарит и ниша</p>
              <label className={styles.field}>
                <span>Ширина ({unitLabel})</span>
                <DimInput
                  valueMm={nicheParams.outerW}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyNicheParams(room.contour, { outerW: mm }), 'niche')
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Длина ({unitLabel})</span>
                <DimInput
                  valueMm={nicheParams.outerH}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyNicheParams(room.contour, { outerH: mm }), 'niche')
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Ширина ниши ({unitLabel})</span>
                <DimInput
                  valueMm={nicheParams.nicheW}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyNicheParams(room.contour, { nicheW: mm }), 'niche')
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Глубина ниши ({unitLabel})</span>
                <DimInput
                  valueMm={nicheParams.nicheH}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyNicheParams(room.contour, { nicheH: mm }), 'niche')
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Отступ ниши слева ({unitLabel})</span>
                <DimInput
                  valueMm={nicheParams.nicheX}
                  unit={room.unit}
                  onCommit={(raw) => {
                    const mm = parseDimInput(raw, room.unit)
                    if (mm === null) return
                    commitPolygon(applyNicheParams(room.contour, { nicheX: mm }), 'niche')
                  }}
                />
              </label>
            </div>
          ) : null}

          <p className={styles.formHint}>
            {ortho
              ? 'Сторона сдвигает всю стену — прямые углы не плывут. Угол 90° или 270° можно изменить, если комната не прямоугольная.'
              : 'Длины и углы задают обход контура. Последняя сторона замыкает фигуру и может пересчитаться.'}
          </p>

          {edgeLengths.map((len, i) => (
            <div key={`edge-${i}`} className={styles.edgeRow}>
              <label className={styles.field}>
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
              <label className={styles.field}>
                <span>Угол {edgeLabels[i]} (°)</span>
                <DimInput
                  key={`angle-input-${i}`}
                  valueMm={Math.round(angles[i])}
                  unit="mm"
                  onCommit={(raw) => commitAngle(i, raw)}
                />
                <span className={styles.edgeHint}>{formatAngleDeg(angles[i])}</span>
              </label>
            </div>
          ))}
          {shape === 'custom' ? (
            <Button
              variant="secondary"
              onClick={() =>
                applyContour(createLShapePolygon(5000, 4000, 3000, 2500), 'polygon', {
                  resetExtras: true,
                  shapePreset: 'l',
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
        ) : (
          <>Укажите размеры или выберите пресет</>
        )}
      </p>

      <ObstaclesPanel />
      <OpeningsPanel />
      <EdgingPanel />

      {!workingContour.success ? (
        <p role="alert" className={styles.alert}>
          {workingContour.reason}
        </p>
      ) : null}
    </div>
  )
}
