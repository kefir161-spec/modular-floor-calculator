import { useCalculatorStore } from '@/app/store/calculator-store'
import { totalOrderCost } from '@/entities/calculation/edging'
import { EDGING_COLOR_LABELS } from '@/shared/config/edging'
import { formatArea, formatLength, formatSize } from '@/shared/geometry/polygon'
import { formatRub } from '@/shared/lib/pricing'
import type { EdgingCornerType, EdgingResult, EdgingStraightType } from '@/shared/types'
import styles from './CalculationSummary.module.scss'

const STRAIGHT_TYPES: EdgingStraightType[] = [1, 2]
const CORNER_TYPES: EdgingCornerType[] = [1, 2, 3, 4]

function EdgingSpec({ edging }: { edging: EdgingResult }) {
  const colorLabel = EDGING_COLOR_LABELS[edging.colorGroup]

  return (
    <section className={styles.block}>
      <h3 className={styles.heading}>
        Окантовка {edging.thicknessMm} мм, {colorLabel}
      </h3>
      <dl className={styles.stats}>
        {STRAIGHT_TYPES.map((type) => (
          <div key={`straight-${type}`}>
            <dt>Прямой кант №{type}</dt>
            <dd>{edging.straightCounts[type]} шт</dd>
          </div>
        ))}
        {CORNER_TYPES.map((type) => (
          <div key={`corner-${type}`}>
            <dt>Угловой кант №{type}</dt>
            <dd>{edging.cornerCounts[type]} шт</dd>
          </div>
        ))}
        <div>
          <dt>Всего элементов</dt>
          <dd>{edging.straightTotal + edging.cornerTotal} шт</dd>
        </div>
        <div>
          <dt>Периметр окантовки</dt>
          <dd>{formatLength(edging.perimeterMm, 'mm')}</dd>
        </div>
        <div>
          <dt>Цена прямого</dt>
          <dd>{formatRub(edging.straightPrice)}/шт</dd>
        </div>
        <div>
          <dt>Цена углового</dt>
          <dd>{formatRub(edging.cornerPrice)}/шт</dd>
        </div>
        <div>
          <dt>Стоимость окантовки</dt>
          <dd>{formatRub(edging.totalCost)}</dd>
        </div>
      </dl>
    </section>
  )
}

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

  const orderTotal = totalOrderCost(calculation)

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
          {calculation.coverage && calculation.edging ? (
            <>
              <div>
                <dt>Поле плитки</dt>
                <dd>
                  {formatSize(
                    calculation.coverage.tileWidthMm,
                    calculation.coverage.tileLengthMm,
                    'mm',
                  )}
                </dd>
              </div>
              <div>
                <dt>Итого с кантами</dt>
                <dd>
                  {formatSize(
                    calculation.coverage.outerWidthMm,
                    calculation.coverage.outerLengthMm,
                    'mm',
                  )}
                </dd>
              </div>
            </>
          ) : null}
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

      {calculation.colorBreakdown && calculation.colorBreakdown.length > 0 ? (
        <section className={styles.block}>
          <h3 className={styles.heading}>По цветам</h3>
          <dl className={styles.stats}>
            {calculation.colorBreakdown.map((row) => (
              <div key={row.variantId}>
                <dt>{row.colorName ?? row.variantId}</dt>
                <dd>
                  {row.modulesWithWasteCount} шт
                  {row.totalCost !== undefined ? ` · ${formatRub(row.totalCost)}` : ''}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {calculation.edging ? (
        <>
          <EdgingSpec edging={calculation.edging} />
          {orderTotal !== undefined ? (
            <section className={styles.block}>
              <h3 className={styles.heading}>Всего по заказу</h3>
              <p className={styles.totalLine}>
                <strong className={styles.totalValue}>{formatRub(orderTotal)}</strong>
                <span className={styles.wasteNote}> покрытие и окантовка</span>
              </p>
            </section>
          ) : null}
        </>
      ) : null}

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
