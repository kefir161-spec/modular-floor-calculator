import { useMemo, useState } from 'react'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { Button } from '@/shared/ui/Button/Button'
import styles from './FirstRunTip.module.scss'

const STORAGE_KEY = 'pf-dismissed-tips-v1'

type TipId = 'product' | 'room'

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set()
  } catch {
    return new Set()
  }
}

function persistDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

export function FirstRunTip() {
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const roomConfigured = useCalculatorStore((s) => s.ui.roomConfigured)
  const [dismissed, setDismissed] = useState(() => readDismissed())

  const tip = useMemo(() => {
    if (!selectedVariant && !dismissed.has('product')) {
      return {
        id: 'product' as TipId,
        text: 'Выберите покрытие — схема заполнится плиткой.',
      }
    }
    if (selectedVariant && !roomConfigured && !dismissed.has('room')) {
      return {
        id: 'room' as TipId,
        text: 'Укажите размеры помещения или выберите пресет площади.',
      }
    }
    return null
  }, [selectedVariant, roomConfigured, dismissed])

  if (!tip) return null

  return (
    <div className={styles.tip} role="status">
      <p className={styles.text}>{tip.text}</p>
      <Button
        variant="ghost"
        onClick={() => {
          const next = new Set(dismissed)
          next.add(tip.id)
          setDismissed(next)
          persistDismissed(next)
        }}
      >
        Понятно
      </Button>
    </div>
  )
}
