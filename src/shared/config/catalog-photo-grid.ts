/**
 * Серии, у которых на фронтальном фото снято несколько модулей сразу.
 * Для раскладки берётся одна ячейка, иначе на схеме модуль выглядит
 * как несколько плиток и рисунок оказывается вдвое мельче.
 *
 * Проверено визуально по всем сериям allow-list (см. docs/layout-textures.md).
 */
export type PhotoGrid = { columns: number; rows: number }

const PHOTO_GRID_BY_FAMILY: Record<string, PhotoGrid> = {
  // City: сборка 2×2 модулей 300×300 мм на одном снимке
  city: { columns: 2, rows: 2 },
}

export function resolvePhotoGrid(familySlug: string): PhotoGrid {
  return PHOTO_GRID_BY_FAMILY[familySlug] ?? { columns: 1, rows: 1 }
}
