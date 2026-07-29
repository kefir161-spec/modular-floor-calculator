import { useId } from 'react'
import styles from './Switch.module.scss'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  id?: string
}

export function Switch({ checked, onChange, label, disabled, id }: Props) {
  const autoId = useId()
  const switchId = id ?? autoId

  return (
    <label className={`${styles.root} ${disabled ? styles.disabled : ''}`.trim()} htmlFor={switchId}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`${styles.track} ${checked ? styles.on : ''}`.trim()}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} aria-hidden />
      </button>
      <span className={styles.label}>{label}</span>
    </label>
  )
}
