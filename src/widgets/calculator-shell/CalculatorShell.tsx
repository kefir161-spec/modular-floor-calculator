import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/shared/ui/Button/Button'
import { Drawer } from '@/shared/ui/Drawer/Drawer'
import { Dialog } from '@/shared/ui/Dialog/Dialog'
import { useToast } from '@/shared/ui/Toast'
import { ProductCatalog } from '@/widgets/product-catalog/ProductCatalog'
import { SelectedProductCard } from '@/widgets/product-catalog/SelectedProductCard'
import { RoomWorkspace, type StageExportApi } from '@/widgets/room-workspace/RoomWorkspace'
import { RoomParamsPanel } from '@/widgets/room-params/RoomParamsPanel'
import { StickySummary } from '@/widgets/calculation-summary/StickySummary'
import { CalculationSummary } from '@/widgets/calculation-summary/CalculationSummary'
import { ResultScreen } from '@/widgets/calculation-summary/ResultScreen'
import { MobileStepper } from '@/widgets/mobile-stepper/MobileStepper'
import { FirstRunTip } from '@/widgets/first-run-tip/FirstRunTip'
import { ProjectHeaderActions } from '@/features/save-project/ProjectHeaderActions'
import { ExportMenu } from '@/widgets/calculator-shell/ExportMenu'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { buildExportFilename } from '@/features/export-png/export-png'
import {
  captureStageDataUrlAtFit,
  exportStageToPngAtFit,
} from '@/features/export-png/export-stage-fit'
import { exportToPdf } from '@/features/export-pdf/export-pdf'
import styles from './CalculatorShell.module.scss'

export function CalculatorShell() {
  const mobileStep = useCalculatorStore((s) => s.ui.mobileStep)
  const fullscreen = useCalculatorStore((s) => s.ui.fullscreen)
  const calculation = useCalculatorStore((s) => s.calculation)
  const selectedVariant = useCalculatorStore((s) => s.selectedVariant)
  const room = useCalculatorStore((s) => s.room)
  const projectName = useCalculatorStore((s) => s.projectName)
  const toast = useToast()

  const [catalogOpen, setCatalogOpen] = useState(false)
  const [paramsOpen, setParamsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const stageApiRef = useRef<StageExportApi | null>(null)

  const handleStageReady = useCallback((api: StageExportApi) => {
    stageApiRef.current = api
  }, [])

  useEffect(() => {
    const narrowMq = window.matchMedia('(max-width: 1024px)')
    const mobileMq = window.matchMedia('(max-width: 768px)')
    const update = () => {
      setIsNarrow(narrowMq.matches)
      setIsMobile(mobileMq.matches)
    }
    update()
    narrowMq.addEventListener('change', update)
    mobileMq.addEventListener('change', update)
    return () => {
      narrowMq.removeEventListener('change', update)
      mobileMq.removeEventListener('change', update)
    }
  }, [])

  const handleExportPng = async () => {
    const api = stageApiRef.current
    if (!api?.stage) {
      toast.push('Схема не найдена для экспорта', 'error')
      return
    }
    try {
      await exportStageToPngAtFit(
        api.stage,
        api.getFitTransform(),
        buildExportFilename('plastfactor-layout'),
      )
      toast.push('PNG создан', 'success')
    } catch {
      toast.push('Экспорт PNG не удался', 'error')
    }
  }

  const handleExportPdf = async () => {
    if (!calculation || !selectedVariant) {
      toast.push('Нет данных для PDF', 'warning')
      return
    }
    const api = stageApiRef.current
    if (!api?.stage) {
      toast.push('Схема не найдена для экспорта', 'error')
      return
    }
    try {
      const canvasDataUrl = captureStageDataUrlAtFit(api.stage, api.getFitTransform())
      await exportToPdf({
        variant: selectedVariant,
        room,
        calculation,
        canvasDataUrl,
        projectName,
      })
      toast.push('PDF создан', 'success')
    } catch {
      toast.push('Экспорт PDF не удался', 'error')
    }
  }

  const handlePrint = () => {
    window.print()
    toast.push('Печать подготовлена', 'info')
  }

  const showDesktopSidebar = !fullscreen && !isNarrow
  const canvasActive = !isMobile || mobileStep === 1 || fullscreen
  const showMobileProduct = isMobile && mobileStep === 0 && !fullscreen
  const showMobileRoomSheet = isMobile && mobileStep === 1 && !fullscreen
  const showMobileResult = isMobile && mobileStep === 2 && !fullscreen
  const showTabletChrome = !fullscreen && isNarrow && !isMobile

  return (
    <div
      className={`${styles.shell} ${fullscreen ? styles.shellFullscreen : ''}`.trim()}
      data-mobile-step={mobileStep}
      data-mobile={isMobile ? 'true' : undefined}
    >
      <a className="skipLink no-print" href="#pf-workspace">
        К схеме укладки
      </a>
      {!fullscreen ? (
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <p className={styles.brand}>ПластФактор</p>
            <h1 className={styles.title}>Калькулятор покрытий</h1>
          </div>

          <div className={`${styles.headerActions} no-print`}>
            <ProjectHeaderActions />
            <ExportMenu
              onExportPng={handleExportPng}
              onExportPdf={handleExportPdf}
              onPrint={handlePrint}
            />
            <Button variant="ghost" onClick={() => setHelpOpen(true)}>
              Помощь
            </Button>
          </div>
        </header>
      ) : null}

      <div className={styles.layout}>
        {showDesktopSidebar ? (
          <aside className={`${styles.sidebar} no-print`}>
            <section className={styles.sidebarBlock}>
              <h2 className={styles.sidebarTitle}>Покрытие</h2>
              <SelectedProductCard
                variant={selectedVariant}
                onChangeClick={() => setCatalogOpen(true)}
              />
            </section>
            <section className={styles.sidebarBlock}>
              <h2 className={styles.sidebarTitle}>Помещение</h2>
              <RoomParamsPanel />
            </section>
          </aside>
        ) : null}

        <div className={styles.stack}>
          {/* Canvas всегда в DOM — шаги только переключают видимость */}
          <main
            className={`${styles.main} ${canvasActive ? styles.layerActive : styles.layerIdle}`}
            data-testid="canvas-host"
            id="pf-workspace"
            aria-hidden={!canvasActive}
          >
            <div className={styles.workspaceFrame}>
              <RoomWorkspace onStageReady={handleStageReady} />
              {!fullscreen && (!isMobile || mobileStep === 1) ? (
                <StickySummary
                  onExportPng={handleExportPng}
                  onExportPdf={handleExportPdf}
                  onPrint={handlePrint}
                />
              ) : null}
              {!fullscreen ? <FirstRunTip /> : null}
            </div>
          </main>

          {showMobileProduct ? (
            <aside className={`${styles.panelLayer} ${styles.layerActive} no-print`}>
              <section className={styles.sidebarBlock}>
                <h2 className={styles.sidebarTitle}>Покрытие</h2>
                <SelectedProductCard
                  variant={selectedVariant}
                  onChangeClick={() => setCatalogOpen(true)}
                />
              </section>
            </aside>
          ) : null}

          {showMobileResult ? (
            <aside className={`${styles.panelLayer} ${styles.layerActive} no-print`}>
              <div className={styles.mobileResult}>
                <ResultScreen
                  onExportPng={handleExportPng}
                  onExportPdf={handleExportPdf}
                  onPrint={handlePrint}
                  showBackToEdit
                />
              </div>
            </aside>
          ) : null}
        </div>
      </div>

      {showTabletChrome ? (
        <div className={`${styles.tabletBar} no-print`}>
          <Button variant="secondary" onClick={() => setCatalogOpen(true)}>
            Покрытие
          </Button>
          <Button variant="secondary" onClick={() => setParamsOpen(true)}>
            Параметры
          </Button>
        </div>
      ) : null}

      {showMobileRoomSheet ? (
        <div className={`${styles.mobileRoomBar} no-print`}>
          <Button variant="secondary" onClick={() => setParamsOpen(true)}>
            Размеры и форма
          </Button>
          <Button variant="ghost" onClick={() => setCatalogOpen(true)}>
            Покрытие
          </Button>
        </div>
      ) : null}

      {!fullscreen ? <MobileStepper /> : null}

      <Drawer
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        title="Выбор покрытия"
        side={isMobile ? 'bottom' : 'left'}
      >
        <ProductCatalog onSelected={() => setCatalogOpen(false)} />
      </Drawer>

      <Drawer
        open={paramsOpen}
        onClose={() => setParamsOpen(false)}
        title="Параметры помещения"
        side={isMobile ? 'bottom' : 'right'}
      >
        <div className={styles.paramsDrawer}>
          {!isMobile ? (
            <SelectedProductCard
              variant={selectedVariant}
              onChangeClick={() => {
                setParamsOpen(false)
                setCatalogOpen(true)
              }}
            />
          ) : null}
          <RoomParamsPanel />
        </div>
      </Drawer>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} title="Как пользоваться">
        <ol className={styles.helpList}>
          <li>Выберите покрытие и цвет.</li>
          <li>Укажите форму и размеры помещения или выберите пресет.</li>
          <li>При необходимости настройте схему кнопкой рядом с холстом.</li>
          <li>Смотрите итого к покупке и при необходимости экспортируйте PNG/PDF.</li>
        </ol>
      </Dialog>

      <div className="print-only">
        <CalculationSummary />
      </div>
    </div>
  )
}
