import { Tooltip } from '@/shared/ui/Tooltip/Tooltip'
import { IconButton } from '@/shared/ui/IconButton/IconButton'
import {
  EditIcon,
  FitIcon,
  FullscreenIcon,
  MoveIcon,
  RedoIcon,
  UndoIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@/shared/ui/icons'
import type { CanvasInteractionMode } from '@/shared/types'
import styles from './CanvasToolbar.module.scss'

type Props = {
  mode: CanvasInteractionMode
  onModeChange: (mode: CanvasInteractionMode) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onToggleFullscreen: () => void
  fullscreen: boolean
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function CanvasToolbar({
  mode,
  onModeChange,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleFullscreen,
  fullscreen,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: Props) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Управление схемой">
      <Tooltip content="Редактировать">
        <IconButton
          label="Редактировать"
          variant={mode === 'edit' ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={mode === 'edit'}
          onClick={() => onModeChange('edit')}
        >
          <EditIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Перемещать (пробел)">
        <IconButton
          label="Перемещать схему"
          variant={mode === 'pan' ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={mode === 'pan'}
          onClick={() => onModeChange('pan')}
        >
          <MoveIcon />
        </IconButton>
      </Tooltip>

      <span className={styles.sep} aria-hidden />

      <Tooltip content="Уменьшить">
        <IconButton label="Уменьшить" size="sm" onClick={onZoomOut}>
          <ZoomOutIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Увеличить">
        <IconButton label="Увеличить" size="sm" onClick={onZoomIn}>
          <ZoomInIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Вписать">
        <IconButton label="Вписать в экран" size="sm" onClick={onFit}>
          <FitIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content={fullscreen ? 'Выйти из полного экрана' : 'На весь экран'}>
        <IconButton
          label={fullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
          size="sm"
          aria-pressed={fullscreen}
          onClick={onToggleFullscreen}
        >
          <FullscreenIcon />
        </IconButton>
      </Tooltip>

      <span className={styles.sep} aria-hidden />

      <Tooltip content="Отменить">
        <IconButton label="Отменить" size="sm" disabled={!canUndo} onClick={onUndo}>
          <UndoIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Вернуть">
        <IconButton label="Вернуть" size="sm" disabled={!canRedo} onClick={onRedo}>
          <RedoIcon />
        </IconButton>
      </Tooltip>
    </div>
  )
}
