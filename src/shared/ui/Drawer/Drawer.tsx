import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEscapeKey } from '@/shared/lib/focus/use-escape-key'
import { useFocusTrap } from '@/shared/lib/focus/use-focus-trap'
import { usePrefersReducedMotion } from '@/shared/lib/motion/use-prefers-reduced-motion'
import { CloseIcon } from '@/shared/ui/icons'
import { IconButton } from '@/shared/ui/IconButton/IconButton'
import styles from './Drawer.module.scss'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  side?: 'left' | 'right' | 'bottom'
}

export function Drawer({ open, onClose, title, children, side = 'right' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const handleClose = useCallback(() => onClose(), [onClose])

  useFocusTrap(open, panelRef)
  useEscapeKey(open, handleClose)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.root} data-reduced-motion={reducedMotion || undefined}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Закрыть"
        onClick={handleClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${styles.panel} ${styles[side]}`}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <IconButton label="Закрыть" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
