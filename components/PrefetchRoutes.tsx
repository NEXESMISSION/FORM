'use client'

import { useEffect, Component, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const CRITICAL_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/dashboard',
  '/projects',
]

// Error boundary for PrefetchRoutes
class PrefetchRoutesErrorBoundary extends Component<
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
    console.warn('[PrefetchRoutes] Error caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

function PrefetchRoutesInner() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Prefetch critical routes so navigation is instant
    const t = setTimeout(() => {
      CRITICAL_ROUTES.forEach((href) => {
        if (href !== pathname) router.prefetch(href)
      })
    }, 100)
    return () => clearTimeout(t)
  }, [pathname, router])

  return null
}

export default function PrefetchRoutes() {
  return (
    <PrefetchRoutesErrorBoundary>
      <PrefetchRoutesInner />
    </PrefetchRoutesErrorBoundary>
  )
}
