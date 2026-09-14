import { useMemo } from 'react'
import { isEdgingSupported, useCalculatorStore } from '@/app/store/calculator-store'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Switch } from '@/shared/ui/Switch/Switch'
import { Button } from '@/shared/ui/Button/Button'
import { EDGING_COLOR_LABELS, EDGING_GEOMETRY, EDGING_THICKNESSES, isEdgingThickness } from '@/shared/config/edging'
import { workingInsetMm } from '@/shared/geometry/edging'
import { proposeEdgingFits } from '@/shared/geometry/edging-fit'
import { formatSize, rotateModuleDimensions } from '@/shared/geometry/polygon'
import type { EdgingSizeRef, EdgingThickness } from '@/shared/types'
import styles from './EdgingPanel.module.scss'

const THICKNESS_OPTIONS = EDGING_THICKNESSES.map((mm) => ({
  value: String(mm),
  label: `${mm} мм`,
}))

export function EdgingPanel() {
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const edging = useCalculatorStore((s) => s.edging)
  const setEdging = useCalculatorStore((s) => s.setEdging)
  const fitEdgingField = useCalculatorStore((s) => s.fitEdgingField)
  const calculation = useCalculatorStore((s) => s.calculation)
  const workingContour = useCalculatorStore((s) => s.workingContour)
  const layout = useCalculatorStore((s) => s.layout)
  const gapMm = useCalculatorStore((s) => s.room.gapMm)
  const unit = useCalculatorStore((s) => s.room.unit)

  const fits = useMemo(() => {
    if (!edging.enabled || !selectedVariant?.widthMm || !selectedVariant.lengthMm) return null
    if (!workingContour.success) return null
    const module = rotateModuleDimensions(
      selectedVariant.widthMm,
      selectedVariant.lengthMm,
      layout.rotation,
    )
    return proposeEdgingFits({
      workingPolygon: workingContour.polygon,
      insetMm: workingInsetMm(gapMm, edging),
      moduleWidthMm: module.widthMm,
      moduleLengthMm: module.lengthMm,
    })
  }, [
    edging,
    gapMm,
    layout.rotation,
    selectedVariant?.lengthMm,
    selectedVariant?.widthMm,
    workingContour,
  ])

  if (!isEdgingSupported(selectedVariant)) return null

  const tileThickness = selectedVariant?.thicknessMm
  const thicknessMismatch =
    isEdgingThickness(tileThickness) && tileThickness !== edging.thicknessMm
  const spec = calculation?.edging

  return (
    <div className={styles.panel}>
      <p className={styles.sectionLabel}>Окантовка</p>

      <Switch
        checked={edging.enabled}
        onChange={(enabled) => setEdging({ enabled })}
        label="Канты по периметру"
      />

      {edging.enabled ? (
        <>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Толщина канта</span>
            <SegmentedControl
              ariaLabel="Толщина канта"
              value={String(edging.thicknessMm)}
              onChange={(value) => setEdging({ thicknessMm: Number(value) as EdgingThickness })}
              options={THICKNESS_OPTIONS}
            />
            {thicknessMismatch ? (
              <span role="alert" className={styles.mismatch}>
                Плитка {tileThickness} мм — кант должен быть той же толщины
              </span>
            ) : null}
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Заданный размер</span>
            <SegmentedControl
              ariaLabel="Заданный размер относительно окантовки"
              value={edging.sizeRef ?? 'outer'}
              onChange={(value) => setEdging({ sizeRef: value as EdgingSizeRef })}
              options={[
                { value: 'outer', label: 'С кантами' },
                { value: 'inner', label: 'Поле + кант' },
              ]}
            />
            <p className={styles.fitHint}>
              {edging.sizeRef === 'inner'
                ? 'Введённый размер — поле плитки. Кант добавляется снаружи, итоговый габарит больше.'
                : 'Введённый размер уже включает окантовку. Плитка подбирается внутрь.'}
            </p>
          </div>

          {calculation?.coverage ? (
            <dl className={styles.sizeReadout}>
              <div>
                <dt>Поле плитки</dt>
                <dd>{formatSize(calculation.coverage.tileWidthMm, calculation.coverage.tileLengthMm, unit)}</dd>
              </div>
              <div>
                <dt>Итого с кантами</dt>
                <dd>
                  {formatSize(
                    calculation.coverage.outerWidthMm,
                    calculation.coverage.outerLengthMm,
                    unit,
                  )}
                </dd>
              </div>
            </dl>
          ) : null}

          {spec ? (
            <p className={styles.counts}>
              Прямых: <strong>{spec.straightTotal}</strong> · Угловых:{' '}
              <strong>{spec.cornerTotal}</strong>
              {' · '}
              {EDGING_COLOR_LABELS[spec.colorGroup]}
            </p>
          ) : null}

          {fits ? (
            <div className={styles.fit}>
              <p className={styles.fieldLabel}>Поле без подрезки плитки</p>
              <p className={styles.fitHint}>
                Кант крепится только к целым замкам. Подрезанная по периметру плитка для него не
                подходит.
              </p>
              {fits.aligned ? (
                <p className={styles.fitOk}>Размер кратен плитке — канты встают без подрезки.</p>
              ) : !fits.orthogonal ? (
                <p className={styles.fitHint}>
                  Автоподгонка доступна для ортогональных помещений.
                </p>
              ) : (
                <div className={styles.fitRow}>
                  <Button
                    variant="secondary"
                    className={styles.fitBtn}
                    disabled={!fits.down}
                    aria-label={
                      fits.down
                        ? `Уменьшить до ${fits.down.tilesX} на ${fits.down.tilesY} плиток`
                        : 'Уменьшить нельзя'
                    }
                    onClick={() => fitEdgingField('down')}
                  >
                    <span className={styles.fitBtnLabel}>Меньше</span>
                    {fits.down ? (
                      <span className={styles.fitBtnMeta}>
                        {fits.down.tilesX}×{fits.down.tilesY} · итого{' '}
                        {formatSize(
                          fits.down.workingWidthMm + EDGING_GEOMETRY.widthMm * 2,
                          fits.down.workingHeightMm + EDGING_GEOMETRY.widthMm * 2,
                          unit,
                        )}
                      </span>
                    ) : null}
                  </Button>
                  <Button
                    variant="secondary"
                    className={styles.fitBtn}
                    disabled={!fits.up}
                    aria-label={
                      fits.up
                        ? `Увеличить до ${fits.up.tilesX} на ${fits.up.tilesY} плиток`
                        : 'Увеличить нельзя'
                    }
                    onClick={() => fitEdgingField('up')}
                  >
                    <span className={styles.fitBtnLabel}>Больше</span>
                    {fits.up ? (
                      <span className={styles.fitBtnMeta}>
                        {fits.up.tilesX}×{fits.up.tilesY} · итого{' '}
                        {formatSize(
                          fits.up.workingWidthMm + EDGING_GEOMETRY.widthMm * 2,
                          fits.up.workingHeightMm + EDGING_GEOMETRY.widthMm * 2,
                          unit,
                        )}
                      </span>
                    ) : null}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
