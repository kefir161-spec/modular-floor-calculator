import { describe, it, expect, beforeEach } from 'vitest'
import {
  selectCanRedo,
  selectCanUndo,
  toSavedLayout,
  useCalculatorStore,
} from '@/app/store/calculator-store'
import { createRectanglePolygon } from '@/shared/geometry/polygon'
import { createDefaultObstacle } from '@/shared/geometry/obstacles'
import type { ProductVariant } from '@/shared/types'

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
