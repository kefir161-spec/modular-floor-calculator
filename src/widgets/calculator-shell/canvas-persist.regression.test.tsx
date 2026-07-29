import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CalculatorShell } from '@/widgets/calculator-shell/CalculatorShell'
import { ToastProvider } from '@/shared/ui/Toast'
import { useCalculatorStore } from '@/app/store/calculator-store'

vi.mock('@/widgets/room-workspace/RoomWorkspace', () => ({
  RoomWorkspace: ({ onStageReady }: { onStageReady?: (api: unknown) => void }) => {
    onStageReady?.({ stage: {}, getFitTransform: () => ({ scale: 1, offsetX: 0, offsetY: 0 }) })
    return <div data-testid="room-workspace-mock">workspace</div>
  },
}))

vi.mock('@/widgets/product-catalog/ProductCatalog', () => ({
  ProductCatalog: () => <div>catalog</div>,
}))

function mockMatchMedia(mobile: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      const matches =
        query.includes('max-width: 768px') || query.includes('max-width: 1024px')
          ? mobile
          : false
      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    },
  })
}

describe('mobile canvas persistence', () => {
  beforeEach(() => {
    mockMatchMedia(true)
    useCalculatorStore.setState({
      ui: {
        ...useCalculatorStore.getState().ui,
        mobileStep: 1,
        uiError: null,
        canvasMode: 'edit',
        fullscreen: false,
        roomConfigured: true,
      },
    })
  })

  afterEach(() => {
    mockMatchMedia(false)
  })

  it('не размонтирует рабочую область при смене мобильного шага', () => {
    render(
      <ToastProvider>
        <CalculatorShell />
      </ToastProvider>,
    )

    const host = screen.getByTestId('canvas-host')
    const workspace = screen.getByTestId('room-workspace-mock')
    expect(host).toContainElement(workspace)

    act(() => {
      useCalculatorStore.getState().setUi({ mobileStep: 0 })
    })
    expect(screen.getByTestId('room-workspace-mock')).toBe(workspace)

    act(() => {
      useCalculatorStore.getState().setUi({ mobileStep: 2 })
    })
    expect(screen.getByTestId('room-workspace-mock')).toBe(workspace)
    expect(screen.getByTestId('canvas-host')).toHaveClass(/layerIdle|layer/)
  })
})
