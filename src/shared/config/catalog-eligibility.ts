import type { CatalogEligibilityConfig } from '@/shared/types'

/**
 * Allow-list серий модульных напольных покрытий для калькулятора.
 * Документировано в docs/catalog-adapter.md
 *
 * Вынесено отдельно от APP_CONFIG: список нужен и офлайн-скриптам,
 * которые работают без переменных окружения Vite.
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
