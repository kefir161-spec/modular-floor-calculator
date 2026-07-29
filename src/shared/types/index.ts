export type Point = {
  x: number
  y: number
}

export type Polygon = Point[]

export type PriceUnit = 'piece' | 'sqm' | 'pack' | 'meter' | 'unknown'

export type ProductVariant = {
  id: string
  sourceId: string
  url: string
  name: string
  imageUrl?: string
  available: boolean
  price?: number
  currency?: string
  priceUnit: PriceUnit
  lengthMm?: number
  widthMm?: number
  thicknessMm?: number
  weightKg?: number
  colorName?: string
  ral?: string
  material?: string
  adhesiveBase?: boolean
  rawParams: Record<string, string>
  calculable: boolean
  calculableReason?: string
}

export type ProductFamily = {
  id: string
  slug: string
  name: string
  categoryId: string
  categoryName: string
  description?: string
  variants: ProductVariant[]
}

export type Category = {
  id: string
  name: string
}

export type CatalogData = {
  generatedAt?: string
  categories: Category[]
  families: ProductFamily[]
}

export type CatalogEligibilityConfig = {
  allowedFamilySlugs: string[]
  excludedFamilySlugs: string[]
  excludedOfferIds: string[]
  excludedNamePatterns: RegExp[]
}

export type RoomShapeType = 'rectangle' | 'polygon'

/** Прямоугольное внутреннее препятствие (колонна, бассейн и т.п.), мм */
export type Obstacle = {
  id: string
  kind: 'rectangle'
  x: number
  y: number
  widthMm: number
  lengthMm: number
}

/**
 * Открытый край / проём на стороне контура.
 * offsetMm — от начала ребра (вершина edgeIndex), lengthMm — длина вдоль ребра.
 */
export type Opening = {
  id: string
  edgeIndex: number
  offsetMm: number
  lengthMm: number
}

export type RoomState = {
  shapeType: RoomShapeType
  /** Room contour in mm, clockwise, closed implicitly */
  contour: Polygon
  /** Technological gap in mm */
  gapMm: number
  unit: 'mm' | 'm'
  /** Внутренние препятствия (schema v2+) */
  obstacles?: Obstacle[]
  /** Проёмы / открытые края (schema v2+) */
  openings?: Opening[]
}

export type LayoutRotation = 0 | 90

export type LayoutStartPoint = 'corner' | 'center'

/** Параметры, влияющие на раскладку и расчёт */
export type LayoutSettings = {
  rotation: LayoutRotation
  offsetX: number
  offsetY: number
  startPoint: LayoutStartPoint
}

/** Визуальные флаги — не должны запускать пересчёт геометрии */
export type DisplaySettings = {
  showDimensions: boolean
  showCutVisualization: boolean
}

/**
 * Формат layout в сохранённом проекте (schema v1+).
 * Аддитивно совместим: showGrid устарел и игнорируется при загрузке.
 */
export type SavedLayoutSettings = LayoutSettings &
  DisplaySettings & {
    /** @deprecated не используется, сохраняется только при чтении старых проектов */
    showGrid?: boolean
  }

export type CanvasInteractionMode = 'edit' | 'pan'

/** Инструменты редактора контура (Фаза 6) */
export type PolygonTool = 'select' | 'add-vertex' | 'remove-vertex' | 'obstacle' | 'opening'

export type UiState = {
  mobileStep: number
  uiError: string | null
  /** Режим взаимодействия со схемой */
  canvasMode: CanvasInteractionMode
  /** Полноэкранный режим рабочей области (не Fullscreen API) */
  fullscreen: boolean
  /**
   * Пользователь задал размеры (поля, пресет или загрузка проекта).
   * До этого стартовый контур не считается реальным расчётом.
   */
  roomConfigured: boolean
  /** Инструмент редактора полигона */
  polygonTool: PolygonTool
  /** Привязка к 90° при перетаскивании вершин */
  snapOrtho: boolean
  /** Шаг сетки мм; 0 = выкл */
  snapGridMm: number
  /** Выбранное ребро контура */
  selectedEdgeIndex: number | null
  /** Выбранное препятствие */
  selectedObstacleId: string | null
}


export type ModuleStatus = 'full' | 'cut' | 'outside'

export type LayoutModule = {
  id: string
  row: number
  col: number
  x: number
  y: number
  widthMm: number
  lengthMm: number
  status: ModuleStatus
  polygon: Polygon
  clippedPolygon?: Polygon
}

export type LayoutResult = {
  modules: LayoutModule[]
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
  layoutMeta?: {
    centerModuleFull?: boolean
    axisModeX?: string
    axisModeY?: string
  }
}

export type CalculationWarningCode =
  | 'unknown_price_unit'
  | 'missing_weight'
  | 'offset_failed'
  | 'invalid_polygon'
  | 'zero_area'
  | 'product_not_calculable'
  | 'too_many_modules'
  | 'obstacle_invalid'

export type CalculationWarning = {
  code: CalculationWarningCode
  message: string
}

export type CalculationInput = {
  roomPolygon: Polygon
  workingPolygon: Polygon
  gapMm: number
  obstacles?: Obstacle[]
  openingsLengthMm?: number
  module: {
    widthMm: number
    lengthMm: number
    weightKg?: number
    price?: number
    priceUnit: PriceUnit
  }
  layout: {
    rotation: 0 | 90
    offsetX: number
    offsetY: number
    startPoint: LayoutStartPoint
  }
  wastePercent: number
}

export type CalculationResult = {
  roomAreaSqm: number
  workingAreaSqm: number
  /** Площадь препятствий внутри зоны укладки */
  obstaclesAreaSqm: number
  openingsLengthMm: number
  fullModulesCount: number
  /** Сколько ячеек схемы с подрезкой (для отрисовки) */
  cutModulesCount: number
  /** Сколько плиток реально взять на нарезку кусков */
  cutSourceModulesCount: number
  /** Целые + плитки на подрезку (без двойного счёта мелких кусков) */
  modulesToPurchase: number
  /** @deprecated используйте modulesToPurchase */
  totalModulesCount: number
  wastePercent: number
  modulesWithWasteCount: number
  purchaseAreaSqm: number
  pricePerPiece?: number
  pricePerSqm?: number
  totalCost?: number
  totalCostBySqm?: number
  totalWeightKg?: number
  warnings: CalculationWarning[]
  layout: LayoutResult
}

export type SavedProject = {
  schemaVersion: number
  id: string
  name: string
  createdAt: string
  updatedAt: string
  productSourceId: string
  productSnapshot: ProductVariant
  room: RoomState
  layout: SavedLayoutSettings
  wastePercent: number
}
