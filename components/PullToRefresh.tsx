'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

const PULL_THRESHOLD = 72
const PULL_MAX = 120
const ACTIVATION_THRESHOLD = 56

export default function PullToRefresh() {
  const router = useRouter()
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const canPull = scrollTop <= 2

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!canPull) return
    setTouchStartY(e.touches[0].clientY)
  }, [canPull])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartY === null || !canPull) return
    const y = e.touches[0].clientY
    const delta = y - touchStartY
    if (delta > 0) {
      // Resist slightly so it feels natural
      const resisted = Math.min(delta * 0.5, PULL_MAX)
      setPullY(resisted)
    }
  }, [touchStartY, canPull])

  const handleTouchEnd = useCallback(() => {
    if (touchStartY === null) return
    setTouchStartY(null)
    if (pullY >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true)
      setPullY(0)
      router.refresh()
      setTimeout(() => setRefreshing(false), 900)
    } else {
      setPullY(0)
    }
  }, [touchStartY, pullY, refreshing, router])

  useEffect(() => {
    const onScroll = () => setScrollTop(typeof window !== 'undefined' ? window.scrollY ?? document.documentElement.scrollTop : 0)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const visible = pullY > 0 || refreshing
  const progress = Math.min(1, pullY / PULL_THRESHOLD)
  const ready = pullY >= PULL_THRESHOLD

  const height = visible ? (refreshing ? 56 : Math.max(56, pullY)) : 0
  if (height === 0) return null

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden"
      style={{
        height,
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.6) 70%, transparent 100%)',
        transition: refreshing ? 'height 0.25s ease' : pullY === 0 ? 'height 0.2s ease' : 'none',
      }}
    >
      <div
        className="absolute bottom-2 left-1/2 flex flex-col items-center gap-0.5 -translate-x-1/2"
        style={{
          opacity: 0.5 + progress * 0.5,
          transform: `translateX(-50%) scale(${0.92 + progress * 0.08})`,
        }}
      >
        <RefreshCw
          className={`w-5 h-5 ${refreshing ? 'animate-spin text-primary-600' : ready ? 'text-primary-600' : 'text-gray-400'}`}
          strokeWidth={2.2}
        />
        <span className="text-[11px] font-medium text-gray-500">
          {refreshing ? 'جاري التحديث...' : ready ? 'أفلت للتحديث' : 'اسحب للأسفل'}
        </span>
      </div>
    </div>
  )
}
