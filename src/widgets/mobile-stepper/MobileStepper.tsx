import { useCalculatorStore } from '@/app/store/calculator-store'
import styles from './MobileStepper.module.scss'

const STEPS = ['Покрытие', 'Помещение', 'Результат']

export function MobileStepper() {
  const step = useCalculatorStore((s) => s.ui.mobileStep)
  const setUi = useCalculatorStore((s) => s.setUi)

  return (
    <nav className={styles.stepper} aria-label="Шаги калькулятора">
      {STEPS.map((label, i) => (
        <button
          key={label}
          type="button"
          className={`${styles.step} ${i === step ? styles.active : ''}`}
          onClick={() => setUi({ mobileStep: i })}
          aria-current={i === step ? 'step' : undefined}
        >
          <span className={styles.number}>{i + 1}</span>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  )
}
