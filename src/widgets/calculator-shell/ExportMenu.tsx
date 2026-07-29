import { useEffect, useRef, useState } from 'react'
import { ExportIcon } from '@/shared/ui/icons'
import { Button } from '@/shared/ui/Button/Button'
import styles from './ExportMenu.module.scss'

type Props = {
  onExportPng: () => Promise<void> | void
  onExportPdf: () => Promise<void> | void
  onPrint: () => void
  busy?: boolean
}

export function ExportMenu({ onExportPng, onExportPdf, onPrint, busy }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'png' | 'pdf' | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = async (kind: 'png' | 'pdf', fn: () => Promise<void> | void) => {
    setLoading(kind)
    try {
      await fn()
      setOpen(false)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy || loading !== null}
        onClick={() => setOpen((v) => !v)}
      >
        <ExportIcon aria-hidden />
        Экспорт
      </Button>
      {open ? (
        <div className={styles.menu} role="menu" aria-label="Экспорт">
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            disabled={loading !== null}
            onClick={() => void run('png', onExportPng)}
          >
            {loading === 'png' ? 'PNG…' : 'Скачать PNG'}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            disabled={loading !== null}
            onClick={() => void run('pdf', onExportPdf)}
          >
            {loading === 'pdf' ? 'PDF…' : 'Скачать PDF'}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            disabled={loading !== null}
            onClick={() => {
              onPrint()
              setOpen(false)
            }}
          >
            Печать
          </button>
        </div>
      ) : null}
    </div>
  )
}
