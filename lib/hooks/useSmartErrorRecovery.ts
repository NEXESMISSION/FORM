/**
 * Smart error recovery hook
 * Automatically retries failed operations with exponential backoff
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { retryAsync } from '@/lib/utils/asyncOperations'

export interface ErrorRecoveryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  onRetry?: (attempt: number) => void
  onSuccess?: () => void
  onFailure?: (error: Error) => void
}

export function useSmartErrorRecovery<T>(
  operation: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
): {
  execute: () => Promise<T | null>
  isRetrying: boolean
  retryCount: number
  lastError: Error | null
  reset: () => void
} {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
    onSuccess,
    onFailure,
  } = options

  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<Error | null>(null)
  const operationRef = useRef(operation)

  // Update operation ref
  useEffect(() => {
    operationRef.current = operation
  }, [operation])

  const execute = useCallback(async (): Promise<T | null> => {
    setIsRetrying(true)
    setLastError(null)
    setRetryCount(0)

    try {
      const result = await retryAsync(
        async () => {
          const currentAttempt = retryCount + 1
          setRetryCount(currentAttempt)
          
          if (onRetry && currentAttempt > 1) {
            onRetry(currentAttempt - 1)
          }

          return await operationRef.current()
        },
        {
          retries: maxRetries,
          initialDelay,
          maxDelay,
        }
      )

      setIsRetrying(false)
      if (onSuccess) {
        onSuccess()
      }
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setLastError(err)
      setIsRetrying(false)
      
      if (onFailure) {
        onFailure(err)
      }
      
      return null
    }
  }, [maxRetries, initialDelay, maxDelay, onRetry, onSuccess, onFailure, retryCount])

  const reset = useCallback(() => {
    setIsRetrying(false)
    setRetryCount(0)
    setLastError(null)
  }, [])

  return {
    execute,
    isRetrying,
    retryCount,
    lastError,
    reset,
  }
}
