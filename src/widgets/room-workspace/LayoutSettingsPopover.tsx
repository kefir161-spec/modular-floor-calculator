import { useRef, useState } from 'react'
import { useCalculatorStore } from '@/app/store/calculator-store'
import { Popover } from '@/shared/ui/Popover/Popover'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Switch } from '@/shared/ui/Switch/Switch'
import { Button } from '@/shared/ui/Button/Button'
import { SettingsIcon } from '@/shared/ui/icons'
import { IconButton } from '@/shared/ui/IconButton/IconButton'
import { Tooltip } from '@/shared/ui/Tooltip/Tooltip'
import styles from './LayoutSettingsPopover.module.scss'

export function LayoutSettingsPopover() {
  const [open, setOpen] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  const layout = useCalculatorStore((s) => s.layout)
  const display = useCalculatorStore((s) => s.display)
  const wastePercent = useCalculatorStore((s) => s.wastePercent)
  const setLayout = useCalculatorStore((s) => s.setLayout)
  const setDisplay = useCalculatorStore((s) => s.setDisplay)
  const setWastePercent = useCalculatorStore((s) => s.setWastePercent)
  const resetLayout = useCalculatorStore((s) => s.resetLayout)

  return (
    <>
      <Tooltip content="Настройки схемы">
        <IconButton
          ref={anchorRef}
          label="Настройки схемы"
          size="sm"
          variant="secondary"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        title="Настройки схемы"
      >
        <div className={styles.body}>
          <p className={styles.label}>Направление плитки</p>
          <SegmentedControl
            ariaLabel="Направление плитки"
            value={String(layout.rotation) as '0' | '90'}
            onChange={(v) => setLayout({ rotation: Number(v) as 0 | 90 })}
            options={[
              { value: '0', label: '0°' },
              { value: '90', label: '90°' },
            ]}
          />

          <p className={styles.label}>Начало раскладки</p>
          <SegmentedControl
            ariaLabel="Начало раскладки"
            value={layout.startPoint}
            onChange={(v) => setLayout({ startPoint: v })}
            options={[
              { value: 'corner', label: 'От края' },
              { value: 'center', label: 'От центра' },
            ]}
          />

          <label className={styles.waste}>
            <span>Запас, %</span>
            <input
              type="number"
              min={0}
              max={50}
              value={wastePercent}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (!Number.isFinite(v) || v < 0) return
                setWastePercent(Math.min(50, v))
              }}
            />
          </label>

          <Switch
            label="Показывать размеры"
            checked={display.showDimensions}
            onChange={(checked) => setDisplay({ showDimensions: checked })}
          />
          <Switch
            label="Показывать подрезки"
            checked={display.showCutVisualization}
            onChange={(checked) => setDisplay({ showCutVisualization: checked })}
          />

          <button
            type="button"
            className={styles.advancedToggle}
            aria-expanded={advanced}
            onClick={() => setAdvanced((v) => !v)}
          >
            Точные настройки
          </button>

          {advanced ? (
            <div className={styles.advanced}>
              <label className={styles.waste}>
                <span>Смещение X, мм</span>
                <input
                  type="number"
                  value={layout.offsetX}
                  onChange={(e) => setLayout({ offsetX: Number(e.target.value) || 0 })}
                />
              </label>
              <label className={styles.waste}>
                <span>Смещение Y, мм</span>
                <input
                  type="number"
                  value={layout.offsetY}
                  onChange={(e) => setLayout({ offsetY: Number(e.target.value) || 0 })}
                />
              </label>
            </div>
          ) : null}

          <Button
            variant="ghost"
            onClick={() => {
              resetLayout()
              setOpen(false)
            }}
          >
            Сбросить положение плитки
          </Button>
        </div>
      </Popover>
    </>
  )
}
