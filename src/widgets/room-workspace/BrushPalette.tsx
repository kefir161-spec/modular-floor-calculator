import type { ProductVariant } from '@/shared/types'
import styles from './BrushPalette.module.scss'

type Props = {
  colors: ProductVariant[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function BrushPalette({ colors, selectedId, onSelect }: Props) {
  if (colors.length === 0) return null

  return (
    <div className={styles.palette} role="listbox" aria-label="Цвет кисти">
      {colors.map((variant) => {
        const label = variant.colorName ?? variant.name
        const selected = variant.id === selectedId
        return (
          <button
            key={variant.id}
            type="button"
            role="option"
            aria-selected={selected}
            className={`${styles.chip} ${selected ? styles.chipActive : ''}`.trim()}
            title={label}
            aria-label={label}
            onClick={() => onSelect(variant.id)}
          >
            <span className={styles.media}>
              {variant.imageUrl ? (
                <img src={variant.imageUrl} alt="" />
              ) : (
                <span className={styles.fallback} />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
