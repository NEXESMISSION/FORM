'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useChat } from '@/components/ChatContext'
import { MessageCircle } from 'lucide-react'
import { useLocalStorage } from '@/lib/hooks'

const FAB_SIZE = 48
const PADDING = 16

/**
 * Draggable floating action button. Position persisted in localStorage.
 * Matches app design (primary/gray).
 */
export default function ChatFab() {
  const { open, openChat } = useChat()
  const [position, setPosition] = useLocalStorage<{ left: number; top: number } | null>('chat-fab-position', null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ clientX: 0, clientY: 0, left: 0, top: 0, moved: false })
  const boxRef = useRef<HTMLDivElement>(null)

  const clamp = useCallback((left: number, top: number) => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 400
    const h = typeof window !== 'undefined' ? window.innerHeight : 600
    return {
      left: Math.max(0, Math.min(w - FAB_SIZE, left)),
      top: Math.max(0, Math.min(h - FAB_SIZE, top)),
    }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const el = boxRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setIsDragging(true)
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    }
    el.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragStart.current.clientX
      const dy = e.clientY - dragStart.current.clientY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragStart.current.moved = true
      const { left, top } = clamp(dragStart.current.left + dx, dragStart.current.top + dy)
      setPosition({ left, top })
    },
    [isDragging, clamp, setPosition]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) {
        if (!dragStart.current.moved) openChat()
        boxRef.current?.releasePointerCapture(e.pointerId)
        setIsDragging(false)
      }
    },
    [isDragging, openChat]
  )

  if (open) return null

  const style: React.CSSProperties = position
    ? {
        left: position.left,
        top: position.top,
        right: 'auto',
        bottom: 'auto',
        marginBottom: 0,
        marginRight: 0,
      }
    : {
        right: PADDING,
        bottom: `calc(6.5rem + env(safe-area-inset-bottom, 0px))`,
        marginBottom: 0,
        marginRight: 0,
      }

  return (
    <div
      ref={boxRef}
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={(e) => e.key === 'Enter' && openChat()}
      className="fixed z-[9999] flex h-14 w-14 min-[480px]:h-12 min-[480px]:w-12 cursor-grab active:cursor-grabbing items-center justify-center rounded-2xl border-2 border-primary-200 bg-primary-50 shadow-lg transition-shadow hover:shadow-xl hover:bg-primary-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
      style={style}
      aria-label="فتح الدردشة - اسحب لتحريك"
      title="دردشة دوموبات (اسحب لتحريك)"
    >
      <span className="flex h-full w-full items-center justify-center rounded-xl text-primary-700 pointer-events-none">
        <MessageCircle className="h-6 w-6" strokeWidth={2} />
      </span>
    </div>
  )
}
