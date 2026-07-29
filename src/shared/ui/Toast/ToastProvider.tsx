import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  CloseIcon,
  ErrorIcon,
  InfoIcon,
  SuccessIcon,
  WarningIcon,
} from '@/shared/ui/icons'
import { IconButton } from '@/shared/ui/IconButton/IconButton'
import { ToastContext } from './use-toast'
import type { ToastItem, ToastTone } from './types'
import styles from './Toast.module.scss'

const ICONS = {
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  info: InfoIcon,
} as const

const DEFAULT_TTL_MS = 4000

let toastSeq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = `toast-${++toastSeq}`
      setItems((prev) => [...prev, { id, message, tone }])
      window.setTimeout(() => dismiss(id), DEFAULT_TTL_MS)
    },
    [dismiss],
  )

  const api = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div className={styles.viewport} aria-live="polite" aria-relevant="additions">
              {items.map((item) => {
                const Icon = ICONS[item.tone]
                return (
                  <div
                    key={item.id}
                    role={item.tone === 'error' ? 'alert' : 'status'}
                    className={`${styles.toast} ${styles[item.tone]}`}
                  >
                    <Icon className={styles.icon} aria-hidden />
                    <p className={styles.message}>{item.message}</p>
                    <IconButton
                      label="Закрыть уведомление"
                      size="sm"
                      onClick={() => dismiss(item.id)}
                    >
                      <CloseIcon />
                    </IconButton>
                  </div>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  )
}
