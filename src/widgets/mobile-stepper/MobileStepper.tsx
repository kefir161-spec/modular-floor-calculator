import { useCalculatorStore } from '@/app/store/calculator-store'
import styles from './MobileStepper.module.scss'

const STEPS = ['Товар', 'Помещение', 'Результат']

export function MobileStepper() {
  const step = useCalculatorStore((s) => s.mobileStep)
  const setStep = useCalculatorStore((s) => s.setMobileStep)

  return (
    <nav className={styles.stepper} aria-label="Шаги калькулятора">
      {STEPS.map((label, i) => (
        <button
          key={label}
          type="button"
          className={`${styles.step} ${i === step ? styles.active : ''}`}
          onClick={() => setStep(i)}
          aria-current={i === step ? 'step' : undefined}
        >
          <span className={styles.number}>{i + 1}</span>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  )
}

export function useIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 768px)').matches
}
