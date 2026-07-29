import { useCallback, useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import {
  DEFAULT_USER_VIEW,
  VIEW_ZOOM_STEP,
  clampZoom,
  composeStageTransform,
  panUserView,
  zoomUserViewAtPoint,
  type UserView,
  type ViewTransform,
} from '@/shared/lib/canvas-view'
import type { CanvasInteractionMode } from '@/shared/types'

type Options = {
  fit: ViewTransform
  mode: CanvasInteractionMode
  stageRef: React.RefObject<Konva.Stage | null>
  enabled?: boolean
  /** Смена ключа переподключает обработчики (после монтирования/ресайза Stage) */
  bindKey?: string
}

export function useCanvasViewController({
  fit,
  mode,
  stageRef,
  enabled = true,
  bindKey = '',
}: Options) {
  const [userView, setUserView] = useState<UserView>(DEFAULT_USER_VIEW)
  const spaceDownRef = useRef(false)
  const panningRef = useRef(false)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)
  const fitRef = useRef(fit)
  const userViewRef = useRef(userView)

  fitRef.current = fit
  userViewRef.current = userView

  const stageTransform = composeStageTransform(fit, userView)

  const resetView = useCallback(() => {
    setUserView(DEFAULT_USER_VIEW)
  }, [])

  const zoomBy = useCallback((factor: number, anchor?: { x: number; y: number }) => {
    const currentFit = fitRef.current
    const currentUser = userViewRef.current
    const point =
      anchor ??
      ({
        x: (stageRef.current?.width() ?? 0) / 2,
        y: (stageRef.current?.height() ?? 0) / 2,
      } as const)
    setUserView(
      zoomUserViewAtPoint(currentFit, currentUser, point, currentUser.zoom * factor),
    )
  }, [stageRef])

  const zoomIn = useCallback(() => zoomBy(VIEW_ZOOM_STEP), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(1 / VIEW_ZOOM_STEP), [zoomBy])

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        spaceDownRef.current = true
      }
      if ((e.key === '+' || e.key === '=') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        zoomIn()
      }
      if ((e.key === '-' || e.key === '_') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        zoomOut()
      }
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        resetView()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDownRef.current = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [enabled, zoomIn, zoomOut, resetView])

  const attachStageHandlers = useCallback(
    (stage: Konva.Stage) => {
      const container = stage.container()

      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        const rect = container.getBoundingClientRect()
        const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        const factor = e.deltaY > 0 ? 1 / VIEW_ZOOM_STEP : VIEW_ZOOM_STEP
        zoomBy(factor, point)
      }

      const pointerPos = (e: PointerEvent | MouseEvent) => {
        const rect = container.getBoundingClientRect()
        return { x: e.clientX - rect.left, y: e.clientY - rect.top }
      }

      const shouldPan = (e: PointerEvent | MouseEvent) =>
        mode === 'pan' || spaceDownRef.current || e.button === 1

      const onPointerDown = (e: PointerEvent) => {
        if (!shouldPan(e) && e.pointerType !== 'touch') return
        if (e.pointerType === 'touch') return // pinch handled separately
        if (e.button !== 0 && e.button !== 1) return
        panningRef.current = true
        lastPointerRef.current = pointerPos(e)
        container.setPointerCapture(e.pointerId)
        container.style.cursor = 'grabbing'
      }

      const onPointerMove = (e: PointerEvent) => {
        if (!panningRef.current || !lastPointerRef.current) return
        const pos = pointerPos(e)
        const dx = pos.x - lastPointerRef.current.x
        const dy = pos.y - lastPointerRef.current.y
        lastPointerRef.current = pos
        setUserView((prev) => panUserView(prev, dx, dy))
      }

      const onPointerUp = (e: PointerEvent) => {
        if (!panningRef.current) return
        panningRef.current = false
        lastPointerRef.current = null
        container.releasePointerCapture(e.pointerId)
        container.style.cursor = mode === 'pan' || spaceDownRef.current ? 'grab' : ''
      }

      // Touch pan (one finger) + pinch (two fingers)
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault()
          const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          )
          pinchRef.current = { distance: d, zoom: userViewRef.current.zoom }
          panningRef.current = false
          return
        }
        if (e.touches.length === 1 && (mode === 'pan' || spaceDownRef.current)) {
          const t = e.touches[0]
          const rect = container.getBoundingClientRect()
          panningRef.current = true
          lastPointerRef.current = { x: t.clientX - rect.left, y: t.clientY - rect.top }
        }
      }

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && pinchRef.current) {
          e.preventDefault()
          const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          )
          const rect = container.getBoundingClientRect()
          const mid = {
            x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
            y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
          }
          const nextZoom = clampZoom(
            pinchRef.current.zoom * (d / Math.max(1, pinchRef.current.distance)),
          )
          setUserView(zoomUserViewAtPoint(fitRef.current, userViewRef.current, mid, nextZoom))
          return
        }
        if (panningRef.current && e.touches.length === 1 && lastPointerRef.current) {
          e.preventDefault()
          const t = e.touches[0]
          const rect = container.getBoundingClientRect()
          const pos = { x: t.clientX - rect.left, y: t.clientY - rect.top }
          const dx = pos.x - lastPointerRef.current.x
          const dy = pos.y - lastPointerRef.current.y
          lastPointerRef.current = pos
          setUserView((prev) => panUserView(prev, dx, dy))
        }
      }

      const onTouchEnd = () => {
        if (pinchRef.current) pinchRef.current = null
        panningRef.current = false
        lastPointerRef.current = null
      }

      container.addEventListener('wheel', onWheel, { passive: false })
      container.addEventListener('pointerdown', onPointerDown)
      container.addEventListener('pointermove', onPointerMove)
      container.addEventListener('pointerup', onPointerUp)
      container.addEventListener('pointercancel', onPointerUp)
      container.addEventListener('touchstart', onTouchStart, { passive: false })
      container.addEventListener('touchmove', onTouchMove, { passive: false })
      container.addEventListener('touchend', onTouchEnd)
      container.addEventListener('touchcancel', onTouchEnd)

      container.style.cursor = mode === 'pan' ? 'grab' : ''

      return () => {
        container.removeEventListener('wheel', onWheel)
        container.removeEventListener('pointerdown', onPointerDown)
        container.removeEventListener('pointermove', onPointerMove)
        container.removeEventListener('pointerup', onPointerUp)
        container.removeEventListener('pointercancel', onPointerUp)
        container.removeEventListener('touchstart', onTouchStart)
        container.removeEventListener('touchmove', onTouchMove)
        container.removeEventListener('touchend', onTouchEnd)
        container.removeEventListener('touchcancel', onTouchEnd)
        container.style.cursor = ''
      }
    },
    [mode, zoomBy],
  )

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !enabled) return
    return attachStageHandlers(stage)
  }, [stageRef, attachStageHandlers, enabled, bindKey])

  return {
    userView,
    stageTransform,
    resetView,
    zoomIn,
    zoomOut,
    setUserView,
  }
}
