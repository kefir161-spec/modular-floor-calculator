import styles from './Skeleton.module.scss'

type Props = {
  width?: string | number
  height?: string | number
  radius?: 'sm' | 'md' | 'lg' | 'full'
  className?: string
  /** Для screen reader */
  label?: string
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'sm',
  className = '',
  label = 'Загрузка',
}: Props) {
  return (
    <span
      className={`${styles.skeleton} ${styles[radius]} ${className}`.trim()}
      style={{ width, height }}
      role="status"
      aria-label={label}
    />
  )
}
