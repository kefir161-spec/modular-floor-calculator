import type { SavedProject } from '@/shared/types'

/**
 * Снапшот проекта schemaVersion 1 — как его сохраняло приложение до Фазы 0.
 * Не менять: используется для регрессии загрузки старых проектов.
 */
export const SAVED_PROJECT_V1_FIXTURE: SavedProject = {
  schemaVersion: 1,
  id: 'proj-fixture-v1',
  name: 'Регрессия v1',
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T12:00:00.000Z',
  productSourceId: '5200',
  productSnapshot: {
    id: '5200',
    sourceId: '5200',
    url: 'https://plastfactor.com/catalog/example/',
    name: 'Factor чёрный',
    imageUrl: undefined,
    available: true,
    price: 435,
    currency: 'RUB',
    priceUnit: 'piece',
    lengthMm: 375,
    widthMm: 375,
    thicknessMm: 7,
    weightKg: 0.79,
    colorName: 'Чёрный',
    rawParams: {},
    calculable: true,
  },
  room: {
    shapeType: 'rectangle',
    contour: [
      { x: 0, y: 0 },
      { x: 4000, y: 0 },
      { x: 4000, y: 3000 },
      { x: 0, y: 3000 },
    ],
    gapMm: 5,
    unit: 'm',
  },
  layout: {
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    startPoint: 'corner',
    showDimensions: true,
    showCutVisualization: true,
  },
  wastePercent: 5,
}

/** Старый проект с deprecated-полем showGrid и schemaVersion 0 */
export const SAVED_PROJECT_V0_WITH_GRID = {
  schemaVersion: 0,
  id: 'proj-fixture-v0',
  name: 'Старый проект',
  createdAt: '2025-12-01T10:00:00.000Z',
  updatedAt: '2025-12-01T10:00:00.000Z',
  productSourceId: '5200',
  productSnapshot: SAVED_PROJECT_V1_FIXTURE.productSnapshot,
  room: {
    shapeType: 'rectangle' as const,
    contour: [
      { x: 0, y: 0 },
      { x: 2000, y: 0 },
      { x: 2000, y: 2000 },
      { x: 0, y: 2000 },
    ],
    gapMm: 5,
    // unit отсутствовал в самых ранних снимках — migrate добавляет
  },
  layout: {
    rotation: 90 as const,
    offsetX: 10,
    offsetY: 20,
    startPoint: 'center' as const,
    showGrid: true,
    showDimensions: false,
    showCutVisualization: true,
  },
  wastePercent: 10,
}
