import { useRef, useState, useEffect, useCallback } from 'react'
import type Konva from 'konva'
import { Card } from '@/shared/ui/Card/Card'
import { Button } from '@/shared/ui/Button/Button'
import { ProductCatalog } from '@/widgets/product-catalog/ProductCatalog'
import { RoomWorkspace } from '@/widgets/room-workspace/RoomWorkspace'
import { CalculationSummary } from '@/widgets/calculation-summary/CalculationSummary'
import { MobileStepper } from '@/widgets/mobile-stepper/MobileStepper'
import { ProjectHeaderActions } from '@/features/save-project/ProjectHeaderActions'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { buildExportFilename, exportStageToPng } from '@/features/export-png/export-png'
import { exportToPdf } from '@/features/export-pdf/export-pdf'
import styles from './CalculatorShell.module.scss'

export function CalculatorShell() {
  const mobileStep = useCalculatorStore((s) => s.mobileStep)
  const calculation = useCalculatorStore((s) => s.calculation)
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const room = useCalculatorStore((s) => s.room)
  const projectName = useCalculatorStore((s) => s.projectName)
  const resetLayout = useCalculatorStore((s) => s.resetLayout)
  const [isMobile, setIsMobile] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const stageRef = useRef<Konva.Stage | null>(null)

  const handleStageReady = useCallback((stage: Konva.Stage) => {
    stageRef.current = stage
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const handleExportPng = async () => {
    try {
      const stage = stageRef.current
      if (!stage) {
        setExportError('Схема не найдена для экспорта')
        return
      }
      await exportStageToPng(stage, buildExportFilename('plastfactor-layout'))
      setExportError(null)
    } catch {
      setExportError('Экспорт PNG не удался')
    }
  }

  const handleExportPdf = async () => {
    if (!calculation || !selectedVariant) {
      setExportError('Нет данных для PDF')
      return
    }
    try {
      const canvasDataUrl = stageRef.current?.toDataURL({ pixelRatio: 2 })
      await exportToPdf({
        variant: selectedVariant,
        room,
        calculation,
        canvasDataUrl,
        projectName,
      })
      setExportError(null)
    } catch {
      setExportError('Экспорт PDF не удался')
    }
  }

  const handlePrint = () => window.print()

  const visible = (panel: 'catalog' | 'room' | 'result') => {
    if (!isMobile) return true
    const map = { catalog: 0, room: 1, result: 2 } as const
    return mobileStep === map[panel]
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <h1 className={styles.title}>Калькулятор напольных покрытий</h1>
          <p className={styles.subtitle}>ПластФактор</p>
        </div>

        <div className={`${styles.headerActions} no-print`}>
          <ProjectHeaderActions />
          <div className={styles.toolbar}>
            <Button variant="secondary" onClick={handleExportPng}>
              PNG
            </Button>
            <Button variant="secondary" onClick={handleExportPdf}>
              PDF
            </Button>
            <Button variant="secondary" onClick={handlePrint}>
              Печать
            </Button>
            <Button variant="ghost" onClick={resetLayout}>
              Сброс
            </Button>
          </div>
          {exportError ? (
            <p role="alert" className={styles.exportError}>
              {exportError}
            </p>
          ) : null}
        </div>
      </header>

      <MobileStepper />

      <div className={styles.layout}>
        {visible('catalog') ? (
          <aside className={`${styles.sidebar} no-print`}>
            <Card title="Каталог">
              <ProductCatalog />
            </Card>
          </aside>
        ) : null}

        {visible('room') ? (
          <main className={styles.main}>
            <Card title="Помещение и раскладка">
              <RoomWorkspace onStageReady={handleStageReady} />
            </Card>
          </main>
        ) : null}

        {visible('result') ? (
          <aside className={styles.results}>
            <Card title="Итоги">
              <CalculationSummary />
            </Card>
          </aside>
        ) : null}
      </div>

      <div className="print-only">
        <CalculationSummary />
      </div>
    </div>
  )
}
