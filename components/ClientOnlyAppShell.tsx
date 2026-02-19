'use client'

import { useEffect, useState } from 'react'

/**
 * Renders children only after client mount so Next.js router context (PathnameContext)
 * is available. Prevents "Cannot read properties of null (reading 'useContext')" in
 * ErrorBoundary/usePathname when any page errors during SSR or early hydration.
 */
export default function ClientOnlyAppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface" aria-busy="true">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    )
  }
  return <>{children}</>
}
