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

export type RoomState = {
  shapeType: RoomShapeType
  /** Room contour in mm, clockwise, closed implicitly */
  contour: Polygon
  /** Technological gap in mm */
  gapMm: number
  unit: 'mm' | 'm'
}

export type LayoutRotation = 0 | 90

export type LayoutStartPoint = 'corner' | 'center'

export type LayoutSettings = {
  rotation: LayoutRotation
  offsetX: number
  offsetY: number
  startPoint: LayoutStartPoint
  showGrid: boolean
  showDimensions: boolean
  showCutVisualization: boolean
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

export type CalculationWarning = {
  code: CalculationWarningCode
  message: string
}

export type CalculationInput = {
  roomPolygon: Polygon
  workingPolygon: Polygon
  gapMm: number
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
  layout: LayoutSettings
  wastePercent: number
}

export type OptimizeLayoutInput = {
  workingPolygon: Polygon
  roomPolygon?: Polygon
  gapMm?: number
  moduleWidthMm: number
  moduleLengthMm: number
  rotation: LayoutRotation
  startPoint: LayoutStartPoint
}

export type OptimizeLayoutResult = {
  offsetX: number
  offsetY: number
  cutCount: number
  totalCount: number
}
