import { useState, useCallback } from 'react'
import { toSavedLayout, useCalculatorStore } from '@/app/store/calculator-store'
import { APP_CONFIG } from '@/shared/config'
import {
  createProjectId,
  loadProjects,
  saveAutosave,
  saveProjects,
} from '@/features/save-project/storage'
import type { SavedProject } from '@/shared/types'

export function useProjectStorage() {
  const projectName = useCalculatorStore((s) => s.projectName)
  const setProjectName = useCalculatorStore((s) => s.setProjectName)
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const room = useCalculatorStore((s) => s.room)
  const layout = useCalculatorStore((s) => s.layout)
  const display = useCalculatorStore((s) => s.display)
  const wastePercent = useCalculatorStore((s) => s.wastePercent)
  const setRoom = useCalculatorStore((s) => s.setRoom)
  const loadSavedLayout = useCalculatorStore((s) => s.loadSavedLayout)
  const applyContour = useCalculatorStore((s) => s.applyContour)
  const setWastePercent = useCalculatorStore((s) => s.setWastePercent)
  const selectVariant = useCalculatorStore((s) => s.selectVariant)
  const setUi = useCalculatorStore((s) => s.setUi)
  const catalog = useCalculatorStore((s) => s.catalog)

  const [projects, setProjects] = useState<SavedProject[]>(() => loadProjects())
  const [message, setMessage] = useState<string | null>(null)
  const clearMessage = useCallback(() => setMessage(null), [])

  const buildProject = (): SavedProject | null => {
    if (!selectedVariant) return null
    const now = new Date().toISOString()
    return {
      schemaVersion: APP_CONFIG.schemaVersion,
      id: createProjectId(),
      name: projectName,
      createdAt: now,
      updatedAt: now,
      productSourceId: selectedVariant.sourceId,
      productSnapshot: selectedVariant,
      room,
      layout: toSavedLayout(layout, display),
      wastePercent,
    }
  }

  const handleSave = () => {
    const project = buildProject()
    if (!project) {
      setMessage('Выберите товар перед сохранением')
      return
    }
    const existing = projects.find((p) => p.name === project.name)
    const updated = existing
      ? projects.map((p) =>
          p.name === project.name ? { ...project, id: p.id, createdAt: p.createdAt } : p,
        )
      : [...projects, project]
    if (!saveProjects(updated)) {
      setMessage('localStorage недоступен')
      return
    }
    saveAutosave(project)
    setProjects(updated)
    setMessage('Проект сохранён')
  }

  const handleLoad = (id: string) => {
    const project = projects.find((p) => p.id === id)
    if (!project) return

    setProjectName(project.name)
    setRoom({
      gapMm: project.room.gapMm,
      unit: project.room.unit,
      shapeType: project.room.shapeType,
    })
    applyContour(project.room.contour, project.room.shapeType)
    loadSavedLayout(project.layout)
    setWastePercent(project.wastePercent)
    setUi({ roomConfigured: true })

    const liveVariant = catalog?.families
      .flatMap((f) => f.variants)
      .find((v) => v.sourceId === project.productSourceId)

    if (liveVariant) {
      selectVariant(liveVariant)
      setMessage('Проект загружен')
    } else {
      selectVariant(project.productSnapshot)
      setMessage('Товар из каталога не найден — используется снимок данных')
    }
  }

  return {
    projectName,
    setProjectName,
    projects,
    message,
    clearMessage,
    handleSave,
    handleLoad,
  }
}
