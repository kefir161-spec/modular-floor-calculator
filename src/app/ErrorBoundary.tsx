import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary:', error, info)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 24, textAlign: 'center' }}>
          <h1>Что-то пошло не так</h1>
          <p>Попробуйте обновить страницу.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Обновить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
