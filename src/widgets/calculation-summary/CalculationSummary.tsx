import { useCalculatorStore } from '@/app/store/calculator-store'
import { formatArea, formatLength } from '@/shared/geometry/polygon'
import { formatRub } from '@/shared/lib/pricing'
import styles from './CalculationSummary.module.scss'

export function CalculationSummary() {
  const calculation = useCalculatorStore((s) => s.calculation)
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
      <section className={styles.block}>
        <h3 className={styles.heading}>Итого к покупке</h3>
        <p className={styles.totalLine}>
          <strong className={styles.totalValue}>{calculation.modulesWithWasteCount}</strong> плиток
          <span className={styles.wasteNote}> (с запасом {calculation.wastePercent}%)</span>
        </p>
      </section>

      <section className={styles.block}>
        <h3 className={styles.heading}>Основной расчёт</h3>
        <dl className={styles.stats}>
          <div>
            <dt>Площадь помещения</dt>
            <dd>{formatArea(calculation.roomAreaSqm)}</dd>
          </div>
          <div>
            <dt>Площадь укладки</dt>
            <dd>{formatArea(calculation.workingAreaSqm)}</dd>
          </div>
          {calculation.obstaclesAreaSqm > 0 ? (
            <div>
              <dt>Площадь препятствий</dt>
              <dd>{formatArea(calculation.obstaclesAreaSqm)}</dd>
            </div>
          ) : null}
          {calculation.openingsLengthMm > 0 ? (
            <div>
              <dt>Открытые края</dt>
              <dd>{formatLength(calculation.openingsLengthMm, 'mm')}</dd>
            </div>
          ) : null}
          <div>
            <dt>Целые плитки</dt>
            <dd>{calculation.fullModulesCount}</dd>
          </div>
          <div>
            <dt>Подрезанных участков</dt>
            <dd>{calculation.cutModulesCount}</dd>
          </div>
          <div>
            <dt>Плиток на подрезку</dt>
            <dd>{calculation.cutSourceModulesCount}</dd>
          </div>
          <div>
            <dt>Плиток до запаса</dt>
            <dd>{calculation.modulesToPurchase}</dd>
          </div>
          <div>
            <dt>Дополнительный запас</dt>
            <dd>{Math.max(0, calculation.modulesWithWasteCount - calculation.modulesToPurchase)}</dd>
          </div>
          <div>
            <dt>Площадь покупки</dt>
            <dd>{formatArea(calculation.purchaseAreaSqm)}</dd>
          </div>
          {calculation.totalWeightKg !== undefined ? (
            <div>
              <dt>Общий вес</dt>
              <dd>{calculation.totalWeightKg.toFixed(1)} кг</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className={styles.block}>
        <h3 className={styles.heading}>Товар</h3>
        <dl className={styles.stats}>
          <div>
            <dt>Цвет</dt>
            <dd>{selectedVariant.colorName ?? selectedVariant.name}</dd>
          </div>
          {selectedVariant.lengthMm && selectedVariant.widthMm ? (
            <div>
              <dt>Размер</dt>
              <dd>
                {selectedVariant.lengthMm}×{selectedVariant.widthMm} мм
              </dd>
            </div>
          ) : null}
          {selectedVariant.thicknessMm ? (
            <div>
              <dt>Толщина</dt>
              <dd>{selectedVariant.thicknessMm} мм</dd>
            </div>
          ) : null}
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
              <dt>Ориентировочная стоимость</dt>
              <dd>{formatRub(calculation.totalCost)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {calculation.warnings.length > 0 ? (
        <section className={styles.block}>
          <h3 className={styles.heading}>Предупреждения</h3>
          <ul className={styles.warnings}>
            {calculation.warnings.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className={styles.disclaimer}>
        Расчёт является предварительным и требует проверки перед оформлением заказа.
      </p>
    </div>
  )
}
