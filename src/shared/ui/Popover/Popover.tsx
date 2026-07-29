import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useEscapeKey } from '@/shared/lib/focus/use-escape-key'
import { useFocusTrap } from '@/shared/lib/focus/use-focus-trap'
import styles from './Popover.module.scss'

const NARROW_MQ = '(max-width: 768px)'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Элемент-якорь для позиционирования desktop-popover */
  anchorRef: React.RefObject<HTMLElement | null>
}

type Position = { top: number; left: number }

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(NARROW_MQ).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(NARROW_MQ)
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return narrow
}

function computePosition(anchor: HTMLElement, panel: HTMLElement): Position {
  const rect = anchor.getBoundingClientRect()
  const panelRect = panel.getBoundingClientRect()
  const gap = 8
  let top = rect.bottom + gap
  let left = rect.left

  if (top + panelRect.height > window.innerHeight - 8) {
    top = Math.max(8, rect.top - panelRect.height - gap)
  }
  if (left + panelRect.width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - panelRect.width - 8)
  }
  return { top, left }
}

export function Popover({ open, onClose, title, children, anchorRef }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const narrow = useIsNarrow()
  const [pos, setPos] = useState<Position>({ top: 0, left: 0 })
  const handleClose = useCallback(() => onClose(), [onClose])

  useFocusTrap(open, panelRef)
  useEscapeKey(open, handleClose)

  useLayoutEffect(() => {
    if (!open || narrow) return
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return
    setPos(computePosition(anchor, panel))
  }, [open, narrow, anchorRef, children])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      handleClose()
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open, handleClose, anchorRef])

  if (!open || typeof document === 'undefined') return null

  if (narrow) {
    return createPortal(
      <div className={styles.sheetRoot}>
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
          aria-labelledby={title ? titleId : undefined}
          className={styles.sheet}
        >
          {title ? (
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
          ) : null}
          <div className={styles.body}>{children}</div>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className={styles.popover}
      style={{ top: pos.top, left: pos.left }}
    >
      {title ? (
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
      ) : null}
      <div className={styles.body}>{children}</div>
    </div>,
    document.body,
  )
}
