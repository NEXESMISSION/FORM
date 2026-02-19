/**
 * Utilities for handling async operations with better error handling and state management
 */

export interface AsyncOperationOptions {
  onSuccess?: (result: any) => void
  onError?: (error: Error) => void
  showSuccessToast?: boolean
  showErrorToast?: boolean
  successMessage?: string
  errorMessage?: string
  throwOnError?: boolean
}

/**
 * Execute async operation with comprehensive error handling
 */
export async function executeAsync<T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
): Promise<{ data: T | null; error: Error | null; success: boolean }> {
  const {
    onSuccess,
    onError,
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'تم بنجاح',
    errorMessage = 'حدث خطأ',
    throwOnError = false,
  } = options

  try {
    const data = await operation()
    
    if (onSuccess) {
      onSuccess(data)
    }
    
    if (showSuccessToast && typeof window !== 'undefined') {
      const { default: toast } = await import('react-hot-toast')
      toast.success(successMessage)
    }
    
    return {
      data,
      error: null,
      success: true,
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    
    if (onError) {
      onError(err)
    }
    
    if (showErrorToast && typeof window !== 'undefined') {
      const { default: toast } = await import('react-hot-toast')
      toast.error(errorMessage)
    }
    
    if (throwOnError) {
      throw err
    }
    
    return {
      data: null,
      error: err,
      success: false,
    }
  }
}

/**
 * Batch multiple async operations
 */
export async function batchAsync<T>(
  operations: Array<() => Promise<T>>,
  options: {
    stopOnError?: boolean
    concurrency?: number
  } = {}
): Promise<Array<{ data: T | null; error: Error | null; success: boolean }>> {
  const { stopOnError = false, concurrency = 3 } = options
  const results: Array<{ data: T | null; error: Error | null; success: boolean }> = []
  
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (op) => {
        try {
          const data = await op()
          return { data, error: null, success: true }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          if (stopOnError) {
            throw err
          }
          return { data: null, error: err, success: false }
        }
      })
    )
    
    results.push(...batchResults)
    
    if (stopOnError && batchResults.some((r) => !r.success)) {
      break
    }
  }
  
  return results
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number
    initialDelay?: number
    maxDelay?: number
    backoffMultiplier?: number
  } = {}
): Promise<T> {
  const {
    retries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < retries) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
      break
    }
  }

  throw lastError || new Error('Unknown error')
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    }),
  ])
}

/**
 * Create a queue for async operations
 */
export class AsyncQueue {
  private queue: Array<() => Promise<any>> = []
  private running = false
  private concurrency: number

  constructor(concurrency: number = 1) {
    this.concurrency = concurrency
  }

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.process()
    })
  }

  private async process() {
    if (this.running || this.queue.length === 0) {
      return
    }

    this.running = true

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency)
      await Promise.all(batch.map((op) => op()))
    }

    this.running = false
  }

  clear() {
    this.queue = []
  }

  get length() {
    return this.queue.length
  }
}

/**
 * Create a semaphore for limiting concurrent operations
 */
export class Semaphore {
  private count: number
  private waiters: Array<() => void> = []

  constructor(count: number) {
    this.count = count
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.count > 0) {
        this.count--
        resolve(() => this.release())
      } else {
        this.waiters.push(() => {
          this.count--
          resolve(() => this.release())
        })
      }
    })
  }

  private release() {
    this.count++
    if (this.waiters.length > 0) {
      const next = this.waiters.shift()
      if (next) next()
    }
  }

  get available() {
    return this.count
  }
}
