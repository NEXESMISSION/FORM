/**
 * Optimistic UI updates hook
 * Updates UI immediately, then syncs with server
 */

import { useState, useCallback, useRef } from 'react'

export interface OptimisticUpdateOptions<T> {
  onUpdate: (data: T) => Promise<T>
  onError?: (error: Error, rollbackData: T) => void
  onSuccess?: (data: T) => void
}

export function useOptimisticUpdate<T>(
  initialData: T,
  options: OptimisticUpdateOptions<T>
): {
  data: T
  update: (newData: T) => Promise<void>
  isUpdating: boolean
  rollback: () => void
} {
  const { onUpdate, onError, onSuccess } = options
  const [data, setData] = useState<T>(initialData)
  const [isUpdating, setIsUpdating] = useState(false)
  const rollbackDataRef = useRef<T>(initialData)

  const update = useCallback(
    async (newData: T) => {
      // Save current data for rollback
      rollbackDataRef.current = data

      // Optimistically update UI
      setData(newData)
      setIsUpdating(true)

      try {
        // Update server
        const result = await onUpdate(newData)
        
        // Update with server response (in case server modified data)
        setData(result)
        
        if (onSuccess) {
          onSuccess(result)
        }
      } catch (error) {
        // Rollback on error
        setData(rollbackDataRef.current)
        
        const err = error instanceof Error ? error : new Error(String(error))
        if (onError) {
          onError(err, rollbackDataRef.current)
        } else {
          throw err
        }
      } finally {
        setIsUpdating(false)
      }
    },
    [data, onUpdate, onError, onSuccess]
  )

  const rollback = useCallback(() => {
    setData(rollbackDataRef.current)
    setIsUpdating(false)
  }, [])

  return {
    data,
    update,
    isUpdating,
    rollback,
  }
}
