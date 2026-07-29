const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  )
}

/**
 * Ловушка фокуса внутри контейнера.
 * Возвращает cleanup: снимает слушатель и возвращает фокус на previousActive.
 */
export function trapFocus(container: HTMLElement, previousActive: Element | null): () => void {
  const focusables = getFocusableElements(container)
  const first = focusables[0]

  if (first) {
    first.focus()
  } else {
    container.setAttribute('tabindex', '-1')
    container.focus()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return
    const items = getFocusableElements(container)
    if (items.length === 0) {
      event.preventDefault()
      return
    }

    const firstEl = items[0]
    const lastEl = items[items.length - 1]
    const active = document.activeElement

    if (event.shiftKey) {
      if (active === firstEl || !container.contains(active)) {
        event.preventDefault()
        lastEl.focus()
      }
    } else if (active === lastEl) {
      event.preventDefault()
      firstEl.focus()
    }
  }

  container.addEventListener('keydown', onKeyDown)

  return () => {
    container.removeEventListener('keydown', onKeyDown)
    if (previousActive instanceof HTMLElement) {
      previousActive.focus()
    }
  }
}
