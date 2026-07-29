import { useEffect, useMemo, useState } from 'react'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { Input } from '@/shared/ui/Input/Input'
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton'
import { ErrorState } from '@/shared/ui/ErrorState/ErrorState'
import { Button } from '@/shared/ui/Button/Button'
import {
  getFamilyDisplayName,
  getProductLineLabel,
  groupFamiliesByLine,
} from '@/entities/product/group-by-line'
import { formatUnitPrices, resolveModuleUnitPrices } from '@/shared/lib/pricing'
import type { ProductFamily, ProductVariant } from '@/shared/types'
import styles from './ProductCatalog.module.scss'

type Props = {
  /** Вызывается после выбора варианта (закрыть drawer) */
  onSelected?: () => void
}

export function ProductCatalog({ onSelected }: Props) {
  const catalog = useCalculatorStore((s) => s.catalog)
  const selectVariant = useCalculatorStore((s) => s.selectVariant)
  const current = useCalculatorStore((s) => s.selectedVariant)
  const catalogError = useCalculatorStore((s) => s.catalogError)
  const setCatalogError = useCalculatorStore((s) => s.setCatalogError)
  const setMobileStep = useCalculatorStore((s) => s.setMobileStep)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null)
  const [collapsedLines, setCollapsedLines] = useState<Record<string, boolean>>({})
  const [initialized, setInitialized] = useState(false)

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
          (v.colorName?.toLowerCase().includes(q) ?? false),
      )
    })
  }, [catalog, search, category])

  const lineGroups = useMemo(() => groupFamiliesByLine(filtered), [filtered])

  useEffect(() => {
    if (!catalog || initialized) return
    const firstLine = groupFamiliesByLine(catalog.families)[0]
    if (firstLine) {
      setCollapsedLines({ [firstLine.id]: false })
    }
    if (current) {
      const family = catalog.families.find((f) =>
        f.variants.some((v) => v.id === current.id),
      )
      if (family) setExpandedFamily(family.id)
    }
    setInitialized(true)
  }, [catalog, current, initialized])

  const handleSelect = (variant: ProductVariant, familyId: string) => {
    selectVariant(variant)
    setExpandedFamily(familyId)
    setMobileStep(1)
    onSelected?.()
  }

  const isLineCollapsed = (lineId: string) => collapsedLines[lineId] ?? true

  const toggleLine = (lineId: string) => {
    setCollapsedLines((prev) => ({ ...prev, [lineId]: !(prev[lineId] ?? true) }))
  }

  if (catalogError) {
    return (
      <ErrorState
        title="Не удалось загрузить каталог"
        description={catalogError}
        action={
          <Button
            variant="primary"
            onClick={() => {
              setCatalogError(null)
              window.location.reload()
            }}
          >
            Обновить
          </Button>
        }
      />
    )
  }

  if (!catalog) {
    return (
      <div className={styles.loading}>
        <Skeleton height={48} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
    )
  }

  return (
    <div className={styles.catalog}>
      <div className={styles.searchRow}>
        <Input
          label="Поиск"
          placeholder="Название серии или цвет"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search ? (
          <button
            type="button"
            className={styles.clearSearch}
            onClick={() => setSearch('')}
            aria-label="Очистить поиск"
          >
            Очистить
          </button>
        ) : null}
      </div>

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
                        setExpandedFamily((prev) => (prev === family.id ? null : family.id))
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
        <p className={styles.empty}>Ничего не найдено. Измените запрос или категорию.</p>
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
  const priced = family.variants
    .map((v) => v.price)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p))
  const minPrice = priced.length > 0 ? Math.min(...priced) : undefined
  const prices =
    preview?.lengthMm && preview?.widthMm && minPrice !== undefined
      ? resolveModuleUnitPrices({
          price: minPrice,
          priceUnit: preview.priceUnit,
          widthMm: preview.widthMm,
          lengthMm: preview.lengthMm,
        })
      : null
  const fromPrice = prices ? formatUnitPrices(prices) : null

  const sizeLabel =
    preview?.lengthMm && preview?.widthMm
      ? `${preview.lengthMm}×${preview.widthMm} мм`
      : null
  const hasSelected = family.variants.some((v) => v.id === selectedId)
  const selectedVariant = family.variants.find((v) => v.id === selectedId)

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
          {fromPrice ? <p className={styles.price}>от {fromPrice}</p> : null}
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
              aria-label={variant.colorName ?? variant.name}
              title={
                !variant.calculable
                  ? variant.calculableReason ?? 'Нет размеров'
                  : (variant.colorName ?? variant.name)
              }
              onClick={() => onSelect(variant)}
            >
              <span className={styles.chipMedia}>
                {variant.imageUrl ? (
                  <img src={variant.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span className={styles.chipFallback} />
                )}
              </span>
            </button>
          )
        })}
        {!expanded && family.variants.length > 6 ? (
          <button type="button" className={styles.moreChip} onClick={onToggle}>
            +{family.variants.length - 6}
          </button>
        ) : null}
      </div>

      {expanded && selectedVariant ? (
        <VariantDetails variant={selectedVariant} />
      ) : expanded ? (
        <p className={styles.pickHint}>Выберите цвет — характеристики появятся здесь</p>
      ) : null}
    </article>
  )
}

function VariantDetails({ variant }: { variant: ProductVariant }) {
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
    <div className={styles.variantDetails}>
      <strong>{variant.colorName ?? variant.name}</strong>
      {variant.lengthMm && variant.widthMm ? (
        <span>
          {variant.lengthMm}×{variant.widthMm} мм
          {variant.thicknessMm ? ` · толщина ${variant.thicknessMm} мм` : ''}
        </span>
      ) : (
        <span className={styles.disabledReason}>
          {variant.calculableReason ?? 'Нет размеров — расчёт недоступен'}
        </span>
      )}
      {priceLabel ? <span>{priceLabel}</span> : null}
    </div>
  )
}
