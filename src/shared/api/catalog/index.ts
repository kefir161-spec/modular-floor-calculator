import type { CatalogData } from '@/shared/types'
import { XmlCatalogSource, loadCatalogFromString } from './xml-source'
import { YmlCatalogAdapter } from './normalize'

export async function fetchCatalog(): Promise<CatalogData> {
  const source = new XmlCatalogSource()
  const adapter = new YmlCatalogAdapter()
  const raw = await source.load()
  return adapter.normalize(raw)
}

export { XmlCatalogSource, loadCatalogFromString, YmlCatalogAdapter }
export * from './normalize'
export type { CatalogSource, RawCatalog } from './types'
