/**
 * Smart caching hook with TTL, invalidation, and prefetching
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  prefetch?: boolean
  prefetchThreshold?: number // Prefetch when this much time remains
}

class SmartCache {
  private cache = new Map<string, CacheEntry<any>>()
  private subscribers = new Map<string, Set<() => void>>()

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
    this.notifySubscribers(key)
  }

  invalidate(key: string): void {
    this.cache.delete(key)
    this.notifySubscribers(key)
  }

  clear(): void {
    this.cache.clear()
    this.notifySubscribers('*')
  }

  subscribe(key: string, callback: () => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    this.subscribers.get(key)!.add(callback)

    return () => {
      this.subscribers.get(key)?.delete(callback)
    }
  }

  private notifySubscribers(key: string): void {
    this.subscribers.get(key)?.forEach((cb) => cb())
    this.subscribers.get('*')?.forEach((cb) => cb())
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// Global cache instance
const globalCache = new SmartCache()

export function useSmartCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  invalidate: () => void
} {
  const { ttl = 5 * 60 * 1000, prefetch = false, prefetchThreshold = 60 * 1000 } = options
  const [data, setData] = useState<T | null>(() => globalCache.get<T>(key))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const fetcherRef = useRef(fetcher)

  // Update fetcher ref
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  // Fetch function
  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetcherRef.current()
      setData(result)
      globalCache.set(key, result, ttl)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [key, ttl])

  // Load from cache or fetch
  useEffect(() => {
    const cached = globalCache.get<T>(key)
    if (cached) {
      setData(cached)
      
      // Prefetch if enabled and cache is about to expire
      if (prefetch) {
        const entry = globalCache['cache'].get(key) as CacheEntry<T> | undefined
        if (entry) {
          const remaining = entry.ttl - (Date.now() - entry.timestamp)
          if (remaining < prefetchThreshold) {
            fetch()
          }
        }
      }
    } else {
      fetch()
    }
  }, [key, prefetch, prefetchThreshold, fetch])

  // Subscribe to cache updates
  useEffect(() => {
    const unsubscribe = globalCache.subscribe(key, () => {
      const cached = globalCache.get<T>(key)
      if (cached) {
        setData(cached)
      }
    })

    return unsubscribe
  }, [key])

  const invalidate = useCallback(() => {
    globalCache.invalidate(key)
    setData(null)
  }, [key])

  return {
    data,
    loading,
    error,
    refetch: fetch,
    invalidate,
  }
}

// Export cache instance for manual operations
export { globalCache }
