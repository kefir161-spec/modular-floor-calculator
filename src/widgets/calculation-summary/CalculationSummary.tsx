import { useCalculatorStore } from '@/app/store/calculator-store'
import { formatArea } from '@/shared/geometry/polygon'
import { formatRub } from '@/shared/lib/pricing'
import styles from './CalculationSummary.module.scss'

export function CalculationSummary() {  const calculation = useCalculatorStore((s) => s.calculation)
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const workingContour = useCalculatorStore((s) => s.workingContour)

  if (!selectedVariant) {
    return <p className={styles.empty}>Выберите товар для расчёта</p>
  }

  if (!workingContour.success) {
    return (
      <p role="alert" className={styles.alert}>
        {workingContour.reason}
      </p>
    )
  }

  if (!calculation) {
    return <p className={styles.empty}>Недостаточно данных для расчёта</p>
  }

  return (
    <div className={styles.summary} aria-live="polite">
      <h3 className={styles.heading}>Результат</h3>
      <dl className={styles.stats}>
        <div>
          <dt>Площадь помещения</dt>
          <dd>{formatArea(calculation.roomAreaSqm)}</dd>
        </div>
        <div>
          <dt>Рабочая площадь</dt>
          <dd>{formatArea(calculation.workingAreaSqm)}</dd>
        </div>
        <div>
          <dt>Целых модулей</dt>
          <dd>{calculation.fullModulesCount}</dd>
        </div>
        <div>
          <dt>Подрезок на схеме</dt>
          <dd>{calculation.cutModulesCount}</dd>
        </div>
        <div>
          <dt>Плиток на подрезку</dt>
          <dd>{calculation.cutSourceModulesCount}</dd>
        </div>
        <div>
          <dt>К заказу</dt>
          <dd>{calculation.modulesToPurchase}</dd>
        </div>
        <div>
          <dt>С запасом ({calculation.wastePercent}%)</dt>
          <dd>{calculation.modulesWithWasteCount}</dd>
        </div>
        <div>
          <dt>Площадь покупки</dt>
          <dd>{formatArea(calculation.purchaseAreaSqm)}</dd>
        </div>
        {calculation.pricePerPiece !== undefined ? (
          <div>
            <dt>Цена за модуль</dt>
            <dd>{formatRub(calculation.pricePerPiece)}</dd>
          </div>
        ) : null}
        {calculation.pricePerSqm !== undefined ? (
          <div>
            <dt>Цена за м²</dt>
            <dd>{formatRub(calculation.pricePerSqm, 2)}</dd>
          </div>
        ) : null}
        {calculation.totalCost !== undefined ? (
          <div>
            <dt>Стоимость</dt>
            <dd>{formatRub(calculation.totalCost)}</dd>
          </div>
        ) : null}
        {calculation.totalWeightKg !== undefined ? (
          <div>
            <dt>Вес</dt>
            <dd>{calculation.totalWeightKg.toFixed(1)} кг</dd>
          </div>
        ) : null}
      </dl>

      {calculation.warnings.length > 0 ? (
        <ul className={styles.warnings}>
          {calculation.warnings.map((w) => (
            <li key={w.code}>{w.message}</li>
          ))}
        </ul>
      ) : null}

      <p className={styles.disclaimer}>
        Расчёт является предварительным и требует проверки перед оформлением заказа.
      </p>
    </div>
  )
}
