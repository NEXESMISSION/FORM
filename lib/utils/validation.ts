/**
 * Comprehensive form validation utilities
 */

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
  message?: string
}

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

/**
 * Validate a single field
 */
export function validateField(
  value: any,
  rules: ValidationRule,
  fieldName: string = 'Field'
): string | null {
  // Required check
  if (rules.required) {
    if (value === null || value === undefined || value === '') {
      return rules.message || `${fieldName} مطلوب`
    }
  }

  // Skip other checks if value is empty and not required
  if (!value && !rules.required) {
    return null
  }

  const stringValue = String(value)

  // Min length check
  if (rules.minLength && stringValue.length < rules.minLength) {
    return rules.message || `${fieldName} يجب أن يكون على الأقل ${rules.minLength} أحرف`
  }

  // Max length check
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return rules.message || `${fieldName} يجب أن يكون على الأكثر ${rules.maxLength} أحرف`
  }

  // Pattern check
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return rules.message || `${fieldName} غير صحيح`
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value)
    if (customError) {
      return customError
    }
  }

  return null
}

/**
 * Validate multiple fields
 */
export function validateFields(
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationResult {
  const errors: Record<string, string> = {}

  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const error = validateField(data[fieldName], fieldRules, fieldName)
    if (error) {
      errors[fieldName] = error
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[0-9]{8}$/,
  idCard: /^[0-9]{8,9}$/,
  positiveNumber: /^[1-9]\d*$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
}

/**
 * Common validation rules
 */
export const CommonRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message,
  }),
  
  email: (message?: string): ValidationRule => ({
    required: true,
    pattern: ValidationPatterns.email,
    message: message || 'البريد الإلكتروني غير صحيح',
  }),
  
  phone: (message?: string): ValidationRule => ({
    required: true,
    pattern: ValidationPatterns.phone,
    message: message || 'رقم الهاتف يجب أن يكون 8 أرقام',
  }),
  
  idCard: (message?: string): ValidationRule => ({
    required: true,
    pattern: ValidationPatterns.idCard,
    message: message || 'رقم البطاقة يجب أن يكون 8 أو 9 أرقام',
  }),
  
  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message,
  }),
  
  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message,
  }),
  
  positiveNumber: (message?: string): ValidationRule => ({
    required: true,
    custom: (value) => {
      const num = Number(value)
      if (isNaN(num) || num <= 0) {
        return message || 'يجب أن يكون رقماً موجباً'
      }
      return null
    },
  }),
}

/**
 * Validate housing application form data
 */
export function validateHousingApplication(data: Record<string, any>): ValidationResult {
  return validateFields(data, {
    full_name: CommonRules.required('الاسم الكامل مطلوب'),
    email: CommonRules.email(),
    id_card_number: CommonRules.idCard(),
    birth_date: CommonRules.required('تاريخ الولادة مطلوب'),
    marital_status: CommonRules.required('الحالة الاجتماعية مطلوبة'),
    governorate: CommonRules.required('الولاية مطلوبة'),
    monthly_income: CommonRules.positiveNumber('الدخل الشهري يجب أن يكون رقماً موجباً'),
    payment_capacity: CommonRules.positiveNumber('القدرة على الدفع يجب أن تكون رقماً موجباً'),
    required_area: CommonRules.positiveNumber('المساحة المطلوبة يجب أن تكون رقماً موجباً'),
    housing_type: CommonRules.required('نوع السكن مطلوب'),
  })
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: string,
  endDate: string
): string | null {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (start > end) {
    return 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية'
  }
  
  return null
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  files: File[],
  maxSize: number = 10 * 1024 * 1024, // 10MB
  allowedTypes: string[] = []
): ValidationResult {
  const errors: Record<string, string> = {}
  
  files.forEach((file, index) => {
    const fieldName = `file_${index}`
    
    // Size check
    if (file.size > maxSize) {
      errors[fieldName] = `حجم الملف ${file.name} كبير جداً (الحد الأقصى: ${(maxSize / (1024 * 1024)).toFixed(2)} ميجابايت)`
    }
    
    // Type check
    if (allowedTypes.length > 0) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const mimeType = file.type
      
      const isAllowed = allowedTypes.some((type) => {
        if (type.startsWith('.')) {
          return fileExtension === type.slice(1)
        }
        return mimeType.startsWith(type) || mimeType === type
      })
      
      if (!isAllowed) {
        errors[fieldName] = `نوع الملف ${file.name} غير مدعوم`
      }
    }
  })
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
