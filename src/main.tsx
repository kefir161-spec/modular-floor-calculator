import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyTokensToDocument } from '@/shared/config/tokens'
import { App } from '@/app/App'

applyTokensToDocument()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
