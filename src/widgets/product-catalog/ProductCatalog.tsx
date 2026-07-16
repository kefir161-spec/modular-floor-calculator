import { useMemo, useState } from 'react'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { Input } from '@/shared/ui/Input/Input'
import {
  getFamilyDisplayName,
  getProductLineLabel,
  groupFamiliesByLine,
} from '@/entities/product/group-by-line'
import { formatUnitPrices, resolveModuleUnitPrices } from '@/shared/lib/pricing'
import type { ProductFamily, ProductVariant } from '@/shared/types'
import styles from './ProductCatalog.module.scss'

export function ProductCatalog() {
  const catalog = useCalculatorStore((s) => s.catalog)
  const selectVariant = useCalculatorStore((s) => s.selectVariant)
  const current = useCalculatorStore((s) => s.selectedVariant)
  const catalogError = useCalculatorStore((s) => s.catalogError)
  const setMobileStep = useCalculatorStore((s) => s.setMobileStep)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null)
  const [collapsedLines, setCollapsedLines] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    if (!catalog) return []
    const q = search.trim().toLowerCase()
    return catalog.families.filter((family) => {
      if (category && family.categoryId !== category) return false
      if (!q) return true
      if (family.name.toLowerCase().includes(q)) return true
      if (getProductLineLabel(family).toLowerCase().includes(q)) return true
      return family.variants.some(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.id.includes(q) ||
          v.colorName?.toLowerCase().includes(q),
      )
    })
  }, [catalog, search, category])

  const lineGroups = useMemo(() => groupFamiliesByLine(filtered), [filtered])

  const handleSelect = (variant: ProductVariant, familyId: string) => {
    selectVariant(variant)
    setExpandedFamily(familyId)
    setMobileStep(1)
  }

  const isLineCollapsed = (lineId: string) => collapsedLines[lineId] ?? true

  const toggleLine = (lineId: string) => {
    setCollapsedLines((prev) => ({ ...prev, [lineId]: !(prev[lineId] ?? true) }))
  }

  if (catalogError) {
    return (
      <div role="alert" className={styles.error}>
        {catalogError}
      </div>
    )
  }

  if (!catalog) return null

  return (
    <div className={styles.catalog}>
      {current ? (
        <div className={styles.selectedBanner}>
          <div className={styles.selectedThumb}>
            {current.imageUrl ? (
              <img src={current.imageUrl} alt="" loading="lazy" />
            ) : null}
          </div>
          <div className={styles.selectedInfo}>
            <strong>Выбрано</strong>
            <span>{current.colorName ?? current.name}</span>
            {current.lengthMm && current.widthMm ? (
              <span>
                {current.lengthMm}×{current.widthMm} мм
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <p className={styles.hint}>Нажмите цвет или «Рассчитать» — помещение заполнится плиткой</p>
      )}

      <Input
        label="Поиск"
        placeholder="Линейка, название или ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <label className={styles.selectField}>
        <span>Категория</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Все</option>
          {catalog.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.groups}>
        {lineGroups.map((group) => {
          const lineCollapsed = isLineCollapsed(group.id)
          return (
            <section key={group.id} className={styles.lineGroup}>
              <button
                type="button"
                className={styles.lineHeader}
                onClick={() => toggleLine(group.id)}
                aria-expanded={!lineCollapsed}
              >
                <span className={styles.lineTitle}>{group.label}</span>
                <span className={styles.lineCount}>{group.families.length} серий</span>
                <span className={styles.lineToggle}>{lineCollapsed ? '▸' : '▾'}</span>
              </button>

              {!lineCollapsed ? (
                <div className={styles.lineBody} role="list">
                  {group.families.map((family) => (
                    <FamilyCard
                      key={family.id}
                      family={family}
                      displayName={getFamilyDisplayName(family)}
                      expanded={expandedFamily === family.id}
                      onToggle={() =>
                        setExpandedFamily((prev) =>
                          prev === family.id ? null : family.id,
                        )
                      }
                      selectedId={current?.id}
                      onSelect={(v) => handleSelect(v, family.id)}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>Товары не найдены</p>
      ) : null}
    </div>
  )
}

function FamilyCard({
  family,
  displayName,
  expanded,
  onToggle,
  selectedId,
  onSelect,
}: {
  family: ProductFamily
  displayName: string
  expanded: boolean
  onToggle: () => void
  selectedId?: string
  onSelect: (v: ProductVariant) => void
}) {
  const preview = family.variants[0]
  const minPrice = Math.min(...family.variants.map((v) => v.price ?? Infinity))
  const hasPrice = Number.isFinite(minPrice)
  const sizeLabel =
    preview?.lengthMm && preview?.widthMm
      ? `${preview.lengthMm}×${preview.widthMm} мм`
      : null
  const hasSelected = family.variants.some((v) => v.id === selectedId)

  return (
    <article
      className={`${styles.familyCard} ${expanded ? styles.familyCardOpen : ''} ${hasSelected ? styles.familyCardActive : ''}`}
      role="listitem"
    >
      <div
        className={styles.familyHeader}
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div className={styles.imageWrap}>
          {preview?.imageUrl ? (
            <img
              src={preview.imageUrl}
              alt={displayName}
              loading="lazy"
              className={styles.image}
            />
          ) : (
            <div className={styles.imagePlaceholder} aria-hidden />
          )}
        </div>

        <div className={styles.familyInfo}>
          <p className={styles.familyName}>{displayName}</p>
          {sizeLabel ? <p className={styles.meta}>{sizeLabel}</p> : null}
          {hasPrice ? <p className={styles.price}>от {minPrice} ₽</p> : null}
          <p className={styles.variantsCount}>
            {family.variants.length} цветов · {expanded ? 'свернуть' : 'раскрыть'}
          </p>
        </div>
      </div>

      <div className={styles.colorChips}>
        {family.variants.slice(0, expanded ? family.variants.length : 6).map((variant) => {
          const isSelected = selectedId === variant.id
          return (
            <button
              key={variant.id}
              type="button"
              className={`${styles.colorChip} ${isSelected ? styles.colorChipActive : ''}`}
              disabled={!variant.calculable}
              title={`${variant.colorName ?? variant.name}${variant.calculable ? '' : ' — нет размеров'}`}
              onClick={() => onSelect(variant)}
            >
              {variant.imageUrl ? (
                <img src={variant.imageUrl} alt="" loading="lazy" />
              ) : (
                <span className={styles.chipFallback} />
              )}
            </button>
          )
        })}
        {!expanded && family.variants.length > 6 ? (
          <button type="button" className={styles.moreChip} onClick={onToggle}>
            +{family.variants.length - 6}
          </button>
        ) : null}
      </div>

      {expanded ? (
        <ul className={styles.variantList}>
          {family.variants.map((variant) => {
            const isSelected = selectedId === variant.id
            const unitPrices =
              variant.lengthMm && variant.widthMm
                ? resolveModuleUnitPrices({
                    price: variant.price,
                    priceUnit: variant.priceUnit,
                    widthMm: variant.widthMm,
                    lengthMm: variant.lengthMm,
                  })
                : null
            const priceLabel = unitPrices ? formatUnitPrices(unitPrices) : null

            return (
              <li key={variant.id}>
                <div
                  className={`${styles.variantRow} ${isSelected ? styles.variantSelected : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => variant.calculable && onSelect(variant)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && variant.calculable) {
                      e.preventDefault()
                      onSelect(variant)
                    }
                  }}
                >
                  <div className={styles.variantThumb}>
                    {variant.imageUrl ? (
                      <img src={variant.imageUrl} alt="" loading="lazy" />
                    ) : null}
                  </div>
                  <div className={styles.variantText}>
                    <span className={styles.variantName}>
                      {variant.colorName ?? variant.name}
                    </span>
                    <span className={styles.variantMeta}>
                      {[
                        variant.thicknessMm ? `${variant.thicknessMm} мм` : null,
                        variant.lengthMm && variant.widthMm
                          ? `${variant.lengthMm}×${variant.widthMm} мм`
                          : null,
                        priceLabel,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <span className={styles.variantAction}>
                    {!variant.calculable
                      ? 'Нет размеров'
                      : isSelected
                        ? '✓ Выбрано'
                        : 'Рассчитать'}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </article>
  )
}
