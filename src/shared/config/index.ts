import type { CatalogEligibilityConfig } from '@/shared/types'
import { resolvePublicUrl } from '@/shared/lib/urls'

const LOCAL_CATALOG_PATH = '/data/plastfactor_catalog.xml'
const REMOTE_CATALOG_URL = 'https://plastfactor.com/bitrix/catalog_export/export_Q7r.xml'

function resolveCatalogUrl(): string {
  const mode = (import.meta.env.VITE_CATALOG_MODE ?? 'local') as 'local' | 'remote'

  if (import.meta.env.VITE_CATALOG_URL) {
    return resolvePublicUrl(import.meta.env.VITE_CATALOG_URL)
  }

  return resolvePublicUrl(mode === 'remote' ? REMOTE_CATALOG_URL : LOCAL_CATALOG_PATH)
}

/**
 * Allow-list серий модульных напольных покрытий для калькулятора.
 * Документировано в docs/catalog-adapter.md
 */
export const CATALOG_ELIGIBILITY: CatalogEligibilityConfig = {
  allowedFamilySlugs: [
    'factor',
    'factor-sport',
    'factor-sport-hs',
    'sensor-tech',
    'sensor-sota',
    'sensor-avers',
    'sensor-bit',
    'sensor-euro',
    'sensor-rice',
    'sensor-stiks',
    'optima-duos',
    'sensor-secret-avers',
    'sensor-secret-tech',
    'sensor-yoga',
    'canal',
    'sensor-stone',
    'sensor-wood',
    'sensor-sigma',
    'veropol-com',
    'veropol-prof',
    'veropol-stone',
    'sensor-yoga-bit',
    'sensor-yoga-euro',
    'sensor-yoga-sigma',
    'sensor-yoga-stiks',
    'sensor-yoga-tech',
    'aqua',
    'aqua-stone',
    'aqua-marine',
    'aqua-marine-color',
    'city',
    'klever-sport',
    'city-decking',
    'broneplast',
  ],
  excludedFamilySlugs: [],
  excludedOfferIds: [],
  excludedNamePatterns: [
    /тактильн/i,
    /taktil/i,
    /alyuminiev/i,
    /алюминиев/i,
    /грязезащитн.*лент/i,
    /кашпо/i,
    /kashpo/i,
    /пуф/i,
    /диван/i,
    /мебель/i,
    /sporto/i,
  ],
}

export const APP_CONFIG = {
  defaultGapMm: 5,
  defaultWastePercent: 5,
  schemaVersion: 1,
  productUrlParam: import.meta.env.VITE_PRODUCT_URL_PARAM ?? 'offerId',
  catalogMode: (import.meta.env.VITE_CATALOG_MODE ?? 'local') as 'local' | 'remote',
  catalogUrl: resolveCatalogUrl(),
  maxModulesWarning: 5000,
  localStorageKey: 'plastfactor_projects',
  autosaveKey: 'plastfactor_autosave',
} as const
