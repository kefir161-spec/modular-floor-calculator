import { create } from 'zustand'
import type {
  CalculationResult,
  CatalogData,
  ColorOverrides,
  DisplaySettings,
  EdgingSettings,
  LayoutSettings,
  Obstacle,
  Opening,
  Polygon,
  ProductVariant,
  RoomShapePreset,
  RoomState,
  SavedLayoutSettings,
  UiState,
} from '@/shared/types'
import { APP_CONFIG } from '@/shared/config'
import { DEFAULT_EDGING, EDGING_FAMILY_SLUG, isEdgingThickness } from '@/shared/config/edging'
import { extractFamilySlug } from '@/shared/api/catalog/normalize'
import { workingInsetMm } from '@/shared/geometry/edging'
import { applyPaintOverride, cloneColorOverrides, colorOverridesEqual, findFamilyByVariant, paintPalette } from '@/shared/lib/paint'
import { createRectanglePolygon, isPolygonValid, offsetPolygonInward } from '@/shared/geometry/polygon'
import { inferShapePreset } from '@/shared/geometry/room-contour'
import { totalOpeningsLengthMm } from '@/shared/geometry/obstacles'
import { calculate } from '@/entities/calculation/calculate'

const defaultRoom: RoomState = {
  shapeType: 'rectangle',
  shapePreset: 'rectangle',
  contour: createRectanglePolygon(5000, 4000),
  gapMm: APP_CONFIG.defaultGapMm,
  unit: 'm',
  obstacles: [],
  openings: [],
}

const defaultLayout: LayoutSettings = {
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
  startPoint: 'corner',
}

const defaultDisplay: DisplaySettings = {
  showDimensions: true,
  showCutVisualization: true,
}

const defaultUi: UiState = {
  mobileStep: 0,
  uiError: null,
  canvasMode: 'edit',
  fullscreen: false,
  // Стартовый контур 5×4 м — валидное помещение; иначе selectVariant не даёт calculation/текстуру.
  roomConfigured: true,
  polygonTool: 'select',
  snapOrtho: true,
  snapGridMm: 50,
  selectedEdgeIndex: null,
  selectedObstacleId: null,
}

/** Снимок редактируемой геометрии помещения для undo/redo. */
export type RoomHistoryEntry = {
  contour: Polygon
  shapeType: RoomState['shapeType']
  shapePreset?: RoomShapePreset
  obstacles: Obstacle[]
  openings: Opening[]
}

export type ApplyContourOptions = {
  /** Сбросить препятствия и проёмы (смена пресета формы / площади). */
  resetExtras?: boolean
  shapePreset?: RoomShapePreset
}

type CalculatorState = {
  catalog: CatalogData | null
  catalogError: string | null
  selectedVariant: ProductVariant | null
  room: RoomState
  workingContour: ReturnType<typeof computeWorkingContour>
  layout: LayoutSettings
  display: DisplaySettings
  wastePercent: number
  edging: EdgingSettings
  colorOverrides: ColorOverrides
  paintColorId: string | null
  paintHistory: ColorOverrides[]
  paintHistoryIndex: number
  calculation: CalculationResult | null
  projectName: string
  ui: UiState
  roomHistory: RoomHistoryEntry[]
  roomHistoryIndex: number

  setCatalog: (catalog: CatalogData) => void
  setCatalogError: (error: string | null) => void
  selectVariant: (variant: ProductVariant | null) => void
  setRoom: (room: Partial<RoomState>) => void
  /** Живое обновление контура без записи в историю (drag вершины) */
  setContour: (contour: Polygon) => void
  /** Применить контур и зафиксировать в истории undo/redo */
  applyContour: (
    contour: Polygon,
    shapeType?: RoomState['shapeType'],
    options?: ApplyContourOptions,
  ) => void
  /** Зафиксировать текущее состояние комнаты в истории (после drag) */
  commitContourHistory: () => void
  setLayout: (layout: Partial<LayoutSettings>) => void
  setDisplay: (display: Partial<DisplaySettings>) => void
  setWastePercent: (value: number) => void
  setEdging: (edging: Partial<EdgingSettings>) => void
  setPaintColorId: (id: string | null) => void
  paintModule: (key: string) => void
  commitPaintStroke: () => void
  undoPaint: () => void
  redoPaint: () => void
  loadColorOverrides: (overrides: ColorOverrides) => void
  setProjectName: (name: string) => void
  setUi: (ui: Partial<UiState>) => void
  /** @deprecated используйте setUi({ mobileStep }) */
  setMobileStep: (step: number) => void
  /** @deprecated используйте setUi({ uiError }) */
  setUiError: (error: string | null) => void
  recalculate: () => void
  resetLayout: () => void
  undoContour: () => void
  redoContour: () => void
  loadSavedLayout: (saved: SavedLayoutSettings) => void
  addObstacle: (obstacle: Obstacle) => void
  updateObstacle: (id: string, patch: Partial<Obstacle>, options?: { recordHistory?: boolean }) => void
  removeObstacle: (id: string) => void
  addOpening: (opening: Opening) => void
  updateOpening: (id: string, patch: Partial<Opening>, options?: { recordHistory?: boolean }) => void
  removeOpening: (id: string) => void
}

/** Окантовка доступна только для серии Optima Duos. */
export function isEdgingSupported(variant: ProductVariant | null): boolean {
  if (!variant) return false
  return extractFamilySlug(variant.url) === EDGING_FAMILY_SLUG
}

/**
 * Размеры помещения — от стены до стены.
 * Зона укладки = контур с учётом технологического зазора у стен (inward offset)
 * и ширины окантовки, если она включена.
 * @see https://plastfactor.com/installation-tips/
 */
function computeWorkingContour(room: RoomState, edging: EdgingSettings) {
  return offsetPolygonInward(room.contour, workingInsetMm(room.gapMm, edging))
}

function emptyPaintState(): {
  colorOverrides: ColorOverrides
  paintHistory: ColorOverrides[]
  paintHistoryIndex: number
} {
  return {
    colorOverrides: {},
    paintHistory: [{}],
    paintHistoryIndex: 0,
  }
}

function runCalculation(
  room: RoomState,
  workingResult: ReturnType<typeof computeWorkingContour>,
  variant: ProductVariant | null,
  layout: LayoutSettings,
  wastePercent: number,
  roomConfigured: boolean,
  edging: EdgingSettings,
  catalog: CatalogData | null,
  colorOverrides: ColorOverrides,
): CalculationResult | null {
  if (!roomConfigured) return null
  if (!variant?.calculable || !variant.lengthMm || !variant.widthMm) return null
  if (!workingResult.success) return null
  if (!isPolygonValid(room.contour)) return null

  const openings = room.openings ?? []
  const family = catalog ? findFamilyByVariant(catalog.families, variant) : undefined
  const palette = family ? paintPalette(family, variant) : []

  return calculate({
    roomPolygon: room.contour,
    workingPolygon: workingResult.polygon,
    gapMm: room.gapMm,
    obstacles: room.obstacles ?? [],
    openingsLengthMm: totalOpeningsLengthMm(openings),
    module: {
      id: variant.id,
      widthMm: variant.widthMm,
      lengthMm: variant.lengthMm,
      weightKg: variant.weightKg,
      price: variant.price,
      priceUnit: variant.priceUnit,
      colorName: variant.colorName,
    },
    layout: {
      rotation: layout.rotation,
      offsetX: layout.offsetX,
      offsetY: layout.offsetY,
      startPoint: layout.startPoint,
    },
    wastePercent,
    edging: isEdgingSupported(variant) ? edging : undefined,
    colorOverrides,
    paletteVariants: palette.map((item) => ({
      id: item.id,
      colorName: item.colorName,
      price: item.price,
      priceUnit: item.priceUnit,
    })),
  })
}

function cloneContour(contour: Polygon): Polygon {
  return contour.map((p) => ({ x: p.x, y: p.y }))
}

function cloneObstacles(list: Obstacle[] | undefined): Obstacle[] {
  return (list ?? []).map((o) => ({ ...o }))
}

function cloneOpenings(list: Opening[] | undefined): Opening[] {
  return (list ?? []).map((o) => ({ ...o }))
}

function snapshotRoom(room: RoomState): RoomHistoryEntry {
  return {
    contour: cloneContour(room.contour),
    shapeType: room.shapeType,
    shapePreset: room.shapePreset,
    obstacles: cloneObstacles(room.obstacles),
    openings: cloneOpenings(room.openings),
  }
}

function applySnapshot(room: RoomState, snap: RoomHistoryEntry): RoomState {
  return {
    ...room,
    contour: cloneContour(snap.contour),
    shapeType: snap.shapeType,
    shapePreset: snap.shapePreset,
    obstacles: cloneObstacles(snap.obstacles),
    openings: cloneOpenings(snap.openings),
  }
}

function contoursEqual(a: Polygon, b: Polygon): boolean {
  if (a.length !== b.length) return false
  return a.every((p, i) => p.x === b[i]?.x && p.y === b[i]?.y)
}

function obstaclesEqual(a: Obstacle[], b: Obstacle[]): boolean {
  if (a.length !== b.length) return false
  return a.every((o, i) => {
    const t = b[i]
    return (
      t &&
      o.id === t.id &&
      o.x === t.x &&
      o.y === t.y &&
      o.widthMm === t.widthMm &&
      o.lengthMm === t.lengthMm &&
      o.kind === t.kind
    )
  })
}

function openingsEqual(a: Opening[], b: Opening[]): boolean {
  if (a.length !== b.length) return false
  return a.every((o, i) => {
    const t = b[i]
    return (
      t &&
      o.id === t.id &&
      o.edgeIndex === t.edgeIndex &&
      o.offsetMm === t.offsetMm &&
      o.lengthMm === t.lengthMm
    )
  })
}

function snapshotsEqual(a: RoomHistoryEntry, b: RoomHistoryEntry): boolean {
  return (
    a.shapeType === b.shapeType &&
    a.shapePreset === b.shapePreset &&
    contoursEqual(a.contour, b.contour) &&
    obstaclesEqual(a.obstacles, b.obstacles) &&
    openingsEqual(a.openings, b.openings)
  )
}

function pushRoomHistory(
  history: RoomHistoryEntry[],
  index: number,
  entry: RoomHistoryEntry,
): { roomHistory: RoomHistoryEntry[]; roomHistoryIndex: number } {
  if (index >= 0 && history[index] && snapshotsEqual(history[index], entry)) {
    return { roomHistory: history, roomHistoryIndex: index }
  }
  const trimmed = history.slice(0, index + 1)
  trimmed.push(entry)
  while (trimmed.length > APP_CONFIG.contourHistoryMax) {
    trimmed.shift()
  }
  return {
    roomHistory: trimmed,
    roomHistoryIndex: trimmed.length - 1,
  }
}

function filterOpeningsForContour(openings: Opening[], contour: Polygon): Opening[] {
  return openings.filter((o) => o.edgeIndex >= 0 && o.edgeIndex < contour.length)
}

export const useCalculatorStore = create<CalculatorState>((set, get) => {
  const working = computeWorkingContour(defaultRoom, DEFAULT_EDGING)
  const initialSnap = snapshotRoom(defaultRoom)

  return {
    catalog: null,
    catalogError: null,
    selectedVariant: null,
    room: defaultRoom,
    workingContour: working,
    layout: defaultLayout,
    display: defaultDisplay,
    wastePercent: APP_CONFIG.defaultWastePercent,
    edging: DEFAULT_EDGING,
    ...emptyPaintState(),
    paintColorId: null,
    calculation: null,
    projectName: 'Новый проект',
    ui: defaultUi,
    roomHistory: [initialSnap],
    roomHistoryIndex: 0,

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
      // Кант доступен только у Optima Duos, а его толщина по умолчанию — от плитки.
      const supported = isEdgingSupported(variant)
      const edging: EdgingSettings = {
        enabled: supported && state.edging.enabled,
        thicknessMm: isEdgingThickness(variant?.thicknessMm)
          ? variant.thicknessMm
          : state.edging.thicknessMm,
      }

      set({
        selectedVariant: variant,
        layout,
        edging,
        workingContour: computeWorkingContour(state.room, edging),
        paintColorId: variant?.id ?? null,
        ...emptyPaintState(),
      })
      get().recalculate()
    },
    setEdging: (partial) => {
      const state = get()
      const edging = { ...state.edging, ...partial }
      set({ edging, workingContour: computeWorkingContour(state.room, edging) })
      get().recalculate()
    },
    setRoom: (partial) => {
      const prev = get().room
      const room = { ...prev, ...partial }
      const workingContour = computeWorkingContour(room, get().edging)
      const contourChanged =
        partial.contour !== undefined && !contoursEqual(prev.contour, room.contour)
      const markConfigured = contourChanged

      if (contourChanged) {
        const history = pushRoomHistory(
          get().roomHistory,
          get().roomHistoryIndex,
          snapshotRoom(room),
        )
        set({
          room,
          workingContour,
          ...history,
          ...(markConfigured ? { ui: { ...get().ui, roomConfigured: true } } : {}),
        })
      } else {
        set({ room, workingContour })
      }
      get().recalculate()
    },
    setContour: (contour) => {
      const prev = get().room
      const shapePreset = inferShapePreset(contour, undefined, prev.shapePreset)
      const room = {
        ...prev,
        contour,
        shapeType: (shapePreset === 'rectangle' ? 'rectangle' : 'polygon') as RoomState['shapeType'],
        shapePreset,
      }
      const workingContour = computeWorkingContour(room, get().edging)
      set({
        room,
        workingContour,
        ui: { ...get().ui, roomConfigured: true },
      })
      get().recalculate()
    },
    applyContour: (contour, shapeType = 'polygon', options) => {
      const prev = get().room
      const reset = options?.resetExtras === true
      const openings = reset
        ? []
        : filterOpeningsForContour(prev.openings ?? [], contour)
      const obstacles = reset ? [] : cloneObstacles(prev.obstacles)
      const shapePreset =
        options?.shapePreset ??
        (shapeType === 'rectangle'
          ? 'rectangle'
          : inferShapePreset(contour, shapeType, prev.shapePreset))
      const room: RoomState = {
        ...prev,
        contour,
        shapeType,
        shapePreset,
        obstacles,
        openings,
      }
      const workingContour = computeWorkingContour(room, get().edging)
      const history = pushRoomHistory(get().roomHistory, get().roomHistoryIndex, snapshotRoom(room))
      set({
        room,
        workingContour,
        ...history,
        ui: {
          ...get().ui,
          roomConfigured: true,
          ...(reset ? { selectedObstacleId: null, selectedEdgeIndex: null } : {}),
        },
      })
      get().recalculate()
    },
    commitContourHistory: () => {
      const { room, roomHistory, roomHistoryIndex } = get()
      set(pushRoomHistory(roomHistory, roomHistoryIndex, snapshotRoom(room)))
    },
    setLayout: (partial) => {
      const prev = get().layout
      const layout = { ...prev, ...partial }
      const gridChanged =
        partial.rotation !== undefined ||
        partial.offsetX !== undefined ||
        partial.offsetY !== undefined ||
        partial.startPoint !== undefined
      set({ layout, ...(gridChanged ? emptyPaintState() : {}) })
      get().recalculate()
    },
    setDisplay: (partial) => {
      set({ display: { ...get().display, ...partial } })
      // намеренно без recalculate — визуальные флаги не влияют на геометрию
    },
    setWastePercent: (value) => {
      set({ wastePercent: value })
      get().recalculate()
    },
    setProjectName: (name) => set({ projectName: name }),
    setUi: (partial) => set({ ui: { ...get().ui, ...partial } }),
    setMobileStep: (step) => set({ ui: { ...get().ui, mobileStep: step } }),
    setUiError: (error) => set({ ui: { ...get().ui, uiError: error } }),
    recalculate: () => {
      const {
        room,
        workingContour,
        selectedVariant,
        layout,
        wastePercent,
        ui,
        edging,
        catalog,
        colorOverrides,
      } = get()
      const calculation = runCalculation(
        room,
        workingContour,
        selectedVariant,
        layout,
        wastePercent,
        ui.roomConfigured,
        edging,
        catalog,
        colorOverrides,
      )
      set({ calculation })
    },
    resetLayout: () => {
      set({ layout: { ...defaultLayout }, ...emptyPaintState() })
      get().recalculate()
    },
    undoContour: () => {
      const { roomHistory, roomHistoryIndex, room } = get()
      if (roomHistoryIndex <= 0) return
      const newIndex = roomHistoryIndex - 1
      const nextRoom = applySnapshot(room, roomHistory[newIndex])
      const workingContour = computeWorkingContour(nextRoom, get().edging)
      set({
        room: nextRoom,
        workingContour,
        roomHistoryIndex: newIndex,
        ui: {
          ...get().ui,
          selectedObstacleId: null,
          selectedEdgeIndex: null,
        },
      })
      get().recalculate()
    },
    redoContour: () => {
      const { roomHistory, roomHistoryIndex, room } = get()
      if (roomHistoryIndex >= roomHistory.length - 1) return
      const newIndex = roomHistoryIndex + 1
      const nextRoom = applySnapshot(room, roomHistory[newIndex])
      const workingContour = computeWorkingContour(nextRoom, get().edging)
      set({
        room: nextRoom,
        workingContour,
        roomHistoryIndex: newIndex,
        ui: {
          ...get().ui,
          selectedObstacleId: null,
          selectedEdgeIndex: null,
        },
      })
      get().recalculate()
    },
    loadSavedLayout: (saved) => {
      set({
        layout: {
          rotation: saved.rotation,
          offsetX: saved.offsetX,
          offsetY: saved.offsetY,
          startPoint: saved.startPoint,
        },
        display: {
          showDimensions: saved.showDimensions,
          showCutVisualization: saved.showCutVisualization,
        },
      })
      get().recalculate()
    },
    addObstacle: (obstacle) => {
      const room = get().room
      const nextRoom = {
        ...room,
        obstacles: [...(room.obstacles ?? []), obstacle],
      }
      const history = pushRoomHistory(
        get().roomHistory,
        get().roomHistoryIndex,
        snapshotRoom(nextRoom),
      )
      set({
        room: nextRoom,
        ...history,
        ui: { ...get().ui, selectedObstacleId: obstacle.id, roomConfigured: true },
      })
      get().recalculate()
    },
    updateObstacle: (id, patch, options) => {
      const room = get().room
      const obstacles = (room.obstacles ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o))
      const nextRoom = { ...room, obstacles }
      const recordHistory = options?.recordHistory !== false
      if (recordHistory) {
        const history = pushRoomHistory(
          get().roomHistory,
          get().roomHistoryIndex,
          snapshotRoom(nextRoom),
        )
        set({ room: nextRoom, ...history })
      } else {
        set({ room: nextRoom })
      }
      get().recalculate()
    },
    removeObstacle: (id) => {
      const room = get().room
      const obstacles = (room.obstacles ?? []).filter((o) => o.id !== id)
      const nextRoom = { ...room, obstacles }
      const selectedObstacleId =
        get().ui.selectedObstacleId === id ? null : get().ui.selectedObstacleId
      const history = pushRoomHistory(
        get().roomHistory,
        get().roomHistoryIndex,
        snapshotRoom(nextRoom),
      )
      set({
        room: nextRoom,
        ...history,
        ui: { ...get().ui, selectedObstacleId },
      })
      get().recalculate()
    },
    addOpening: (opening) => {
      const room = get().room
      const nextRoom = {
        ...room,
        openings: [...(room.openings ?? []), opening],
      }
      const history = pushRoomHistory(
        get().roomHistory,
        get().roomHistoryIndex,
        snapshotRoom(nextRoom),
      )
      set({
        room: nextRoom,
        ...history,
        ui: { ...get().ui, roomConfigured: true },
      })
      get().recalculate()
    },
    updateOpening: (id, patch, options) => {
      const room = get().room
      const openings = (room.openings ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o))
      const nextRoom = { ...room, openings }
      const recordHistory = options?.recordHistory !== false
      if (recordHistory) {
        const history = pushRoomHistory(
          get().roomHistory,
          get().roomHistoryIndex,
          snapshotRoom(nextRoom),
        )
        set({ room: nextRoom, ...history })
      } else {
        set({ room: nextRoom })
      }
      get().recalculate()
    },
    removeOpening: (id) => {
      const room = get().room
      const nextRoom = {
        ...room,
        openings: (room.openings ?? []).filter((o) => o.id !== id),
      }
      const history = pushRoomHistory(
        get().roomHistory,
        get().roomHistoryIndex,
        snapshotRoom(nextRoom),
      )
      set({ room: nextRoom, ...history })
      get().recalculate()
    },
    setPaintColorId: (id) => set({ paintColorId: id }),
    paintModule: (key) => {
      const { selectedVariant, paintColorId, colorOverrides } = get()
      if (!selectedVariant || !paintColorId) return
      const next = applyPaintOverride(colorOverrides, key, paintColorId, selectedVariant.id)
      if (next === colorOverrides) return
      set({ colorOverrides: next })
    },
    commitPaintStroke: () => {
      const { colorOverrides, paintHistory, paintHistoryIndex } = get()
      const current = cloneColorOverrides(colorOverrides)
      const last = paintHistory[paintHistoryIndex] ?? {}
      if (colorOverridesEqual(current, last)) return
      const trimmed = paintHistory.slice(0, paintHistoryIndex + 1)
      trimmed.push(current)
      while (trimmed.length > APP_CONFIG.contourHistoryMax) trimmed.shift()
      set({
        paintHistory: trimmed,
        paintHistoryIndex: trimmed.length - 1,
      })
      get().recalculate()
    },
    undoPaint: () => {
      const { paintHistory, paintHistoryIndex } = get()
      if (paintHistoryIndex <= 0) return
      const nextIndex = paintHistoryIndex - 1
      set({
        paintHistoryIndex: nextIndex,
        colorOverrides: cloneColorOverrides(paintHistory[nextIndex] ?? {}),
      })
      get().recalculate()
    },
    redoPaint: () => {
      const { paintHistory, paintHistoryIndex } = get()
      if (paintHistoryIndex >= paintHistory.length - 1) return
      const nextIndex = paintHistoryIndex + 1
      set({
        paintHistoryIndex: nextIndex,
        colorOverrides: cloneColorOverrides(paintHistory[nextIndex] ?? {}),
      })
      get().recalculate()
    },
    loadColorOverrides: (overrides) => {
      const cloned = cloneColorOverrides(overrides)
      set({
        colorOverrides: cloned,
        paintHistory: [cloned],
        paintHistoryIndex: 0,
      })
      get().recalculate()
    },
  }
})

export function selectCanUndo(state: CalculatorState): boolean {
  return state.roomHistoryIndex > 0
}

export function selectCanRedo(state: CalculatorState): boolean {
  return state.roomHistoryIndex < state.roomHistory.length - 1
}

export function selectCanUndoPaint(state: CalculatorState): boolean {
  return state.paintHistoryIndex > 0
}

export function selectCanRedoPaint(state: CalculatorState): boolean {
  return state.paintHistoryIndex < state.paintHistory.length - 1
}

/** Собрать layout для сохранения проекта */
export function toSavedLayout(
  layout: LayoutSettings,
  display: DisplaySettings,
): SavedLayoutSettings {
  return {
    rotation: layout.rotation,
    offsetX: layout.offsetX,
    offsetY: layout.offsetY,
    startPoint: layout.startPoint,
    showDimensions: display.showDimensions,
    showCutVisualization: display.showCutVisualization,
  }
}
