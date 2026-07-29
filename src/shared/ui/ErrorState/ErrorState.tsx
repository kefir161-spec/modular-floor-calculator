import type { ReactNode } from 'react'
import { ErrorIcon } from '@/shared/ui/icons'
import styles from './ErrorState.module.scss'

type Props = {
  title: string
  description?: string
  details?: string
  action?: ReactNode
}

export function ErrorState({ title, description, details, action }: Props) {
  return (
    <div className={styles.root} role="alert">
      <div className={styles.icon} aria-hidden>
        <ErrorIcon />
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {details ? (
        <details className={styles.details}>
          <summary>Подробности</summary>
          <pre className={styles.pre}>{details}</pre>
        </details>
      ) : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  )
}
