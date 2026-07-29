import { useState } from 'react'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { buildResultClipboardText } from '@/features/result/build-result-text'
import { Button } from '@/shared/ui/Button/Button'
import { useToast } from '@/shared/ui/Toast'
import styles from './ResultActions.module.scss'

export type ResultActionsProps = {
  onExportPng: () => Promise<void> | void
  onExportPdf: () => Promise<void> | void
  onPrint: () => void
  /** Показать кнопку «К редактированию» (мобильный шаг результата). */
  showBackToEdit?: boolean
}

export function ResultActions({
  onExportPng,
  onExportPdf,
  onPrint,
  showBackToEdit = false,
}: ResultActionsProps) {
  const toast = useToast()
  const [busy, setBusy] = useState<'png' | 'pdf' | 'copy' | null>(null)
  const calculation = useCalculatorStore((s) => s.calculation)
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const room = useCalculatorStore((s) => s.room)
  const projectName = useCalculatorStore((s) => s.projectName)
  const setUi = useCalculatorStore((s) => s.setUi)

  const disabled = !calculation || !selectedVariant || busy !== null

  const run = async (kind: 'png' | 'pdf', fn: () => Promise<void> | void) => {
    setBusy(kind)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  const handleCopy = async () => {
    if (!calculation || !selectedVariant) return
    setBusy('copy')
    try {
      const text = buildResultClipboardText({
        projectName,
        variant: selectedVariant,
        room,
        calculation,
      })
      await navigator.clipboard.writeText(text)
      toast.push('Текст скопирован', 'success')
    } catch {
      toast.push('Не удалось скопировать', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>Действия</h3>
      <div className={styles.row}>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => void handleCopy()}
        >
          {busy === 'copy' ? 'Копирование…' : 'Копировать текст'}
        </Button>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => void run('png', onExportPng)}
        >
          {busy === 'png' ? 'PNG…' : 'PNG'}
        </Button>
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => void run('pdf', onExportPdf)}
        >
          {busy === 'pdf' ? 'PDF…' : 'PDF'}
        </Button>
        <Button variant="ghost" disabled={disabled} onClick={onPrint}>
          Печать
        </Button>
      </div>
      {showBackToEdit ? (
        <Button
          variant="primary"
          className={styles.back}
          onClick={() => setUi({ mobileStep: 1, canvasMode: 'edit' })}
        >
          К редактированию
        </Button>
      ) : null}
    </div>
  )
}
