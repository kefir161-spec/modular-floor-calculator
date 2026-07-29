import { useState } from 'react'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { formatArea } from '@/shared/geometry/polygon'
import { formatRub } from '@/shared/lib/pricing'
import { Button } from '@/shared/ui/Button/Button'
import { Drawer } from '@/shared/ui/Drawer/Drawer'
import { ResultScreen } from '@/widgets/calculation-summary/ResultScreen'
import type { ResultActionsProps } from '@/widgets/calculation-summary/ResultActions'
import styles from './StickySummary.module.scss'

type Props = Pick<ResultActionsProps, 'onExportPng' | 'onExportPdf' | 'onPrint'>

export function StickySummary({ onExportPng, onExportPdf, onPrint }: Props) {
  const [open, setOpen] = useState(false)
  const calculation = useCalculatorStore((s) => s.calculation)
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const workingContour = useCalculatorStore((s) => s.workingContour)
  const roomConfigured = useCalculatorStore((s) => s.ui.roomConfigured)

  if (!selectedVariant) {
    return (
      <aside className={styles.card} aria-live="polite">
        <p className={styles.muted}>Выберите покрытие для расчёта</p>
      </aside>
    )
  }

  if (!roomConfigured) {
    return (
      <aside className={styles.card} aria-live="polite">
        <p className={styles.muted}>Укажите размеры помещения</p>
      </aside>
    )
  }

  if (!workingContour.success) {
    return (
      <aside className={styles.card} role="alert">
        <p className={styles.error}>{workingContour.reason}</p>
      </aside>
    )
  }

  if (!calculation) {
    return (
      <aside className={styles.card}>
        <p className={styles.muted}>Недостаточно данных для расчёта</p>
      </aside>
    )
  }

  return (
    <>
      <aside className={styles.card} aria-live="polite">
        <p className={styles.kicker}>
          {selectedVariant.colorName ?? selectedVariant.name}
        </p>
        <p className={styles.total}>
          Итого к покупке:{' '}
          <strong className={styles.totalValue}>{calculation.modulesWithWasteCount}</strong>{' '}
          плиток
        </p>
        <div className={styles.meta}>
          <span>{formatArea(calculation.workingAreaSqm)}</span>
          {calculation.totalCost !== undefined ? (
            <span>{formatRub(calculation.totalCost)}</span>
          ) : null}
          {calculation.totalWeightKg !== undefined ? (
            <span>{calculation.totalWeightKg.toFixed(1)} кг</span>
          ) : null}
        </div>
        {calculation.warnings.length > 0 ? (
          <p className={styles.warn}>{calculation.warnings[0]?.message}</p>
        ) : null}
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Подробнее
        </Button>
      </aside>

      <Drawer open={open} onClose={() => setOpen(false)} title="Подробный результат" side="right">
        <ResultScreen
          onExportPng={onExportPng}
          onExportPdf={onExportPdf}
          onPrint={onPrint}
        />
      </Drawer>
    </>
  )
}
