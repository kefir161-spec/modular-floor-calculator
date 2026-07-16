import type { ReactNode } from 'react'
import styles from './Card.module.scss'

type Props = {
  title?: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className = '' }: Props) {
  return (
    <section className={`${styles.card} ${className}`.trim()}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      {children}
    </section>
  )
}
