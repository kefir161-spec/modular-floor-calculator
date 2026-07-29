import type { DisplaySettings, LayoutSettings, RoomState, SavedLayoutSettings, SavedProject } from '@/shared/types'
import { APP_CONFIG } from '@/shared/config'

function migrateLayout(layout: SavedLayoutSettings): SavedLayoutSettings {
  return {
    rotation: layout.rotation ?? 0,
    offsetX: layout.offsetX ?? 0,
    offsetY: layout.offsetY ?? 0,
    startPoint: layout.startPoint ?? 'corner',
    showDimensions: layout.showDimensions ?? true,
    showCutVisualization: layout.showCutVisualization ?? true,
    // showGrid намеренно отбрасывается
  }
}

function migrateRoom(room: Partial<RoomState> & Pick<RoomState, 'contour' | 'shapeType' | 'gapMm'>): RoomState {
  return {
    shapeType: room.shapeType,
    contour: room.contour,
    gapMm: room.gapMm,
    unit: room.unit ?? 'mm',
    obstacles: room.obstacles ?? [],
    openings: room.openings ?? [],
  }
}

export function migrateProject(project: SavedProject): SavedProject {
  return {
    ...project,
    schemaVersion: Math.max(project.schemaVersion, APP_CONFIG.schemaVersion),
    room: migrateRoom(project.room),
    layout: migrateLayout(project.layout),
  }
}

export function splitSavedLayout(saved: SavedLayoutSettings): {
  layout: LayoutSettings
  display: DisplaySettings
} {
  return {
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
  }
}

export function loadProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(APP_CONFIG.localStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedProject[]
    return parsed.map(migrateProject)
  } catch {
    return []
  }
}

export function saveProjects(projects: SavedProject[]): boolean {
  try {
    localStorage.setItem(APP_CONFIG.localStorageKey, JSON.stringify(projects))
    return true
  } catch {
    return false
  }
}

export function saveAutosave(project: SavedProject): boolean {
  try {
    localStorage.setItem(APP_CONFIG.autosaveKey, JSON.stringify(project))
    return true
  } catch {
    return false
  }
}

export function loadAutosave(): SavedProject | null {
  try {
    const raw = localStorage.getItem(APP_CONFIG.autosaveKey)
    if (!raw) return null
    return migrateProject(JSON.parse(raw) as SavedProject)
  } catch {
    return null
  }
}

export function createProjectId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
