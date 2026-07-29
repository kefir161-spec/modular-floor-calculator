import { resolvePublicUrl } from '@/shared/lib/urls'

export { CATALOG_ELIGIBILITY } from './catalog-eligibility'
export { tokens, KONVA_THEME, applyTokensToDocument, tokensToCssVariables } from './tokens'

const LOCAL_CATALOG_PATH = '/data/plastfactor_catalog.xml'
const REMOTE_CATALOG_URL = 'https://plastfactor.com/bitrix/catalog_export/export_Q7r.xml'

function resolveCatalogUrl(): string {
  const mode = (import.meta.env.VITE_CATALOG_MODE ?? 'local') as 'local' | 'remote'

  if (import.meta.env.VITE_CATALOG_URL) {
    return resolvePublicUrl(import.meta.env.VITE_CATALOG_URL)
  }

  return resolvePublicUrl(mode === 'remote' ? REMOTE_CATALOG_URL : LOCAL_CATALOG_PATH)
}

export const APP_CONFIG = {
  defaultGapMm: 5,
  defaultWastePercent: 5,
  schemaVersion: 2,
  productUrlParam: import.meta.env.VITE_PRODUCT_URL_PARAM ?? 'offerId',
  catalogMode: (import.meta.env.VITE_CATALOG_MODE ?? 'local') as 'local' | 'remote',
  catalogUrl: resolveCatalogUrl(),
  maxModulesWarning: 5000,
  localStorageKey: 'plastfactor_projects',
  autosaveKey: 'plastfactor_autosave',
  contourHistoryMax: 50,
} as const
