import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EdgingPanel } from '@/widgets/room-params/EdgingPanel'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { createRectanglePolygon } from '@/shared/geometry/polygon'
import { DEFAULT_EDGING } from '@/shared/config/edging'
import type { ProductVariant } from '@/shared/types'

const optimaDuos: ProductVariant = {
  id: 'optima-9',
  sourceId: 'optima-9',
  url: 'https://plastfactor.com/catalog/detail/optima-duos/?oID=5200',
  name: 'Optima Duos 9 мм',
  available: true,
  price: 300,
  priceUnit: 'piece',
  lengthMm: 250,
  widthMm: 250,
  thicknessMm: 9,
  rawParams: {},
  calculable: true,
}

const otherSeries: ProductVariant = {
  ...optimaDuos,
  id: 'sensor-1',
  sourceId: 'sensor-1',
  url: 'https://plastfactor.com/catalog/detail/sensor-tech/?oID=1',
  name: 'Sensor Tech',
}

function selectVariant(variant: ProductVariant) {
  act(() => {
    useCalculatorStore.setState({ edging: { ...DEFAULT_EDGING } })
    useCalculatorStore.getState().setRoom({
      contour: createRectanglePolygon(3100, 2100),
      shapeType: 'rectangle',
    })
    useCalculatorStore.getState().selectVariant(variant)
  })
}

describe('EdgingPanel', () => {
  beforeEach(() => {
    useCalculatorStore.setState({ selectedVariant: null, edging: { ...DEFAULT_EDGING } })
  })

  it('не показывается для серий без окантовки', () => {
    selectVariant(otherSeries)
    const { container } = render(<EdgingPanel />)

    expect(container).toBeEmptyDOMElement()
  })

  it('для Optima Duos включает кант и показывает количество элементов', async () => {
    const user = userEvent.setup()
    selectVariant(optimaDuos)
    render(<EdgingPanel />)

    const toggle = screen.getByRole('switch', { name: 'Канты по периметру' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(useCalculatorStore.getState().calculation?.edging?.straightTotal).toBe(36)
    expect(screen.getByText(/Прямых:/)).toHaveTextContent('Прямых: 36 · Угловых: 4 · цветной')
  })

  it('переключение толщины меняет расчёт и предупреждает о расхождении с плиткой', async () => {
    const user = userEvent.setup()
    selectVariant(optimaDuos)
    render(<EdgingPanel />)

    await user.click(screen.getByRole('switch', { name: 'Канты по периметру' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '16 мм' }))

    expect(useCalculatorStore.getState().calculation?.edging?.thicknessMm).toBe(16)
    expect(screen.getByRole('alert')).toHaveTextContent('Плитка 9 мм')
  })
})
