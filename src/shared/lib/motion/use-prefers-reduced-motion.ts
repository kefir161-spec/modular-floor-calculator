import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * true — пользователь просит меньше анимаций.
 * Общий источник для motion UI, не дублировать matchMedia в компонентах.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return reduced
}

/** CSS-класс-модификатор для контейнеров с анимацией */
export function motionClass(reduced: boolean, animatedClass: string): string {
  return reduced ? '' : animatedClass
}
