import { isEdgingSupported, useCalculatorStore } from '@/app/store/calculator-store'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Switch } from '@/shared/ui/Switch/Switch'
import { EDGING_COLOR_LABELS, EDGING_THICKNESSES, isEdgingThickness } from '@/shared/config/edging'
import type { EdgingThickness } from '@/shared/types'
import styles from './EdgingPanel.module.scss'

const THICKNESS_OPTIONS = EDGING_THICKNESSES.map((mm) => ({
  value: String(mm),
  label: `${mm} мм`,
}))

export function EdgingPanel() {
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const edging = useCalculatorStore((s) => s.edging)
  const setEdging = useCalculatorStore((s) => s.setEdging)
  const calculation = useCalculatorStore((s) => s.calculation)

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

          {spec ? (
            <p className={styles.counts}>
              Прямых: <strong>{spec.straightTotal}</strong> · Угловых:{' '}
              <strong>{spec.cornerTotal}</strong>
              {' · '}
              {EDGING_COLOR_LABELS[spec.colorGroup]}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
