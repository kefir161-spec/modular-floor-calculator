import { describe, it, expect } from 'vitest'
import { migrateProject, splitSavedLayout } from '@/features/save-project/storage'
import {
  SAVED_PROJECT_V0_WITH_GRID,
  SAVED_PROJECT_V1_FIXTURE,
} from '@/features/save-project/fixtures/saved-project-v1'
import type { SavedProject } from '@/shared/types'

describe('project migration regression', () => {
  it('загружает снапшот schemaVersion 1 без потери данных и поднимает до v4', () => {
    const migrated = migrateProject(structuredClone(SAVED_PROJECT_V1_FIXTURE))

    expect(migrated.schemaVersion).toBe(4)
    expect(migrated.id).toBe('proj-fixture-v1')
    expect(migrated.name).toBe('Регрессия v1')
    expect(migrated.productSourceId).toBe('5200')
    expect(migrated.room.contour).toEqual(SAVED_PROJECT_V1_FIXTURE.room.contour)
    expect(migrated.room.unit).toBe('m')
    expect(migrated.room.gapMm).toBe(5)
    expect(migrated.room.obstacles).toEqual([])
    expect(migrated.room.openings).toEqual([])
    expect(migrated.room.shapePreset).toBe('rectangle')
    expect(migrated.layout.rotation).toBe(0)
    expect(migrated.layout.startPoint).toBe('corner')
    expect(migrated.layout.showDimensions).toBe(true)
    expect(migrated.layout.showCutVisualization).toBe(true)
    expect(migrated.layout.showGrid).toBeUndefined()
    expect(migrated.wastePercent).toBe(5)
    expect(migrated.productSnapshot.lengthMm).toBe(375)
    // v3: окантовки в старых проектах не было
    expect(migrated.edging).toEqual({ enabled: false, thicknessMm: 9 })
    expect(migrated.colorOverrides).toEqual({})
  })

  it('мигрирует schemaVersion 0: добавляет unit, отбрасывает showGrid, v2–v4 поля', () => {
    const migrated = migrateProject(
      structuredClone(SAVED_PROJECT_V0_WITH_GRID) as unknown as SavedProject,
    )

    expect(migrated.schemaVersion).toBe(4)
    expect(migrated.edging).toEqual({ enabled: false, thicknessMm: 9 })
    expect(migrated.colorOverrides).toEqual({})
    expect(migrated.room.unit).toBe('mm')
    expect(migrated.room.obstacles).toEqual([])
    expect(migrated.room.openings).toEqual([])
    expect(migrated.layout.rotation).toBe(90)
    expect(migrated.layout.offsetX).toBe(10)
    expect(migrated.layout.offsetY).toBe(20)
    expect(migrated.layout.startPoint).toBe('center')
    expect(migrated.layout.showDimensions).toBe(false)
    expect(migrated.layout.showCutVisualization).toBe(true)
    expect(migrated.layout.showGrid).toBeUndefined()
    expect(migrated.wastePercent).toBe(10)
  })

  it('сохраняет включённую окантовку из проекта v3', () => {
    const project: SavedProject = {
      ...structuredClone(SAVED_PROJECT_V1_FIXTURE),
      schemaVersion: 3,
      edging: { enabled: true, thicknessMm: 16 },
    }

    expect(migrateProject(project).edging).toEqual({ enabled: true, thicknessMm: 16 })
    expect(migrateProject(project).colorOverrides).toEqual({})
    expect(migrateProject(project).schemaVersion).toBe(4)
  })

  it('сохраняет покраску из проекта v4', () => {
    const project: SavedProject = {
      ...structuredClone(SAVED_PROJECT_V1_FIXTURE),
      schemaVersion: 4,
      colorOverrides: { '0:0': 'gray-1' },
    }

    expect(migrateProject(project).colorOverrides).toEqual({ '0:0': 'gray-1' })
  })

  it('splitSavedLayout разделяет геометрию и display', () => {
    const { layout, display } = splitSavedLayout(SAVED_PROJECT_V1_FIXTURE.layout)
    expect(layout).toEqual({
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      startPoint: 'corner',
    })
    expect(display).toEqual({
      showDimensions: true,
      showCutVisualization: true,
    })
  })

  it('round-trip JSON снапшота v1 сохраняет ключевые поля', () => {
    const raw = JSON.stringify(SAVED_PROJECT_V1_FIXTURE)
    const parsed = JSON.parse(raw) as SavedProject
    const migrated = migrateProject(parsed)

    expect(migrated).toMatchObject({
      schemaVersion: 4,
      productSourceId: '5200',
      wastePercent: 5,
      room: { gapMm: 5, unit: 'm', shapeType: 'rectangle', obstacles: [], openings: [] },
      layout: {
        rotation: 0,
        startPoint: 'corner',
        showDimensions: true,
        showCutVisualization: true,
      },
    })
  })
})
