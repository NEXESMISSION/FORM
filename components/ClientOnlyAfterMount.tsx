'use client'

import { useEffect, useState, type ReactNode } from 'react'

/**
 * Renders children only after client mount + one tick.
 * Ensures Next.js router/navigation context (usePathname, useSearchParams) is available.
 * Prevents "Cannot read properties of null (reading 'useContext')" on root layout.
 */
export default function ClientOnlyAfterMount({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])
  if (!mounted) return null
  return <>{children}</>
}
