export type ToastTone = 'success' | 'warning' | 'error' | 'info'

export type ToastItem = {
  id: string
  message: string
  tone: ToastTone
}

export type ToastApi = {
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}
