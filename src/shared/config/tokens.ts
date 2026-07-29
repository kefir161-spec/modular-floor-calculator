/**
 * Единый источник дизайн-токенов.
 * CSS-переменные и KONVA_THEME выводятся из этого объекта.
 */
export const tokens = {
  color: {
    /** Фирменный зелёный plastfactor.com (.main-color) — заливки */
    brand: '#b5d200',
    brandHover: '#97b400',
    /** Тёмный зелёный для текста/ссылок на светлом фоне (AA) */
    brandText: '#4a5600',
    accent: '#b5d200',
    pageBackground: '#eef1f5',
    canvasBackground: '#f7f8fa',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    surfaceMuted: '#f3f5f8',
    border: '#d0d7e2',
    borderStrong: '#98a2b3',
    textPrimary: '#101828',
    textSecondary: '#344054',
    /** ≥ 4.5:1 на page/surface — WCAG AA для обычного текста */
    textMuted: '#475467',
    selected: '#b5d200',
    hover: '#eef3d6',
    pressed: '#e2eab8',
    focus: '#97b400',
    success: '#027a48',
    warning: '#b54708',
    error: '#d92d20',
    disabled: '#98a2b3',
    moduleFull: '#3d7eab',
    moduleCut: '#e07a2f',
    cutHatch: 'rgba(224, 122, 47, 0.4)',
    contour: '#1d4f7a',
    contourFill: 'rgba(29, 79, 122, 0.05)',
    working: '#027a48',
    grid: 'rgba(16, 24, 40, 0.1)',
    placeholder: '#667085',
    /** Текст на фирменном зелёном (как font-maincolor-dark на сайте) */
    onBrand: '#101828',
  },
  typography: {
    fontFamily:
      '"Segoe UI Variable Text", "Segoe UI", "Helvetica Neue", ui-sans-serif, sans-serif',
    pageTitle: { size: '1.35rem', weight: '700', lineHeight: '1.25' },
    sectionTitle: { size: '0.8rem', weight: '700', lineHeight: '1.3' },
    fieldLabel: { size: '0.8rem', weight: '600', lineHeight: '1.35' },
    helper: { size: '0.75rem', weight: '500', lineHeight: '1.4' },
    resultLabel: { size: '0.85rem', weight: '500', lineHeight: '1.35' },
    resultValue: { size: '1.5rem', weight: '700', lineHeight: '1.2' },
    warning: { size: '0.85rem', weight: '600', lineHeight: '1.4' },
    nav: { size: '0.7rem', weight: '600', lineHeight: '1.2' },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
  },
  shadow: {
    /** Карточки по умолчанию без тени — только border */
    card: 'none',
    floating: '0 4px 18px rgb(16 24 40 / 10%)',
    drawer: '0 8px 28px rgb(16 24 40 / 14%)',
  },
  zIndex: {
    base: '1',
    sticky: '10',
    floating: '20',
    drawer: '40',
    modal: '50',
    toast: '60',
    tooltip: '70',
  },
  motion: {
    durationFast: '120ms',
    durationNormal: '200ms',
    durationSlow: '280ms',
    durationPanel: '280ms',
    easingStandard: 'cubic-bezier(0.2, 0, 0, 1)',
    easingEmphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    easingExit: 'cubic-bezier(0.3, 0, 1, 1)',
  },
  control: {
    height: '44px',
    heightCompact: '36px',
    iconSize: '20px',
    iconSizeSm: '16px',
  },
  panel: {
    leftWidth: '300px',
    leftWidthMin: '280px',
    leftWidthMax: '340px',
  },
  focusRing: {
    width: '2px',
    offset: '2px',
    color: '#97b400',
  },
  touch: {
    min: '44px',
  },
} as const

export type DesignTokens = typeof tokens

/** CSS custom properties for :root */
export function tokensToCssVariables(source: DesignTokens = tokens): Record<string, string> {
  return {
    '--pf-color-primary': source.color.brand,
    '--pf-color-primary-hover': source.color.brandHover,
    '--pf-color-primary-text': source.color.brandText,
    '--pf-color-accent': source.color.accent,
    '--pf-color-on-brand': source.color.onBrand,
    '--pf-color-background': source.color.pageBackground,
    '--pf-color-canvas': source.color.canvasBackground,
    '--pf-color-surface': source.color.surface,
    '--pf-color-surface-elevated': source.color.surfaceElevated,
    '--pf-color-surface-muted': source.color.surfaceMuted,
    '--pf-color-text': source.color.textPrimary,
    '--pf-color-text-secondary': source.color.textSecondary,
    '--pf-color-muted': source.color.textMuted,
    '--pf-color-border': source.color.border,
    '--pf-color-border-strong': source.color.borderStrong,
    '--pf-color-selected': source.color.selected,
    '--pf-color-hover': source.color.hover,
    '--pf-color-pressed': source.color.pressed,
    '--pf-color-focus': source.color.focus,
    '--pf-color-success': source.color.success,
    '--pf-color-warning': source.color.warning,
    '--pf-color-error': source.color.error,
    '--pf-color-disabled': source.color.disabled,
    '--pf-color-module-full': source.color.moduleFull,
    '--pf-color-module-cut': source.color.moduleCut,
    '--pf-color-contour': source.color.contour,
    '--pf-color-working': source.color.working,
    '--pf-radius-sm': source.radius.sm,
    '--pf-radius-md': source.radius.md,
    '--pf-radius-lg': source.radius.lg,
    '--pf-shadow-card': source.shadow.card,
    '--pf-shadow-floating': source.shadow.floating,
    '--pf-shadow-drawer': source.shadow.drawer,
    '--pf-font-family': source.typography.fontFamily,
    '--pf-type-page-title-size': source.typography.pageTitle.size,
    '--pf-type-page-title-weight': source.typography.pageTitle.weight,
    '--pf-type-section-size': source.typography.sectionTitle.size,
    '--pf-type-section-weight': source.typography.sectionTitle.weight,
    '--pf-type-label-size': source.typography.fieldLabel.size,
    '--pf-type-helper-size': source.typography.helper.size,
    '--pf-type-result-value-size': source.typography.resultValue.size,
    '--pf-type-result-value-weight': source.typography.resultValue.weight,
    '--pf-type-warning-size': source.typography.warning.size,
    '--pf-type-nav-size': source.typography.nav.size,
    '--pf-touch-min': source.touch.min,
    '--pf-spacing-xs': source.spacing.xs,
    '--pf-spacing-sm': source.spacing.sm,
    '--pf-spacing-md': source.spacing.md,
    '--pf-spacing-lg': source.spacing.lg,
    '--pf-spacing-xl': source.spacing.xl,
    '--pf-z-base': source.zIndex.base,
    '--pf-z-sticky': source.zIndex.sticky,
    '--pf-z-floating': source.zIndex.floating,
    '--pf-z-drawer': source.zIndex.drawer,
    '--pf-z-modal': source.zIndex.modal,
    '--pf-z-toast': source.zIndex.toast,
    '--pf-z-tooltip': source.zIndex.tooltip,
    '--pf-motion-fast': source.motion.durationFast,
    '--pf-motion-normal': source.motion.durationNormal,
    '--pf-motion-slow': source.motion.durationSlow,
    '--pf-motion-panel': source.motion.durationPanel,
    '--pf-ease-standard': source.motion.easingStandard,
    '--pf-ease-emphasized': source.motion.easingEmphasized,
    '--pf-ease-exit': source.motion.easingExit,
    '--pf-control-height': source.control.height,
    '--pf-control-height-compact': source.control.heightCompact,
    '--pf-icon-size': source.control.iconSize,
    '--pf-icon-size-sm': source.control.iconSizeSm,
    '--pf-panel-left-width': source.panel.leftWidth,
    '--pf-focus-ring-width': source.focusRing.width,
    '--pf-focus-ring-offset': source.focusRing.offset,
    '--pf-focus-ring-color': source.focusRing.color,
  }
}

export function applyTokensToDocument(target: HTMLElement = document.documentElement): void {
  const vars = tokensToCssVariables()
  for (const [key, value] of Object.entries(vars)) {
    target.style.setProperty(key, value)
  }
}

/** Цвета для Konva — из тех же токенов */
export const KONVA_THEME = {
  contour: tokens.color.contour,
  contourFill: tokens.color.contourFill,
  working: tokens.color.working,
  moduleFull: tokens.color.moduleFull,
  moduleCut: tokens.color.moduleCut,
  moduleStroke: tokens.color.surface,
  grid: tokens.color.grid,
  text: tokens.color.textPrimary,
  placeholder: tokens.color.placeholder,
  cutHatch: tokens.color.cutHatch,
  canvasBackground: tokens.color.canvasBackground,
} as const
