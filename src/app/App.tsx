import { AppProviders } from '@/app/providers/AppProviders'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { CalculatorPage } from '@/pages/calculator/CalculatorPage'
import '@/app/styles/global.scss'

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <CalculatorPage />
      </AppProviders>
    </ErrorBoundary>
  )
}
