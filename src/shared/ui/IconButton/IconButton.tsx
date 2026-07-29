import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import styles from './IconButton.module.scss'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'secondary' | 'primary'
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { label, children, size = 'md', variant = 'ghost', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`${styles.button} ${styles[size]} ${styles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
})
