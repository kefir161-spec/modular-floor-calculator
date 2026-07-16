export type RawOfferParam = {
  '@_name'?: string
  '@_unit'?: string
  '#text'?: string | number
}

export type RawOffer = {
  '@_id'?: string
  '@_available'?: string | boolean
  url?: string
  price?: string | number
  currencyId?: string
  categoryId?: string | number
  picture?: string | string[]
  name?: string
  vendor?: string
  description?: string
  weight?: string | number
  dimensions?: string
  param?: RawOfferParam | RawOfferParam[]
}

export type RawCategory = {
  '@_id'?: string
  '@_parentId'?: string
  '#text'?: string
}

export type RawCatalog = {
  yml_catalog?: {
    '@_date'?: string
    shop?: {
      categories?: {
        category?: RawCategory | RawCategory[]
      }
      offers?: {
        offer?: RawOffer | RawOffer[]
      }
    }
  }
}

export interface CatalogSource {
  load(): Promise<RawCatalog>
}
