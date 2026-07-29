import { Button } from '@/shared/ui/Button/Button'
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton'
import { formatUnitPrices, resolveModuleUnitPrices } from '@/shared/lib/pricing'
import type { ProductVariant } from '@/shared/types'
import styles from './SelectedProductCard.module.scss'

type Props = {
  variant: ProductVariant | null
  onChangeClick: () => void
}

export function SelectedProductCard({ variant, onChangeClick }: Props) {
  if (!variant) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Покрытие не выбрано</p>
        <p className={styles.emptyHint}>Выберите серию и цвет — схема заполнится плиткой</p>
        <Button variant="primary" onClick={onChangeClick}>
          Выбрать покрытие
        </Button>
      </div>
    )
  }

  const priceLabel =
    variant.lengthMm && variant.widthMm
      ? formatUnitPrices(
          resolveModuleUnitPrices({
            price: variant.price,
            priceUnit: variant.priceUnit,
            widthMm: variant.widthMm,
            lengthMm: variant.lengthMm,
          }),
        )
      : null

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {variant.imageUrl ? (
          <img src={variant.imageUrl} alt="" loading="lazy" />
        ) : (
          <Skeleton width="100%" height="100%" radius="sm" label="Нет фото" />
        )}
      </div>
      <div className={styles.body}>
        <p className={styles.color}>{variant.colorName ?? variant.name}</p>
        {variant.lengthMm && variant.widthMm ? (
          <p className={styles.meta}>
            {variant.lengthMm}×{variant.widthMm} мм
            {variant.thicknessMm ? ` · ${variant.thicknessMm} мм` : ''}
          </p>
        ) : (
          <p className={styles.metaWarn}>{variant.calculableReason ?? 'Нет размеров для расчёта'}</p>
        )}
        {priceLabel ? <p className={styles.price}>{priceLabel}</p> : null}
        {variant.url ? (
          <a className={styles.link} href={variant.url} target="_blank" rel="noreferrer">
            Страница товара
          </a>
        ) : null}
        <Button variant="secondary" onClick={onChangeClick}>
          Сменить покрытие
        </Button>
      </div>
    </article>
  )
}
