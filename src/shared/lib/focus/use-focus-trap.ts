import { useEffect, useRef } from 'react'
import { trapFocus } from './trap-focus'

/** Focus trap + возврат фокуса при закрытии */
export function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>): void {
  const previousRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    previousRef.current = document.activeElement
    return trapFocus(container, previousRef.current)
  }, [active, containerRef])
}
