import { CalculationSummary } from '@/widgets/calculation-summary/CalculationSummary'
import {
  ResultActions,
  type ResultActionsProps,
} from '@/widgets/calculation-summary/ResultActions'
import styles from './ResultScreen.module.scss'

type Props = ResultActionsProps

/** Финальный экран результата: спецификация + экспорт / копирование / возврат. */
export function ResultScreen(props: Props) {
  return (
    <div className={styles.root}>
      <CalculationSummary />
      <ResultActions {...props} />
    </div>
  )
}
