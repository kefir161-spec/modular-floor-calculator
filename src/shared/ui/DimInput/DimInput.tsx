import { useEffect, useRef, type InputHTMLAttributes } from 'react'
import { mmToM, mToMm } from '@/shared/geometry/polygon'

/** Отображение мм в черновик поля (без «сырых» float). */
export function formatDimDraft(mm: number, unit: 'mm' | 'm'): string {
  if (!Number.isFinite(mm)) return ''
  if (unit === 'm') return String(Number(mmToM(mm).toFixed(3)))
  return String(Math.round(mm))
}

type ParseDimOptions = {
  /** Разрешить 0 (отступы от стен). По умолчанию только > 0. */
  allowZero?: boolean
}

/**
 * Разбор ввода размера. Допускает "0.5", ".5", "0,5" во время/после набора.
 * Пустая строка / только "." → null.
 */
export function parseDimInput(
  raw: string,
  unit: 'mm' | 'm',
  options: ParseDimOptions = {},
): number | null {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (trimmed === '' || trimmed === '.' || trimmed === '-' || trimmed === '+') return null
  const val = Number(trimmed)
  if (!Number.isFinite(val)) return null
  if (options.allowZero) {
    if (val < 0) return null
  } else if (val <= 0) {
    return null
  }
  return unit === 'm' ? mToMm(val) : val
}

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> & {
  /** Текущее значение в мм из store */
  valueMm: number
  unit: 'mm' | 'm'
  /** Вызов после blur/Enter с сырой строкой поля */
  onCommit: (raw: string) => void
}

/**
 * Неконтролируемый ввод размера: React не трогает value во время набора,
 * поэтому нет «зеркалирования» цифр и ломания "0.5" / ".5".
 */
export function DimInput({ valueMm, unit, onCommit, onFocus, onBlur, onKeyDown, ...rest }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const focusedRef = useRef(false)
  const display = formatDimDraft(valueMm, unit)

  useEffect(() => {
    const el = inputRef.current
    if (!el || focusedRef.current) return
    if (el.value !== display) el.value = display
  }, [display])

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      defaultValue={display}
      onFocus={(e) => {
        focusedRef.current = true
        onFocus?.(e)
      }}
      onBlur={(e) => {
        focusedRef.current = false
        onCommit(e.target.value)
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.target as HTMLInputElement).blur()
        }
        onKeyDown?.(e)
      }}
    />
  )
}
