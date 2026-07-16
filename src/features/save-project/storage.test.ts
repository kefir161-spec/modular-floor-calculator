import { describe, it, expect } from 'vitest'
import { migrateProject } from '@/features/save-project/storage'
import type { SavedProject } from '@/shared/types'

describe('project migration', () => {
  it('migrates old schema version', () => {
    const old = {
      schemaVersion: 0,
      id: '1',
      name: 'Test',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      productSourceId: '5200',
      productSnapshot: {
        id: '5200',
        sourceId: '5200',
        url: '',
        name: 'Test',
        available: true,
        priceUnit: 'unknown' as const,
        rawParams: {},
        calculable: true,
      },
      room: {
        shapeType: 'rectangle' as const,
        contour: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
          { x: 1000, y: 1000 },
          { x: 0, y: 1000 },
        ],
        gapMm: 5,
        unit: 'm' as const,
      },
      layout: {
        rotation: 0 as const,
        offsetX: 0,
        offsetY: 0,
        startPoint: 'corner' as const,
        showGrid: true,
        showDimensions: true,
        showCutVisualization: true,
      },
      wastePercent: 5,
    } satisfies SavedProject

    const migrated = migrateProject(old)
    expect(migrated.schemaVersion).toBe(1)
  })
})
