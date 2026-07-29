import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type FocusEvent,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './Tooltip.module.scss'

type Props = {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom'
}

type Pos = { top: number; left: number }

export function Tooltip({ content, children, side = 'top' }: Props) {
  const id = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)

  const show = () => setOpen(true)
  const hide = () => setOpen(false)

  useLayoutEffect(() => {
    if (!open || !wrapRef.current || !tipRef.current) {
      setPos(null)
      return
    }

    const place = () => {
      const anchor = wrapRef.current
      const tip = tipRef.current
      if (!anchor || !tip) return

      const rect = anchor.getBoundingClientRect()
      const tipRect = tip.getBoundingClientRect()
      const gap = 6
      let top =
        side === 'bottom' ? rect.bottom + gap : rect.top - tipRect.height - gap
      let left = rect.left + rect.width / 2 - tipRect.width / 2

      if (top < 8) top = rect.bottom + gap
      if (top + tipRect.height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - tipRect.height - gap)
      }
      left = Math.min(
        Math.max(8, left),
        window.innerWidth - tipRect.width - 8,
      )

      setPos({ top, left })
    }

    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, side, content])

  return (
    <span
      ref={wrapRef}
      className={styles.wrap}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={(e: FocusEvent) => {
        if (e.currentTarget.contains(e.target as Node)) show()
      }}
      onBlur={(e: FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) hide()
      }}
    >
      {children}
      {open
        ? createPortal(
            <span
              ref={tipRef}
              role="tooltip"
              id={id}
              className={styles.portal}
              style={
                pos
                  ? { top: pos.top, left: pos.left, visibility: 'visible' }
                  : { top: 0, left: 0, visibility: 'hidden' }
              }
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}
