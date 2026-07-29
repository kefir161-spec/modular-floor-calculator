import { Tooltip } from '@/shared/ui/Tooltip/Tooltip'
import { IconButton } from '@/shared/ui/IconButton/IconButton'
import {
  AddVertexIcon,
  GridSnapIcon,
  ObstacleIcon,
  OpeningIcon,
  OrthoSnapIcon,
  RemoveVertexIcon,
  SelectCursorIcon,
} from '@/shared/ui/icons'
import type { PolygonTool } from '@/shared/types'
import styles from './PolygonToolsBar.module.scss'

const TOOLS: { id: PolygonTool; label: string; icon: typeof SelectCursorIcon }[] = [
  { id: 'select', label: 'Выбор', icon: SelectCursorIcon },
  { id: 'add-vertex', label: 'Добавить вершину', icon: AddVertexIcon },
  { id: 'remove-vertex', label: 'Удалить вершину', icon: RemoveVertexIcon },
  { id: 'obstacle', label: 'Препятствие', icon: ObstacleIcon },
  { id: 'opening', label: 'Проём', icon: OpeningIcon },
]

type Props = {
  tool: PolygonTool
  onToolChange: (tool: PolygonTool) => void
  snapOrtho: boolean
  onSnapOrthoChange: (value: boolean) => void
  snapGridMm: number
  onSnapGridChange: (mm: number) => void
}

export function PolygonToolsBar({
  tool,
  onToolChange,
  snapOrtho,
  onSnapOrthoChange,
  snapGridMm,
  onSnapGridChange,
}: Props) {
  const gridOn = snapGridMm > 0

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Инструменты контура">
      {TOOLS.map(({ id, label, icon: Icon }) => (
        <Tooltip key={id} content={label}>
          <IconButton
            label={label}
            variant={tool === id ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={tool === id}
            onClick={() => onToolChange(id)}
          >
            <Icon />
          </IconButton>
        </Tooltip>
      ))}

      <span className={styles.sep} aria-hidden />

      <Tooltip content="Привязка к 90°">
        <IconButton
          label="Привязка к 90°"
          variant={snapOrtho ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={snapOrtho}
          onClick={() => onSnapOrthoChange(!snapOrtho)}
        >
          <OrthoSnapIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content={gridOn ? 'Сетка 50 мм включена' : 'Сетка 50 мм'}>
        <IconButton
          label="Привязка к сетке 50 мм"
          variant={gridOn ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={gridOn}
          onClick={() => onSnapGridChange(gridOn ? 0 : 50)}
        >
          <GridSnapIcon />
        </IconButton>
      </Tooltip>
    </div>
  )
}
