import { create } from 'zustand'
import type {
  CalculationResult,
  CatalogData,
  DisplaySettings,
  LayoutSettings,
  Obstacle,
  Opening,
  Polygon,
  ProductVariant,
  RoomState,
  SavedLayoutSettings,
  UiState,
} from '@/shared/types'
import { APP_CONFIG } from '@/shared/config'
import { createRectanglePolygon, isPolygonValid, offsetPolygonInward } from '@/shared/geometry/polygon'
import { totalOpeningsLengthMm } from '@/shared/geometry/obstacles'
import { calculate } from '@/entities/calculation/calculate'

const defaultRoom: RoomState = {
  shapeType: 'rectangle',
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
  roomConfigured: false,
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
  obstacles: Obstacle[]
  openings: Opening[]
}

export type ApplyContourOptions = {
  /** Сбросить препятствия и проёмы (смена пресета формы / площади). */
  resetExtras?: boolean
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
  roomConfigured: boolean,
): CalculationResult | null {
  if (!roomConfigured) return null
  if (!variant?.calculable || !variant.lengthMm || !variant.widthMm) return null
  if (!workingResult.success) return null
  if (!isPolygonValid(room.contour)) return null

  const openings = room.openings ?? []
  return calculate({
    roomPolygon: room.contour,
    workingPolygon: workingResult.polygon,
    gapMm: room.gapMm,
    obstacles: room.obstacles ?? [],
    openingsLengthMm: totalOpeningsLengthMm(openings),
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
    obstacles: cloneObstacles(room.obstacles),
    openings: cloneOpenings(room.openings),
  }
}

function applySnapshot(room: RoomState, snap: RoomHistoryEntry): RoomState {
  return {
    ...room,
    contour: cloneContour(snap.contour),
    shapeType: snap.shapeType,
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
  const working = computeWorkingContour(defaultRoom)
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

      set({ selectedVariant: variant, layout })
      get().recalculate()
    },
    setRoom: (partial) => {
      const prev = get().room
      const room = { ...prev, ...partial }
      const workingContour = computeWorkingContour(room)
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
      const room = { ...get().room, contour, shapeType: 'polygon' as const }
      const workingContour = computeWorkingContour(room)
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
      const room: RoomState = {
        ...prev,
        contour,
        shapeType,
        obstacles,
        openings,
      }
      const workingContour = computeWorkingContour(room)
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
      const layout = { ...get().layout, ...partial }
      set({ layout })
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
      const { room, workingContour, selectedVariant, layout, wastePercent, ui } = get()
      const calculation = runCalculation(
        room,
        workingContour,
        selectedVariant,
        layout,
        wastePercent,
        ui.roomConfigured,
      )
      set({ calculation })
    },
    resetLayout: () => {
      set({ layout: { ...defaultLayout } })
      get().recalculate()
    },
    undoContour: () => {
      const { roomHistory, roomHistoryIndex, room } = get()
      if (roomHistoryIndex <= 0) return
      const newIndex = roomHistoryIndex - 1
      const nextRoom = applySnapshot(room, roomHistory[newIndex])
      const workingContour = computeWorkingContour(nextRoom)
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
      const workingContour = computeWorkingContour(nextRoom)
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
  }
})

export function selectCanUndo(state: CalculatorState): boolean {
  return state.roomHistoryIndex > 0
}

export function selectCanRedo(state: CalculatorState): boolean {
  return state.roomHistoryIndex < state.roomHistory.length - 1
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
