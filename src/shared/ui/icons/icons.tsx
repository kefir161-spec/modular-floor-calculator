import type { ReactNode, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & {
  title?: string
}

function BaseIcon({ title, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export function ZoomInIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
    </BaseIcon>
  )
}

export function ZoomOutIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6" />
    </BaseIcon>
  )
}

export function FitIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
    </BaseIcon>
  )
}

export function FullscreenIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />
    </BaseIcon>
  )
}

export function MoveIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12h14M12 5l-3 3 3-3 3 3M12 19l-3-3 3 3 3-3" />
    </BaseIcon>
  )
}

export function EditIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </BaseIcon>
  )
}

export function UndoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 7v6h6M3 13a9 9 0 0115-6.7A9 9 0 013 13" />
    </BaseIcon>
  )
}

export function RedoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 7v6h-6M21 13a9 9 0 00-15-6.7A9 9 0 0021 13" />
    </BaseIcon>
  )
}

export function ExportIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3v12M8 7l4-4 4 4M5 15v4h14v-4" />
    </BaseIcon>
  )
}

export function SaveIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </BaseIcon>
  )
}

export function LoadIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3v12M8 11l4 4 4-4M5 19h14" />
    </BaseIcon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </BaseIcon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </BaseIcon>
  )
}

export function WarningIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </BaseIcon>
  )
}

export function SuccessIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </BaseIcon>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </BaseIcon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </BaseIcon>
  )
}

export function ProductIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7l8-4 8 4v10l-8 4-8-4V7z" />
      <path d="M12 11v10M4 7l8 4 8-4" />
    </BaseIcon>
  )
}

export function RoomIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M9 21v-8h6v8" />
    </BaseIcon>
  )
}

export function ErrorIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </BaseIcon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </BaseIcon>
  )
}

export function SelectCursorIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 4l7 16 2-6 6-2L4 4z" />
    </BaseIcon>
  )
}

export function AddVertexIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 19L12 5l7 14" />
      <path d="M12 12v5M9.5 14.5h5" />
    </BaseIcon>
  )
}

export function RemoveVertexIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 19L12 5l7 14" />
      <path d="M9.5 14.5h5" />
    </BaseIcon>
  )
}

export function ObstacleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="5" width="14" height="14" rx="1" />
    </BaseIcon>
  )
}

export function OpeningIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7v10M20 7v10M8 12h8" />
    </BaseIcon>
  )
}

export function OrthoSnapIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 12h16M12 4v16" />
    </BaseIcon>
  )
}

export function GridSnapIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 4h16v16H4zM4 12h16M12 4v16" />
    </BaseIcon>
  )
}

/** Иконки форм помещения — единая толщина обводки и оптический размер ~14×14. */
const SHAPE_STROKE = 1.75

export function ShapeRectangleIcon(props: IconProps) {
  return (
    <BaseIcon {...props} strokeWidth={SHAPE_STROKE}>
      <rect x="5" y="5" width="14" height="14" />
    </BaseIcon>
  )
}

export function ShapeLIcon(props: IconProps) {
  return (
    <BaseIcon {...props} strokeWidth={SHAPE_STROKE}>
      <path d="M5 5h9v9h5v5H5z" />
    </BaseIcon>
  )
}

export function ShapeUIcon(props: IconProps) {
  return (
    <BaseIcon {...props} strokeWidth={SHAPE_STROKE}>
      <path d="M5 5h4v9h6V5h4v14H5z" />
    </BaseIcon>
  )
}

export function ShapeNicheIcon(props: IconProps) {
  return (
    <BaseIcon {...props} strokeWidth={SHAPE_STROKE}>
      <path d="M5 5h14v14h-4v-5H9v5H5z" />
    </BaseIcon>
  )
}

export function ShapeCustomIcon(props: IconProps) {
  return (
    <BaseIcon {...props} strokeWidth={SHAPE_STROKE}>
      <path d="M12 5l6.5 4v6L12 19l-6.5-4V9L12 5z" />
    </BaseIcon>
  )
}
