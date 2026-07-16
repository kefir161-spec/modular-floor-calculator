import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { fetchCatalog } from '@/shared/api/catalog'
import { APP_CONFIG } from '@/shared/config'
import { useCalculatorStore } from '@/app/store/calculator-store'
import type { ProductVariant } from '@/shared/types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,
      retry: 1,
    },
  },
})

function CatalogLoader({ children }: { children: ReactNode }) {
  const setCatalog = useCalculatorStore((s) => s.setCatalog)
  const setCatalogError = useCalculatorStore((s) => s.setCatalogError)
  const selectVariant = useCalculatorStore((s) => s.selectVariant)
  const catalog = useCalculatorStore((s) => s.catalog)
  const catalogError = useCalculatorStore((s) => s.catalogError)

  useEffect(() => {
    let cancelled = false

    fetchCatalog()
      .then((data) => {
        if (cancelled) return
        setCatalog(data)
        setCatalogError(null)

        const params = new URLSearchParams(window.location.search)
        const productId =
          params.get(APP_CONFIG.productUrlParam) ??
          params.get('productId') ??
          params.get('offerId')

        if (productId && !useCalculatorStore.getState().selectedVariant) {
          const variant = findVariantById(data.families, productId)
          if (variant) selectVariant(variant)
        }
      })
      .catch((err: Error) => {
        if (cancelled) return
        setCatalogError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [setCatalog, setCatalogError, selectVariant])

  if (!catalog) {
    if (catalogError) {
      return (
        <div role="alert" className="pf-loading">
          {catalogError}
        </div>
      )
    }
    return (
      <div role="status" aria-live="polite" className="pf-loading">
        Загрузка каталога…
      </div>
    )
  }

  return <>{children}</>
}

function findVariantById(
  families: { variants: ProductVariant[] }[],
  id: string,
): ProductVariant | null {
  for (const family of families) {
    const found = family.variants.find((v) => v.id === id || v.sourceId === id)
    if (found) return found
  }
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CatalogLoader>{children}</CatalogLoader>
    </QueryClientProvider>
  )
}
