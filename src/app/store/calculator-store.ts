import { create } from 'zustand'
import type {
  CalculationResult,
  CatalogData,
  LayoutSettings,
  ProductVariant,
  RoomState,
} from '@/shared/types'
import { APP_CONFIG } from '@/shared/config'
import { createRectanglePolygon, offsetPolygonInward } from '@/shared/geometry/polygon'
import { calculate } from '@/entities/calculation/calculate'

const defaultRoom: RoomState = {
  shapeType: 'rectangle',
  contour: createRectanglePolygon(1000, 1000),
  gapMm: APP_CONFIG.defaultGapMm,
  unit: 'm',
}

const defaultLayout: LayoutSettings = {
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  startPoint: 'corner',
  showGrid: false,
  showDimensions: true,
  showCutVisualization: true,
}

type CalculatorState = {
  catalog: CatalogData | null
  catalogError: string | null
  selectedVariant: ProductVariant | null
  room: RoomState
  workingContour: ReturnType<typeof computeWorkingContour>
  layout: LayoutSettings
  wastePercent: number
  calculation: CalculationResult | null
  projectName: string
  mobileStep: number
  uiError: string | null

  setCatalog: (catalog: CatalogData) => void
  setCatalogError: (error: string | null) => void
  selectVariant: (variant: ProductVariant | null) => void
  setRoom: (room: Partial<RoomState>) => void
  setContour: (contour: RoomState['contour']) => void
  setLayout: (layout: Partial<LayoutSettings>) => void
  setWastePercent: (value: number) => void
  setProjectName: (name: string) => void
  setMobileStep: (step: number) => void
  setUiError: (error: string | null) => void
  recalculate: () => void
  resetLayout: () => void
}

/**
 * Размеры помещения — от стены до стены.
 * Зона укладки = контур с учётом технологического зазора у стен (inward offset).
 * @see https://plastfactor.com/installation-tips/
 */
function computeWorkingContour(room: RoomState) {
  return offsetPolygonInward(room.contour, room.gapMm)
}

function runCalculation(
  room: RoomState,
  workingResult: ReturnType<typeof computeWorkingContour>,
  variant: ProductVariant | null,
  layout: LayoutSettings,
  wastePercent: number,
): CalculationResult | null {
  if (!variant?.calculable || !variant.lengthMm || !variant.widthMm) return null
  if (!workingResult.success) return null

  return calculate({
    roomPolygon: room.contour,
    workingPolygon: workingResult.polygon,
    gapMm: room.gapMm,
    module: {
      widthMm: variant.widthMm,
      lengthMm: variant.lengthMm,
      weightKg: variant.weightKg,
      price: variant.price,
      priceUnit: variant.priceUnit,
    },
    layout: {
      rotation: layout.rotation,
      offsetX: layout.offsetX,
      offsetY: layout.offsetY,
      startPoint: layout.startPoint,
    },
    wastePercent,
  })
}

export const useCalculatorStore = create<CalculatorState>((set, get) => {
  const working = computeWorkingContour(defaultRoom)

  return {
    catalog: null,
    catalogError: null,
    selectedVariant: null,
    room: defaultRoom,
    workingContour: working,
    layout: defaultLayout,
    wastePercent: APP_CONFIG.defaultWastePercent,
    calculation: null,
    projectName: 'Новый проект',
    mobileStep: 0,
    uiError: null,

    setCatalog: (catalog) => set({ catalog }),
    setCatalogError: (error) => set({ catalogError: error }),
    selectVariant: (variant) => {
      const state = get()
      const layout = {
        ...state.layout,
        startPoint: 'corner' as const,
        offsetX: 0,
        offsetY: 0,
      }

      set({ selectedVariant: variant, layout })
      get().recalculate()
    },
    setRoom: (partial) => {
      const room = { ...get().room, ...partial }
      const workingContour = computeWorkingContour(room)
      set({ room, workingContour })
      get().recalculate()
    },
    setContour: (contour) => {
      const room = { ...get().room, contour, shapeType: 'polygon' as const }
      const workingContour = computeWorkingContour(room)
      set({ room, workingContour })
      get().recalculate()
    },
    setLayout: (partial) => {
      const layout = { ...get().layout, ...partial }
      set({ layout })
      get().recalculate()
    },
    setWastePercent: (value) => {
      set({ wastePercent: value })
      get().recalculate()
    },
    setProjectName: (name) => set({ projectName: name }),
    setMobileStep: (step) => set({ mobileStep: step }),
    setUiError: (error) => set({ uiError: error }),
    recalculate: () => {
      const { room, workingContour, selectedVariant, layout, wastePercent } = get()
      const calculation = runCalculation(
        room,
        workingContour,
        selectedVariant,
        layout,
        wastePercent,
      )
      set({ calculation })
    },
    resetLayout: () => {
      set({ layout: { ...defaultLayout } })
      get().recalculate()
    },
  }
})
