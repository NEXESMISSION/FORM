'use client'

import { useEffect, useState, Component, ReactNode } from 'react'
import UpdateNotification from '@/components/UpdateNotification'
import RouteLoader from '@/components/RouteLoader'
import PrefetchRoutes from '@/components/PrefetchRoutes'
import PullToRefresh from '@/components/PullToRefresh'

// Error boundary for layout extras to prevent useContext errors
class LayoutExtrasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn('[ClientOnlyLayoutExtras] Error caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

/**
 * Renders layout components that use usePathname/useSearchParams only after client mount.
 * Prevents "Cannot read properties of null (reading 'useContext')" during SSR or error overlay.
 */
export default function ClientOnlyLayoutExtras() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // Small delay to ensure React context is fully initialized
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])
  if (!mounted) return null
  return (
    <LayoutExtrasErrorBoundary>
      <PullToRefresh />
      <UpdateNotification />
      <RouteLoader />
      <PrefetchRoutes />
    </LayoutExtrasErrorBoundary>
  )
}
