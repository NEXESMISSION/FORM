'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { RefreshCw, X } from 'lucide-react'

// Only consider it a "real" deployment build ID (e.g. Vercel git SHA), not dev/timestamp
function isRealBuildId(id: string | null): boolean {
  if (!id || typeof id !== 'string') return false
  if (/^[a-f0-9]{7,40}$/i.test(id)) return true
  if (/^(build|session)-/i.test(id)) return false
  return true
}

// Don't show update banner on pages where user is filling a form (avoids prompting refresh and losing data)
function isFormOrSensitivePage(pathname: string | null, formParam: string | null): boolean {
  if (!pathname) return false
  if (pathname.startsWith('/auth/register') || pathname.startsWith('/auth/login')) return true
  if (pathname.startsWith('/dashboard/applicant') && formParam === '1') return true
  return false
}

export default function UpdateNotification() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const formParam = searchParams?.get('form') ?? null
  const [show, setShow] = useState(false)
  const [currentBuildId, setCurrentBuildId] = useState<string | null>(null)

  // Hide banner when user is on a form/sensitive page so we never prompt refresh and lose their input
  const hideOnThisPage = isFormOrSensitivePage(pathname, formParam)

  useEffect(() => {
    if (hideOnThisPage) return
    // Skip update check in development to avoid any refresh loops
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') return
    const checkForUpdate = async () => {
      try {
        const response = await fetch('/api/build-id', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }).catch(() => null)

        let serverBuildId: string | null = null
        if (response?.ok) {
          const data = await response.json()
          serverBuildId = data.buildId || data.version || null
        }
        if (!serverBuildId && typeof window !== 'undefined') {
          serverBuildId = (window as any).__NEXT_DATA__?.buildId || null
        }

        if (!serverBuildId) return

        const storedBuildId = localStorage.getItem('app_build_id')

        if (!storedBuildId) {
          localStorage.setItem('app_build_id', serverBuildId)
          return
        }

        if (!isRealBuildId(serverBuildId)) return
        if (storedBuildId === serverBuildId) return

        setCurrentBuildId(serverBuildId)
        setShow(true)
      } catch (_) {}
    }

    const timer = setTimeout(checkForUpdate, 5000)
    const interval = setInterval(checkForUpdate, 15 * 60 * 1000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [hideOnThisPage])

  const handleRefresh = () => {
    if (currentBuildId) {
      // Update stored build ID before reload
      localStorage.setItem('app_build_id', currentBuildId)
    }
    // Hard reload to get new version
    window.location.reload()
  }

  const handleDismiss = () => {
    if (currentBuildId) {
      // Update stored build ID to dismiss notification
      localStorage.setItem('app_build_id', currentBuildId)
    }
    setShow(false)
  }

  if (hideOnThisPage || !show) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-primary-800 text-white shadow-lg">
      <div className="max-w-[28rem] mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <RefreshCw className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">تحديث جديد متاح</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-white text-primary-900 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
          >
            تحديث
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-primary-700 rounded-lg transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
