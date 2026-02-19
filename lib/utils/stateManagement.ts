/**
 * State management utilities for better state handling
 */

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Use state with previous value tracking
 */
export function useStateWithPrevious<T>(
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, T | undefined] {
  const [state, setState] = useState<T>(initialValue)
  const prevRef = useRef<T>()

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState((prev) => {
      prevRef.current = prev
      return typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
    })
  }, [])

  return [state, setValue, prevRef.current]
}

/**
 * Use state with validation
 */
export function useStateWithValidation<T>(
  initialValue: T,
  validator: (value: T) => string | null
): [
  T,
  (value: T | ((prev: T) => T)) => void,
  string | null,
  boolean
] {
  const [state, setState] = useState<T>(initialValue)
  const [error, setError] = useState<string | null>(null)

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(state)
        : value
      
      setState(newValue)
      const validationError = validator(newValue)
      setError(validationError)
    },
    [state, validator]
  )

  const isValid = error === null

  return [state, setValue, error, isValid]
}

/**
 * Use async state with loading and error handling
 */
export function useAsyncState<T>(
  initialValue: T | null = null
): [
  T | null,
  (promise: Promise<T>) => Promise<void>,
  boolean,
  Error | null,
  () => void
] {
  const [state, setState] = useState<T | null>(initialValue)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (promise: Promise<T>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await promise
      setState(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setState(initialValue)
    setLoading(false)
    setError(null)
  }, [initialValue])

  return [state, execute, loading, error, reset]
}

/**
 * Use state with localStorage persistence
 */
export function useStateWithStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = typeof value === 'function' 
          ? (value as (prev: T) => T)(state)
          : value
        
        setState(valueToStore)
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error)
      }
    },
    [key, state]
  )

  return [state, setValue]
}

/**
 * Use state with debounce
 */
export function useStateWithDebounce<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [state, setState] = useState<T>(initialValue)
  const [debouncedState, setDebouncedState] = useState<T>(initialValue)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedState(state)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [state, delay])

  return [state, debouncedState, setState]
}

/**
 * Use toggle state
 */
export function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [state, setState] = useState(initialValue)

  const toggle = useCallback(() => {
    setState((prev) => !prev)
  }, [])

  return [state, toggle, setState]
}

/**
 * Use counter state
 */
export function useCounter(
  initialValue: number = 0,
  min?: number,
  max?: number
): [number, () => void, () => void, (value: number) => void, () => void] {
  const [count, setCount] = useState(initialValue)

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = prev + 1
      if (max !== undefined && next > max) return prev
      return next
    })
  }, [max])

  const decrement = useCallback(() => {
    setCount((prev) => {
      const next = prev - 1
      if (min !== undefined && next < min) return prev
      return next
    })
  }, [min])

  const setValue = useCallback(
    (value: number) => {
      if (min !== undefined && value < min) return
      if (max !== undefined && value > max) return
      setCount(value)
    },
    [min, max]
  )

  const reset = useCallback(() => {
    setCount(initialValue)
  }, [initialValue])

  return [count, increment, decrement, setValue, reset]
}

/**
 * Use array state with helper methods
 */
export function useArrayState<T>(
  initialValue: T[] = []
): [
  T[],
  {
    push: (item: T) => void
    pop: () => void
    unshift: (item: T) => void
    shift: () => void
    remove: (index: number) => void
    update: (index: number, item: T) => void
    clear: () => void
    set: (items: T[]) => void
  }
] {
  const [array, setArray] = useState<T[]>(initialValue)

  const push = useCallback((item: T) => {
    setArray((prev) => [...prev, item])
  }, [])

  const pop = useCallback(() => {
    setArray((prev) => prev.slice(0, -1))
  }, [])

  const unshift = useCallback((item: T) => {
    setArray((prev) => [item, ...prev])
  }, [])

  const shift = useCallback(() => {
    setArray((prev) => prev.slice(1))
  }, [])

  const remove = useCallback((index: number) => {
    setArray((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const update = useCallback((index: number, item: T) => {
    setArray((prev) => {
      const next = [...prev]
      next[index] = item
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setArray([])
  }, [])

  const set = useCallback((items: T[]) => {
    setArray(items)
  }, [])

  return [
    array,
    { push, pop, unshift, shift, remove, update, clear, set },
  ]
}
