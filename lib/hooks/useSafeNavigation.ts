'use client'

import { useEffect, useState } from 'react'
import { usePathname as useNextPathname, useSearchParams as useNextSearchParams } from 'next/navigation'

/**
 * Safe wrapper for usePathname that handles SSR and error boundary contexts gracefully.
 * Note: Hooks cannot be called conditionally, so this uses error boundary pattern.
 * For maximum reliability, prefer useClientSearchParams() which doesn't use Next.js hooks.
 */
export function useSafePathname(): string | null {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  try {
    return useNextPathname()
  } catch (e) {
    console.warn('[useSafePathname] Error accessing pathname:', e)
    // Fallback to window.location if available
    if (typeof window !== 'undefined') {
      return window.location.pathname
    }
    return null
  }
}

/**
 * Safe wrapper for useSearchParams that handles SSR and error boundary contexts gracefully.
 * Note: For maximum reliability, prefer useClientSearchParams() which doesn't use Next.js hooks.
 */
export function useSafeSearchParams(): URLSearchParams | null {
  const [mounted, setMounted] = useState(false)
  const [clientParams, setClientParams] = useState<URLSearchParams | null>(null)

  useEffect(() => {
    setMounted(true)
    const update = () => {
      if (typeof window === 'undefined') return
      const next = new URLSearchParams(window.location.search)
      setClientParams((prev) => (prev?.toString() === next.toString() ? prev : next))
    }
    update()
    window.addEventListener('popstate', update)
    const id = setInterval(update, 600)
    return () => {
      window.removeEventListener('popstate', update)
      clearInterval(id)
    }
  }, [])

  if (!mounted) return null

  try {
    return useNextSearchParams()
  } catch (e) {
    console.warn('[useSafeSearchParams] Error accessing searchParams:', e)
    return clientParams // Fallback to client-side params
  }
}

/**
 * Client-only URL params hook that doesn't use Next.js hooks.
 * More reliable for error boundary contexts.
 */
export function useClientSearchParams(): URLSearchParams | null {
  const [params, setParams] = useState<URLSearchParams | null>(null)
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => {
      const next = new URLSearchParams(window.location.search)
      setParams((prev) => (prev?.toString() === next.toString() ? prev : next))
    }
    update()
    window.addEventListener('popstate', update)
    const id = setInterval(update, 600)
    return () => {
      window.removeEventListener('popstate', update)
      clearInterval(id)
    }
  }, [])
  
  return params
}
