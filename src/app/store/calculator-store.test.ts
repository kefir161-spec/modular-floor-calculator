import { describe, it, expect, beforeEach } from 'vitest'
import {
  isEdgingSupported,
  selectCanRedo,
  selectCanRedoPaint,
  selectCanUndo,
  selectCanUndoPaint,
  toSavedLayout,
  useCalculatorStore,
} from '@/app/store/calculator-store'
import { createRectanglePolygon } from '@/shared/geometry/polygon'
import { createDefaultObstacle } from '@/shared/geometry/obstacles'
import { DEFAULT_EDGING, EDGING_GEOMETRY } from '@/shared/config/edging'
import { modulePaintKey } from '@/shared/lib/paint'
import type { CatalogData, ProductVariant } from '@/shared/types'

const calculableVariant: ProductVariant = {
  id: 'test-1',
  sourceId: 'test-1',
  url: '',
  name: 'Test',
  available: true,
  price: 100,
  priceUnit: 'piece',
  lengthMm: 500,
  widthMm: 500,
  weightKg: 1,
  rawParams: {},
  calculable: true,
}

const optimaDuosVariant: ProductVariant = {
  id: 'optima-9',
  sourceId: 'optima-9',
  url: 'https://plastfactor.com/catalog/detail/optima-duos/?oID=5200',
  name: 'Optima Duos 9 мм',
  available: true,
  price: 300,
  priceUnit: 'piece',
  lengthMm: 250,
  widthMm: 250,
  thicknessMm: 9,
  weightKg: 0.6,
  colorName: 'Черный',
  rawParams: {},
  calculable: true,
}

function resetStore() {
  const contour = createRectanglePolygon(1000, 1000)
  useCalculatorStore.setState({
    selectedVariant: null,
    calculation: null,
    layout: {
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    },
    display: {
      showDimensions: true,
      showCutVisualization: true,
    },
    wastePercent: 5,
    edging: { ...DEFAULT_EDGING },
    ui: {
      mobileStep: 0,
      uiError: null,
      canvasMode: 'edit',
      fullscreen: false,
      roomConfigured: true,
      polygonTool: 'select',
      snapOrtho: true,
      snapGridMm: 50,
      selectedEdgeIndex: null,
      selectedObstacleId: null,
    },
    room: {
      shapeType: 'rectangle',
      contour,
      gapMm: 5,
      unit: 'm',
      obstacles: [],
      openings: [],
    },
    roomHistory: [
      {
        contour,
        shapeType: 'rectangle',
        obstacles: [],
        openings: [],
      },
    ],
    roomHistoryIndex: 0,
    colorOverrides: {},
    paintHistory: [{}],
    paintHistoryIndex: 0,
    paintColorId: null,
    catalog: null,
  })
  useCalculatorStore.getState().recalculate()
}

describe('calculator store foundation', () => {
  beforeEach(() => {
    resetStore()
  })

  it('setDisplay does not recalculate', () => {
    useCalculatorStore.getState().selectVariant(calculableVariant)
    const before = useCalculatorStore.getState().calculation
    expect(before).not.toBeNull()

    useCalculatorStore.getState().setDisplay({ showDimensions: false })
    const after = useCalculatorStore.getState().calculation

    expect(useCalculatorStore.getState().display.showDimensions).toBe(false)
    expect(after).toBe(before)
  })

  it('setLayout does recalculate', () => {
    useCalculatorStore.getState().selectVariant(calculableVariant)
    useCalculatorStore.getState().setRoom({
      contour: createRectanglePolygon(3000, 4000),
      shapeType: 'rectangle',
    })
    const before = useCalculatorStore.getState().calculation?.modulesToPurchase

    useCalculatorStore.getState().setLayout({ rotation: 90 })
    const after = useCalculatorStore.getState().calculation?.modulesToPurchase

    expect(useCalculatorStore.getState().layout.rotation).toBe(90)
    expect(after).toBe(before)
    expect(useCalculatorStore.getState().calculation).not.toBeNull()
  })

  it('undo/redo contour history starts with initial contour', () => {
    const store = useCalculatorStore.getState()
    expect(selectCanUndo(store)).toBe(false)
    expect(selectCanRedo(store)).toBe(false)

    store.applyContour(createRectanglePolygon(2000, 2000), 'rectangle')
    expect(selectCanUndo(useCalculatorStore.getState())).toBe(true)

    useCalculatorStore.getState().undoContour()
    expect(useCalculatorStore.getState().room.contour[1]?.x).toBe(1000)
    expect(selectCanRedo(useCalculatorStore.getState())).toBe(true)

    useCalculatorStore.getState().redoContour()
    expect(useCalculatorStore.getState().room.contour[1]?.x).toBe(2000)
  })

  it('undo отменяет добавление препятствия', () => {
    const store = useCalculatorStore.getState()
    const obs = createDefaultObstacle(store.room.contour)
    store.addObstacle(obs)
    expect(useCalculatorStore.getState().room.obstacles).toHaveLength(1)
    expect(selectCanUndo(useCalculatorStore.getState())).toBe(true)

    useCalculatorStore.getState().undoContour()
    expect(useCalculatorStore.getState().room.obstacles).toHaveLength(0)
  })

  it('смена формы с resetExtras очищает препятствия', () => {
    const store = useCalculatorStore.getState()
    store.addObstacle(createDefaultObstacle(store.room.contour))
    expect(useCalculatorStore.getState().room.obstacles).toHaveLength(1)

    store.applyContour(createRectanglePolygon(5000, 4000), 'rectangle', { resetExtras: true })
    expect(useCalculatorStore.getState().room.obstacles).toHaveLength(0)
    expect(useCalculatorStore.getState().room.openings).toHaveLength(0)
  })

  it('toSavedLayout merges layout and display without showGrid', () => {
    const saved = toSavedLayout(
      { rotation: 90, offsetX: 1, offsetY: 2, startPoint: 'center' },
      { showDimensions: false, showCutVisualization: true },
    )
    expect(saved).toEqual({
      rotation: 90,
      offsetX: 1,
      offsetY: 2,
      startPoint: 'center',
      showDimensions: false,
      showCutVisualization: true,
    })
    expect('showGrid' in saved).toBe(false)
  })

  it('selectVariant на стартовом 5×4 м сразу даёт calculation (текстура)', () => {
    const contour = createRectanglePolygon(5000, 4000)
    useCalculatorStore.setState({
      selectedVariant: null,
      calculation: null,
    })
    // Как на чистом старте: валидный контур уже в store, без applyContour пользователем.
    useCalculatorStore.getState().setRoom({
      contour,
      shapeType: 'rectangle',
      gapMm: 5,
      unit: 'm',
      obstacles: [],
      openings: [],
    })
    expect(useCalculatorStore.getState().calculation).toBeNull()

    useCalculatorStore.getState().selectVariant(calculableVariant)

    const { calculation, ui } = useCalculatorStore.getState()
    expect(ui.roomConfigured).toBe(true)
    expect(calculation).not.toBeNull()
    expect(calculation!.modulesToPurchase).toBeGreaterThan(0)
  })
})

describe('окантовка в store', () => {
  beforeEach(() => {
    resetStore()
    // 3100×2100 при зазоре 5 мм и канте 45 мм даёт поле ровно 3000×2000
    useCalculatorStore.getState().setRoom({
      contour: createRectanglePolygon(3100, 2100),
      shapeType: 'rectangle',
    })
  })

  it('доступна только для Optima Duos', () => {
    expect(isEdgingSupported(optimaDuosVariant)).toBe(true)
    expect(isEdgingSupported(calculableVariant)).toBe(false)
    expect(isEdgingSupported(null)).toBe(false)
  })

  it('у другой серии кант не попадает в расчёт даже при включённом флаге', () => {
    useCalculatorStore.getState().selectVariant(calculableVariant)
    useCalculatorStore.getState().setEdging({ enabled: true })

    expect(useCalculatorStore.getState().calculation?.edging).toBeUndefined()
  })

  it('включение канта сжимает зону укладки на 45 мм и даёт спецификацию', () => {
    useCalculatorStore.getState().selectVariant(optimaDuosVariant)
    const withoutEdging = useCalculatorStore.getState().calculation!

    useCalculatorStore.getState().setEdging({ enabled: true })
    const withEdging = useCalculatorStore.getState().calculation!

    const inset = EDGING_GEOMETRY.widthMm
    expect(withEdging.workingAreaSqm).toBeCloseTo(
      ((3100 - 2 * (5 + inset)) * (2100 - 2 * (5 + inset))) / 1_000_000,
      6,
    )
    expect(withEdging.workingAreaSqm).toBeLessThan(withoutEdging.workingAreaSqm)
    expect(withEdging.modulesToPurchase).toBeLessThanOrEqual(withoutEdging.modulesToPurchase)

    expect(withEdging.edging).toMatchObject({
      thicknessMm: 9,
      straightCounts: { 1: 18, 2: 18 },
      cornerCounts: { 1: 1, 2: 1, 3: 1, 4: 1 },
      trimmedStraightCount: 0,
    })
    expect(withEdging.cutModulesCount).toBe(0)
    expect(withEdging.coverage).toMatchObject({
      tileWidthMm: 3000,
      tileLengthMm: 2000,
      outerWidthMm: 3090,
      outerLengthMm: 2090,
    })
    expect(withEdging.warnings.map((w) => w.code)).not.toContain('edging_cut_locks')
  })

  it('выключение канта возвращает исходную зону укладки', () => {
    useCalculatorStore.getState().selectVariant(optimaDuosVariant)
    const before = useCalculatorStore.getState().calculation!.workingAreaSqm

    useCalculatorStore.getState().setEdging({ enabled: true })
    useCalculatorStore.getState().setEdging({ enabled: false })

    const after = useCalculatorStore.getState().calculation!
    expect(after.workingAreaSqm).toBeCloseTo(before, 6)
    expect(after.edging).toBeUndefined()
  })

  it('выбор товара подставляет толщину канта и сбрасывает его для чужой серии', () => {
    useCalculatorStore.getState().selectVariant({ ...optimaDuosVariant, thicknessMm: 16 })
    expect(useCalculatorStore.getState().edging.thicknessMm).toBe(16)

    useCalculatorStore.getState().setEdging({ enabled: true })
    useCalculatorStore.getState().selectVariant(calculableVariant)

    expect(useCalculatorStore.getState().edging.enabled).toBe(false)
  })

  it('толщина канта меняется вручную, цена зависит от цвета плитки', () => {
    useCalculatorStore.getState().selectVariant(optimaDuosVariant)
    useCalculatorStore.getState().setEdging({ enabled: true })
    const black = useCalculatorStore.getState().calculation!.edging!

    expect(black.colorGroup).toBe('black')
    expect(black.straightPrice).toBe(66)
    expect(black.cornerPrice).toBe(136)

    useCalculatorStore.getState().setEdging({ thicknessMm: 16 })
    const stillBlack = useCalculatorStore.getState().calculation!.edging!
    expect(stillBlack.thicknessMm).toBe(16)
    expect(stillBlack.totalCost).toBe(black.totalCost)

    useCalculatorStore.getState().selectVariant({
      ...optimaDuosVariant,
      colorName: 'Серый',
    })
    useCalculatorStore.getState().setEdging({ enabled: true, thicknessMm: 9 })
    const colored = useCalculatorStore.getState().calculation!.edging!

    expect(colored.colorGroup).toBe('colored')
    expect(colored.straightPrice).toBe(74)
    expect(colored.cornerPrice).toBe(148)
    expect(colored.totalCost).toBeGreaterThan(black.totalCost)
  })

  it('подгонка 1200×800 уменьшает и увеличивает поле до целых плиток', () => {
    useCalculatorStore.getState().setRoom({
      contour: createRectanglePolygon(1200, 800),
      shapeType: 'rectangle',
    })
    useCalculatorStore.getState().selectVariant(optimaDuosVariant)
    useCalculatorStore.getState().setEdging({ enabled: true })

    const before = useCalculatorStore.getState().calculation!
    expect(before.cutModulesCount).toBeGreaterThan(0)
    expect(before.warnings.map((w) => w.code)).toContain('edging_cut_locks')

    expect(useCalculatorStore.getState().fitEdgingField('down')).toBe(true)
    const smaller = useCalculatorStore.getState()
    expect(smaller.room.contour[1]?.x).toBe(1100)
    expect(smaller.room.contour[2]?.y).toBe(600)
    expect(smaller.calculation?.cutModulesCount).toBe(0)
    expect(smaller.calculation?.fullModulesCount).toBe(8)
    expect(smaller.calculation?.warnings.map((w) => w.code)).not.toContain('edging_cut_locks')

    useCalculatorStore.getState().setRoom({
      contour: createRectanglePolygon(1200, 800),
      shapeType: 'rectangle',
    })
    useCalculatorStore.getState().setEdging({ enabled: true })
    expect(useCalculatorStore.getState().fitEdgingField('up')).toBe(true)
    const larger = useCalculatorStore.getState()
    expect(larger.room.contour[1]?.x).toBe(1350)
    expect(larger.room.contour[2]?.y).toBe(850)
    expect(larger.calculation?.cutModulesCount).toBe(0)
    expect(larger.calculation?.fullModulesCount).toBe(15)
  })

  it('sizeRef inner: заданный размер — поле плитки, итого с кантами больше', () => {
    useCalculatorStore.getState().setRoom({
      contour: createRectanglePolygon(1000, 1000),
      shapeType: 'rectangle',
      gapMm: 0,
    })
    useCalculatorStore.getState().selectVariant(optimaDuosVariant)
    useCalculatorStore.getState().setEdging({ enabled: true, sizeRef: 'outer' })

    const included = useCalculatorStore.getState().calculation!.coverage!
    expect(included.tileWidthMm).toBe(910)
    expect(included.outerWidthMm).toBe(1000)

    useCalculatorStore.getState().setEdging({ sizeRef: 'inner' })
    const added = useCalculatorStore.getState().calculation!.coverage!
    expect(added.tileWidthMm).toBe(1000)
    expect(added.outerWidthMm).toBe(1090)
    expect(added.tileLengthMm).toBe(1000)
    expect(added.outerLengthMm).toBe(1090)
  })
})

describe('calculator store paint', () => {
  beforeEach(() => {
    resetStore()
  })

  const grayVariant: ProductVariant = {
    ...calculableVariant,
    id: 'test-2',
    sourceId: 'test-2',
    colorName: 'Серый',
  }

  const twoColorCatalog: CatalogData = {
    categories: [],
    families: [
      {
        id: 'fam',
        slug: 'fam',
        name: 'Fam',
        categoryId: 'c',
        categoryName: 'c',
        variants: [calculableVariant, grayVariant],
      },
    ],
  }

  it('один мазок — один undo, смена сетки и товара сбрасывает покраску', () => {
    useCalculatorStore.setState({ catalog: twoColorCatalog })
    useCalculatorStore.getState().selectVariant(calculableVariant)

    const modules = useCalculatorStore
      .getState()
      .calculation!.layout.modules.filter((mod) => mod.status !== 'outside')
    expect(modules.length).toBeGreaterThan(1)

    const keyA = modulePaintKey(modules[0])
    const keyB = modulePaintKey(modules[1])

    useCalculatorStore.getState().setPaintColorId(grayVariant.id)
    useCalculatorStore.getState().paintModule(keyA)
    useCalculatorStore.getState().paintModule(keyB)
    expect(selectCanUndoPaint(useCalculatorStore.getState())).toBe(false)

    useCalculatorStore.getState().commitPaintStroke()
    expect(selectCanUndoPaint(useCalculatorStore.getState())).toBe(true)
    expect(useCalculatorStore.getState().colorOverrides[keyA]).toBe(grayVariant.id)
    expect(useCalculatorStore.getState().calculation?.colorBreakdown?.length).toBeGreaterThan(0)

    useCalculatorStore.getState().undoPaint()
    expect(useCalculatorStore.getState().colorOverrides).toEqual({})
    expect(selectCanRedoPaint(useCalculatorStore.getState())).toBe(true)

    useCalculatorStore.getState().redoPaint()
    expect(useCalculatorStore.getState().colorOverrides[keyB]).toBe(grayVariant.id)

    useCalculatorStore.getState().setLayout({ rotation: 90 })
    expect(useCalculatorStore.getState().colorOverrides).toEqual({})
    expect(selectCanUndoPaint(useCalculatorStore.getState())).toBe(false)

    useCalculatorStore.getState().setPaintColorId(grayVariant.id)
    useCalculatorStore.getState().paintModule(keyA)
    useCalculatorStore.getState().commitPaintStroke()
    useCalculatorStore.getState().selectVariant(grayVariant)
    expect(useCalculatorStore.getState().colorOverrides).toEqual({})
  })
})

