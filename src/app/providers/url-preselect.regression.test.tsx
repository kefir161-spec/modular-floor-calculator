import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { AppProviders } from '@/app/providers/AppProviders'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

vi.mock('@/shared/api/catalog', async () => {
  const { loadCatalogFromString } = await import('@/shared/api/catalog/xml-source')
  const { YmlCatalogAdapter } = await import('@/shared/api/catalog/normalize')

  return {
    fetchCatalog: async () => {
      const xml = readFileSync(
        resolve(process.cwd(), 'public/data/plastfactor_catalog.xml'),
        'utf8',
      )
      const raw = loadCatalogFromString(xml)
      return new YmlCatalogAdapter().normalize(raw)
    },
  }
})

describe('URL product preselection regression', () => {
  beforeEach(() => {
    localStorage.clear()
    useCalculatorStore.setState({
      catalog: null,
      catalogError: null,
      selectedVariant: null,
    })
    window.history.pushState({}, '', '/calculator/')
  })

  it('предвыбирает товар по offerId из URL', async () => {
    window.history.pushState({}, '', '/calculator/?offerId=5200')

    render(
      <AppProviders>
        <div data-testid="child">ready</div>
      </AppProviders>,
    )

    await waitFor(
      () => {
        const variant = useCalculatorStore.getState().selectedVariant
        expect(variant).not.toBeNull()
        expect(variant?.id === '5200' || variant?.sourceId === '5200').toBe(true)
      },
      { timeout: 15000 },
    )
  })

  it('без параметра URL товар не предвыбирается', async () => {
    render(
      <AppProviders>
        <div data-testid="child">ready</div>
      </AppProviders>,
    )

    await waitFor(
      () => {
        expect(useCalculatorStore.getState().catalog).not.toBeNull()
      },
      { timeout: 15000 },
    )

    expect(useCalculatorStore.getState().selectedVariant).toBeNull()
  })
})
