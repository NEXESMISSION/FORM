/**
 * Smart search hook with debouncing, fuzzy matching, and ranking
 */

import { useState, useEffect, useMemo } from 'react'
import { useDebouncedValue } from './useDebouncedValue'

export interface SearchOptions<T> {
  keys?: (keyof T)[]
  threshold?: number
  caseSensitive?: boolean
  debounceMs?: number
}

/**
 * Simple fuzzy match score (0-1)
 */
function fuzzyMatch(query: string, text: string, caseSensitive: boolean = false): number {
  if (!query) return 1
  if (!text) return 0

  const q = caseSensitive ? query : query.toLowerCase()
  const t = caseSensitive ? text : text.toLowerCase()

  // Exact match
  if (t === q) return 1

  // Starts with
  if (t.startsWith(q)) return 0.9

  // Contains
  if (t.includes(q)) return 0.7

  // Fuzzy match (character order matters)
  let qIndex = 0
  for (let i = 0; i < t.length && qIndex < q.length; i++) {
    if (t[i] === q[qIndex]) {
      qIndex++
    }
  }
  if (qIndex === q.length) return 0.5

  return 0
}

/**
 * Search and rank items
 */
function searchAndRank<T>(
  items: T[],
  query: string,
  options: SearchOptions<T> = {}
): Array<{ item: T; score: number }> {
  const {
    keys = [],
    threshold = 0.1,
    caseSensitive = false,
  } = options

  if (!query.trim()) {
    return items.map((item) => ({ item, score: 1 }))
  }

  const results: Array<{ item: T; score: number }> = []

  for (const item of items) {
    let maxScore = 0

    // Search in specified keys or all string values
    const searchKeys = keys.length > 0 ? keys : Object.keys(item as object) as (keyof T)[]

    for (const key of searchKeys) {
      const value = item[key]
      if (value == null) continue

      const text = String(value)
      const score = fuzzyMatch(query, text, caseSensitive)
      maxScore = Math.max(maxScore, score)
    }

    if (maxScore >= threshold) {
      results.push({ item, score: maxScore })
    }
  }

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score)

  return results
}

export function useSmartSearch<T>(
  items: T[],
  options: SearchOptions<T> = {}
): {
  query: string
  setQuery: (query: string) => void
  results: T[]
  isSearching: boolean
  resultCount: number
} {
  const { debounceMs = 300 } = options
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, debounceMs)
  const [isSearching, setIsSearching] = useState(false)

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items.map((item) => ({ item, score: 1 }))
    }

    setIsSearching(true)
    const results = searchAndRank(items, debouncedQuery, options)
    setIsSearching(false)
    return results
  }, [items, debouncedQuery, options])

  useEffect(() => {
    setIsSearching(query !== debouncedQuery)
  }, [query, debouncedQuery])

  return {
    query,
    setQuery,
    results: searchResults.map((r) => r.item),
    isSearching,
    resultCount: searchResults.length,
  }
}
