import { useCalculatorStore } from '@/app/store/calculator-store'
import { Button } from '@/shared/ui/Button/Button'
import { DimInput, formatDimDraft, parseDimInput } from '@/shared/ui/DimInput/DimInput'
import {
  createDefaultObstacle,
  obstacleWallOffsets,
  placeObstacleByWallOffsets,
} from '@/shared/geometry/obstacles'
import { PlusIcon, CloseIcon } from '@/shared/ui/icons'
import styles from './ObstaclesPanel.module.scss'

export function ObstaclesPanel() {
  const room = useCalculatorStore((s) => s.room)
  const selectedObstacleId = useCalculatorStore((s) => s.ui.selectedObstacleId)
  const addObstacle = useCalculatorStore((s) => s.addObstacle)
  const updateObstacle = useCalculatorStore((s) => s.updateObstacle)
  const removeObstacle = useCalculatorStore((s) => s.removeObstacle)
  const setUi = useCalculatorStore((s) => s.setUi)

  const obstacles = room.obstacles ?? []
  const unitLabel = room.unit === 'm' ? 'м' : 'мм'
  const rectHints = room.shapeType === 'rectangle'

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.sectionLabel}>Препятствия</p>
        <Button
          variant="secondary"
          className={styles.addBtn}
          onClick={() => addObstacle(createDefaultObstacle(room.contour))}
        >
          <PlusIcon width={16} height={16} />
          Добавить
        </Button>
      </div>

      {obstacles.length === 0 ? (
        <p className={styles.empty}>Нет препятствий — колонны, шахты и т.п.</p>
      ) : (
        <ul className={styles.list}>
          {obstacles.map((obs, index) => {
            const selected = selectedObstacleId === obs.id
            const offsets = obstacleWallOffsets(room.contour, obs)
            return (
              <li
                key={obs.id}
                className={`${styles.item} ${selected ? styles.itemSelected : ''}`.trim()}
              >
                <button
                  type="button"
                  className={styles.itemSelect}
                  onClick={() => setUi({ selectedObstacleId: obs.id, polygonTool: 'select' })}
                >
                  Препятствие {index + 1}
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label={`Удалить препятствие ${index + 1}`}
                  onClick={() => removeObstacle(obs.id)}
                >
                  <CloseIcon width={16} height={16} />
                </button>
                <div className={styles.fields}>
                  <label className={styles.field}>
                    <span>{rectHints ? 'От D / слева' : 'Слева'}</span>
                    <DimInput
                      valueMm={Math.max(0, offsets.fromLeftMm)}
                      unit={room.unit}
                      onCommit={(raw) => {
                        const fromLeftMm = parseDimInput(raw, room.unit, { allowZero: true })
                        if (fromLeftMm === null) return
                        updateObstacle(
                          obs.id,
                          placeObstacleByWallOffsets(
                            room.contour,
                            { widthMm: obs.widthMm, lengthMm: obs.lengthMm },
                            { fromLeftMm, fromTopMm: offsets.fromTopMm },
                          ),
                        )
                      }}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{rectHints ? 'От A / сверху' : 'Сверху'}</span>
                    <DimInput
                      valueMm={Math.max(0, offsets.fromTopMm)}
                      unit={room.unit}
                      onCommit={(raw) => {
                        const fromTopMm = parseDimInput(raw, room.unit, { allowZero: true })
                        if (fromTopMm === null) return
                        updateObstacle(
                          obs.id,
                          placeObstacleByWallOffsets(
                            room.contour,
                            { widthMm: obs.widthMm, lengthMm: obs.lengthMm },
                            { fromLeftMm: offsets.fromLeftMm, fromTopMm },
                          ),
                        )
                      }}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Ширина ({unitLabel})</span>
                    <DimInput
                      valueMm={obs.widthMm}
                      unit={room.unit}
                      onCommit={(raw) => {
                        const mm = parseDimInput(raw, room.unit)
                        if (mm === null) return
                        updateObstacle(obs.id, { widthMm: mm })
                      }}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Глубина ({unitLabel})</span>
                    <DimInput
                      valueMm={obs.lengthMm}
                      unit={room.unit}
                      onCommit={(raw) => {
                        const mm = parseDimInput(raw, room.unit)
                        if (mm === null) return
                        updateObstacle(obs.id, { lengthMm: mm })
                      }}
                    />
                  </label>
                </div>
                <p className={styles.hint}>
                  Справа {formatDimDraft(Math.max(0, offsets.fromRightMm), room.unit)} {unitLabel} ·
                  снизу {formatDimDraft(Math.max(0, offsets.fromBottomMm), room.unit)} {unitLabel}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
