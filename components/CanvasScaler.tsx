"use client"
import { useEffect, useRef } from 'react'
import { useUI } from '@/store/ui'

type Props = {
  children: React.ReactNode
  /** min uniform scale when chat is open (desktop/tablet) */
  minScale?: number
  /** right-side gutter between scaled canvas and chat panel */
  gutterPx?: number
  /** breakpoint for mobile: below this, no scaling */
  desktopMinWidth?: number
  /** transition duration in ms */
  durationMs?: number
}

/**
 * Scales the main app canvas uniformly when the chat panel is visible on desktop/tablet,
 * so the full site remains 100% visible with a small gutter and no horizontal scroll.
 * Keeps transform-origin at top-left and animates scale changes.
 */
export default function CanvasScaler({
  children,
  minScale = 0.88,
  gutterPx = 16,
  desktopMinWidth = 768,
  durationMs = 180,
}: Props) {
  const { chatOpen } = useUI()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let raf = 0
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

    const measureChatWidth = () => {
      const chatEl = document.getElementById('gh-chat-panel') as HTMLElement | null
      if (!chatEl) return 0
      const styles = getComputedStyle(chatEl)
      // If not displayed, treat as closed
      if (styles.display === 'none' || styles.visibility === 'hidden') return 0
      const w = chatEl.getBoundingClientRect().width
      return w
    }

    const applyScale = () => {
  const vw = window.innerWidth
  const isDesktop = vw >= desktopMinWidth
      // Disable scaling on mobile or when chat is closed
      if (!isDesktop || !chatOpen) {
        el.style.transform = 'scale(1)'
        el.style.transformOrigin = 'top left'
        el.style.transition = `transform ${durationMs}ms ease`
        el.style.width = ''
        document.documentElement.style.overflowX = ''
        document.body.style.overflowX = ''
        // expose variables for external fixed UI (e.g., sticky bar)
        document.documentElement.style.setProperty('--canvas-scale', '1')
        document.documentElement.style.removeProperty('--canvas-available-px')
        document.documentElement.style.removeProperty('--canvas-layout-width-px')
        return
      }
      const chatW = measureChatWidth()
  const available = Math.max(0, vw - chatW - gutterPx)
      // base content width assumed to be viewport width
      const ratio = available / vw
      const scale = clamp(ratio, minScale, 1)
  el.style.transform = `scale(${scale})`
      el.style.transformOrigin = 'top left'
      el.style.transition = `transform ${durationMs}ms ease`
      // Set layout width so that scaled visual width equals available space
      const layoutWidth = available / scale
      el.style.width = `${layoutWidth}px`
  // expose variables for external fixed UI (e.g., sticky bar)
  document.documentElement.style.setProperty('--canvas-scale', String(scale))
  document.documentElement.style.setProperty('--canvas-available-px', `${available}px`)
  document.documentElement.style.setProperty('--canvas-layout-width-px', `${layoutWidth}px`)
  // Prevent horizontal scrollbars caused by scaled content's layout width
      document.documentElement.style.overflowX = 'hidden'
      document.body.style.overflowX = 'hidden'
    }

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(applyScale)
    }

  schedule()
  // Re-measure shortly after open/close to catch animated layouts
  const t1 = window.setTimeout(schedule, durationMs + 20)
    const onResize = () => schedule()
    const onOrientation = () => schedule()

    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('orientationchange', onOrientation)

    // Watch chat panel width changes directly
    const chatEl = document.getElementById('gh-chat-panel') as HTMLElement | null
    let ro: ResizeObserver | undefined
    if (chatEl && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => schedule())
      ro.observe(chatEl)
    }

    return () => {
  if (raf) cancelAnimationFrame(raf)
  window.clearTimeout(t1)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onOrientation)
  ro?.disconnect()
    }
  }, [chatOpen, desktopMinWidth, durationMs, gutterPx, minScale])

  return (
    <div ref={ref} style={{ transformOrigin: 'top left', willChange: 'transform' }}>
      {children}
    </div>
  )
}
