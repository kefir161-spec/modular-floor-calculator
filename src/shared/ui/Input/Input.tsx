import type { InputHTMLAttributes } from 'react'
import styles from './Input.module.scss'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
}

export function Input({ label, hint, id, className = '', ...props }: Props) {
  const inputId = id ?? label.replace(/\s/g, '-').toLowerCase()
  return (
    <label className={`${styles.field} ${className}`.trim()} htmlFor={inputId}>
      <span className={styles.label}>{label}</span>
      <input id={inputId} className={styles.input} {...props} />
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  )
}
