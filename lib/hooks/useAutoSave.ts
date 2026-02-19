/**
 * Smart auto-save hook for forms
 * Automatically saves form data to localStorage and optionally to server
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { debounce } from '@/lib/utils/performance'

export interface AutoSaveOptions {
  key: string
  delay?: number
  onSave?: (data: any) => Promise<void> | void
  enabled?: boolean
  compare?: (prev: any, next: any) => boolean
}

export function useAutoSave<T>(
  data: T,
  options: AutoSaveOptions
): {
  isSaving: boolean
  lastSaved: Date | null
  saveNow: () => Promise<void>
  clear: () => void
} {
  const {
    key,
    delay = 1000,
    onSave,
    enabled = true,
    compare = (prev, next) => JSON.stringify(prev) === JSON.stringify(next),
  } = options

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const previousDataRef = useRef<T>(data)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved data on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return

    try {
      const saved = localStorage.getItem(`autosave_${key}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        previousDataRef.current = parsed.data
        setLastSaved(new Date(parsed.timestamp))
      }
    } catch (error) {
      console.warn(`[useAutoSave] Failed to load saved data for key "${key}":`, error)
    }
  }, [key, enabled])

  // Save function
  const save = useCallback(
    async (dataToSave: T) => {
      if (!enabled) return

      setIsSaving(true)
      try {
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            `autosave_${key}`,
            JSON.stringify({
              data: dataToSave,
              timestamp: new Date().toISOString(),
            })
          )
        }

        // Save to server if callback provided
        if (onSave) {
          await onSave(dataToSave)
        }

        setLastSaved(new Date())
        previousDataRef.current = dataToSave
      } catch (error) {
        console.error(`[useAutoSave] Failed to save data for key "${key}":`, error)
      } finally {
        setIsSaving(false)
      }
    },
    [key, enabled, onSave]
  )

  // Debounced save
  const debouncedSave = useCallback(
    debounce((dataToSave: T) => {
      save(dataToSave)
    }, delay),
    [delay, save]
  )

  // Auto-save on data change
  useEffect(() => {
    if (!enabled) return

    // Skip if data hasn't changed
    if (compare(previousDataRef.current, data)) {
      return
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave(data)
    }, delay)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [data, enabled, delay, debouncedSave, compare])

  // Manual save
  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await save(data)
  }, [data, save])

  // Clear saved data
  const clear = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`autosave_${key}`)
    }
    previousDataRef.current = data
    setLastSaved(null)
  }, [key, data])

  return {
    isSaving,
    lastSaved,
    saveNow,
    clear,
  }
}
