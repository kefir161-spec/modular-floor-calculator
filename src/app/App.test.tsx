import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AppProviders } from '@/app/providers/AppProviders'
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

describe('Catalog loading', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads catalog from XML snapshot', async () => {
    render(
      <AppProviders>
        <div data-testid="child">ready</div>
      </AppProviders>,
    )

    await waitFor(
      () => {
        expect(screen.getByTestId('child')).toBeInTheDocument()
      },
      { timeout: 15000 },
    )
  })
})
