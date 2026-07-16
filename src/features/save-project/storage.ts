import type { SavedProject } from '@/shared/types'
import { APP_CONFIG } from '@/shared/config'

export function migrateProject(project: SavedProject): SavedProject {
  if (project.schemaVersion >= APP_CONFIG.schemaVersion) return project

  return {
    ...project,
    schemaVersion: APP_CONFIG.schemaVersion,
    room: {
      ...project.room,
      unit: project.room.unit ?? 'mm',
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
