import { useMemo } from 'react'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { Button } from '@/shared/ui/Button/Button'
import {
  createDefaultOpening,
  totalOpeningsLengthMm,
} from '@/shared/geometry/obstacles'
import { edgeLength, formatLength } from '@/shared/geometry/polygon'
import { DimInput, parseDimInput } from '@/shared/ui/DimInput/DimInput'
import { PlusIcon, CloseIcon } from '@/shared/ui/icons'
import styles from './OpeningsPanel.module.scss'

function edgeLetter(index: number): string {
  return String.fromCharCode(65 + (index % 26))
}

export function OpeningsPanel() {
  const room = useCalculatorStore((s) => s.room)
  const addOpening = useCalculatorStore((s) => s.addOpening)
  const updateOpening = useCalculatorStore((s) => s.updateOpening)
  const removeOpening = useCalculatorStore((s) => s.removeOpening)
  const setUi = useCalculatorStore((s) => s.setUi)

  const openings = room.openings ?? []
  const unitLabel = room.unit === 'm' ? 'м' : 'мм'
  const edgeCount = room.contour.length
  const totalMm = totalOpeningsLengthMm(openings)

  const edgeOptions = useMemo(
    () =>
      room.contour.map((_, i) => ({
        value: i,
        label: edgeLetter(i),
        lengthMm: edgeLength(room.contour[i], room.contour[(i + 1) % room.contour.length]),
      })),
    [room.contour],
  )

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.sectionLabel}>Проёмы / открытые края</p>
        <Button
          variant="secondary"
          className={styles.addBtn}
          disabled={edgeCount < 1}
          onClick={() => {
            const edgeIndex = 0
            addOpening(createDefaultOpening(room.contour, edgeIndex))
            setUi({ selectedEdgeIndex: edgeIndex, polygonTool: 'opening' })
          }}
        >
          <PlusIcon width={16} height={16} />
          Добавить
        </Button>
      </div>

      {openings.length === 0 ? (
        <p className={styles.empty}>Нет проёмов — дверные и открытые участки стен</p>
      ) : (
        <ul className={styles.list}>
          {openings.map((opn, index) => (
            <li key={opn.id} className={styles.item}>
              <div className={styles.itemHead}>
                <span className={styles.itemTitle}>Проём {index + 1}</span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label={`Удалить проём ${index + 1}`}
                  onClick={() => removeOpening(opn.id)}
                >
                  <CloseIcon width={16} height={16} />
                </button>
              </div>
              <div className={styles.fields}>
                <label className={styles.field}>
                  <span>Сторона</span>
                  <select
                    value={opn.edgeIndex}
                    onChange={(e) => {
                      const edgeIndex = Number(e.target.value)
                      if (!Number.isFinite(edgeIndex)) return
                      updateOpening(opn.id, {
                        ...createDefaultOpening(room.contour, edgeIndex),
                        id: opn.id,
                      })
                      setUi({ selectedEdgeIndex: edgeIndex })
                    }}
                  >
                    {edgeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({formatLength(opt.lengthMm, 'mm')})
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Смещение ({unitLabel})</span>
                  <DimInput
                    valueMm={opn.offsetMm}
                    unit={room.unit}
                    onCommit={(raw) => {
                      const mm = parseDimInput(raw, room.unit, { allowZero: true })
                      if (mm === null) return
                      updateOpening(opn.id, { offsetMm: mm })
                    }}
                  />
                </label>
                <label className={styles.field}>
                  <span>Длина ({unitLabel})</span>
                  <DimInput
                    valueMm={opn.lengthMm}
                    unit={room.unit}
                    onCommit={(raw) => {
                      const mm = parseDimInput(raw, room.unit)
                      if (mm === null) return
                      updateOpening(opn.id, { lengthMm: mm })
                    }}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalMm > 0 ? (
        <p className={styles.total}>
          Суммарная длина открытых краёв:{' '}
          <strong>{formatLength(totalMm, room.unit)}</strong>
        </p>
      ) : null}
    </div>
  )
}
