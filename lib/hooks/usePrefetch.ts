/**
 * Smart prefetching hook for routes and data
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export interface PrefetchOptions {
  priority?: 'high' | 'low'
  prefetchOnHover?: boolean
  prefetchOnVisible?: boolean
}

export function usePrefetch(
  href: string,
  options: PrefetchOptions = {}
): {
  prefetch: () => void
  prefetchOnHover: (e: React.MouseEvent) => void
} {
  const router = useRouter()
  const { priority = 'low', prefetchOnHover = true } = options
  const prefetchedRef = useRef(false)

  const prefetch = () => {
    if (!prefetchedRef.current) {
      router.prefetch(href)
      prefetchedRef.current = true
    }
  }

  const prefetchOnHoverHandler = (e: React.MouseEvent) => {
    if (prefetchOnHover && !prefetchedRef.current) {
      prefetch()
    }
  }

  // Prefetch on mount if high priority
  useEffect(() => {
    if (priority === 'high') {
      prefetch()
    }
  }, [href, priority])

  return {
    prefetch,
    prefetchOnHover: prefetchOnHoverHandler,
  }
}

/**
 * Prefetch multiple routes
 */
export function usePrefetchRoutes(routes: string[], priority: 'high' | 'low' = 'low') {
  const router = useRouter()

  useEffect(() => {
    if (priority === 'high') {
      routes.forEach((route) => {
        router.prefetch(route)
      })
    }
  }, [routes, priority, router])
}
