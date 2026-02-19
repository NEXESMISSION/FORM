'use client'

import { useEffect, useState, Component, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

// Error boundary for RouteLoader
class RouteLoaderErrorBoundary extends Component<
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
    console.warn('[RouteLoader] Error caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return null
    }
    return this.props.children
  }
}

function RouteLoaderInner() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    setShow(false)
    // Only show slim bar if route change takes more than 200ms (fast navigations stay clean)
    const timer = setTimeout(() => setShow(true), 200)
    return () => {
      clearTimeout(timer)
      setShow(false)
    }
  }, [pathname, mounted])

  if (!show) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[99] h-0.5 bg-primary-100 overflow-hidden pointer-events-none" aria-hidden>
      <div className="h-full w-1/3 bg-primary-600 animate-pulse rounded-r" />
    </div>
  )
}

export default function RouteLoader() {
  return (
    <RouteLoaderErrorBoundary>
      <RouteLoaderInner />
    </RouteLoaderErrorBoundary>
  )
}
