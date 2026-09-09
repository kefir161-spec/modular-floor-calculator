import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ProductCatalog } from '@/widgets/product-catalog/ProductCatalog'
import { useCalculatorStore } from '@/app/store/calculator-store'
import type { CatalogData, ProductVariant } from '@/shared/types'

const variant = (id: string, url: string, extra: Partial<ProductVariant> = {}): ProductVariant => ({
  id,
  sourceId: id,
  url,
  name: id,
  available: true,
  priceUnit: 'piece',
  rawParams: {},
  calculable: true,
  ...extra,
})

const catalog: CatalogData = {
  categories: [{ id: '1255', name: 'Плитка ПВХ' }],
  families: [
    {
      id: 'sensor-tech',
      slug: 'sensor-tech',
      name: 'Sensor Tech',
      categoryId: '1255',
      categoryName: 'Плитка ПВХ',
      variants: [variant('s1', 'https://plastfactor.com/catalog/detail/sensor-tech/?oID=s1')],
    },
    {
      id: 'optima-duos',
      slug: 'optima-duos',
      name: 'Optima Duos',
      categoryId: '1255',
      categoryName: 'Плитка ПВХ',
      variants: [
        variant('o1', 'https://plastfactor.com/catalog/detail/optima-duos/?oID=o1', {
          colorName: 'Черный',
        }),
      ],
    },
  ],
}

function lineToggle(label: string) {
  return screen.getByText(label).closest('button')
}

describe('ProductCatalog', () => {
  beforeEach(() => {
    useCalculatorStore.setState({
      catalog,
      catalogError: null,
      selectedVariant: null,
    })
  })

  it('по умолчанию все линейки свёрнуты, включая Sensor', () => {
    render(<ProductCatalog />)

    expect(lineToggle('Sensor')).toHaveAttribute('aria-expanded', 'false')
    expect(lineToggle('Optima')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Sensor Tech')).not.toBeInTheDocument()
  })

  it('раскрывает линейку выбранного товара — переход с карточки', async () => {
    useCalculatorStore.setState({ selectedVariant: catalog.families[1].variants[0] })
    render(<ProductCatalog />)

    await waitFor(() => {
      expect(lineToggle('Optima')).toHaveAttribute('aria-expanded', 'true')
    })
    expect(lineToggle('Sensor')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Optima Duos')).toBeInTheDocument()
  })
})
