import type { CatalogData } from '@/shared/types'
import type { RawCatalog } from './types'

export interface CatalogAdapter {
  normalize(raw: RawCatalog): CatalogData
}
