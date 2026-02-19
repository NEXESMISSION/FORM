/**
 * Smart form validation hook with real-time feedback
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { validateFields, ValidationRule, ValidationResult } from '@/lib/utils/validation'

export interface FieldValidation {
  value: any
  rules: ValidationRule
  touched: boolean
  error: string | null
}

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  rules: Record<keyof T, ValidationRule>
): {
  data: T
  errors: Record<keyof T, string>
  isValid: boolean
  touched: Record<keyof T, boolean>
  setValue: (field: keyof T, value: any) => void
  setTouched: (field: keyof T) => void
  validate: () => boolean
  validateField: (field: keyof T) => boolean
  reset: () => void
} {
  const [data, setData] = useState<T>(initialData)
  const [touched, setTouchedState] = useState<Record<keyof T, boolean>>(
    {} as Record<keyof T, boolean>
  )
  const [errors, setErrors] = useState<Record<keyof T, string>>(
    {} as Record<keyof T, string>
  )

  // Validate single field
  const validateField = useCallback(
    (field: keyof T): boolean => {
      const fieldRules = rules[field]
      if (!fieldRules) return true

      const error = validateFields({ [field]: data[field] }, { [field]: fieldRules }).errors[
        field as string
      ]

      setErrors((prev) => ({
        ...prev,
        [field]: error || '',
      }))

      return !error
    },
    [data, rules]
  )

  // Validate all fields
  const validate = useCallback((): boolean => {
    const result = validateFields(data, rules as Record<string, ValidationRule>)
    setErrors(result.errors as Record<keyof T, string>)
    return result.valid
  }, [data, rules])

  // Set value and validate if touched
  const setValue = useCallback(
    (field: keyof T, value: any) => {
      setData((prev) => ({
        ...prev,
        [field]: value,
      }))

      // Auto-validate if field was touched
      if (touched[field]) {
        setTimeout(() => validateField(field), 0)
      }
    },
    [touched, validateField]
  )

  // Mark field as touched and validate
  const setTouched = useCallback(
    (field: keyof T) => {
      setTouchedState((prev) => ({
        ...prev,
        [field]: true,
      }))
      validateField(field)
    },
    [validateField]
  )

  // Reset form
  const reset = useCallback(() => {
    setData(initialData)
    setTouchedState({} as Record<keyof T, boolean>)
    setErrors({} as Record<keyof T, string>)
  }, [initialData])

  // Validate on blur
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 || Object.values(errors).every((e) => !e)
  }, [errors])

  return {
    data,
    errors,
    isValid,
    touched,
    setValue,
    setTouched,
    validate,
    validateField,
    reset,
  }
}
