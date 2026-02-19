/**
 * Comprehensive error handling utilities
 */

export interface AppError {
  code: string
  message: string
  details?: unknown
  timestamp: Date
  context?: Record<string, unknown>
}

export class AppError extends Error {
  code: string
  details?: unknown
  timestamp: Date
  context?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    details?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
    this.timestamp = new Date()
    this.context = context
    Error.captureStackTrace?.(this, AppError)
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    }
  }
}

/**
 * Error codes enum
 */
export enum ErrorCodes {
  // Authentication
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',

  // File operations
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE = 'FILE_INVALID_TYPE',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',

  // Database
  DB_ERROR = 'DB_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE = 'DUPLICATE',

  // Permission
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  FORBIDDEN = 'FORBIDDEN',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * User-friendly error messages in Arabic
 */
export const ErrorMessages: Record<ErrorCodes, string> = {
  [ErrorCodes.AUTH_REQUIRED]: 'يجب تسجيل الدخول',
  [ErrorCodes.AUTH_INVALID]: 'بيانات الدخول غير صحيحة',
  [ErrorCodes.AUTH_EXPIRED]: 'انتهت صلاحية الجلسة',
  [ErrorCodes.VALIDATION_ERROR]: 'البيانات المدخلة غير صحيحة',
  [ErrorCodes.INVALID_INPUT]: 'إدخال غير صحيح',
  [ErrorCodes.NETWORK_ERROR]: 'خطأ في الاتصال بالشبكة',
  [ErrorCodes.TIMEOUT]: 'انتهت مهلة الاتصال',
  [ErrorCodes.SERVER_ERROR]: 'خطأ في الخادم',
  [ErrorCodes.FILE_TOO_LARGE]: 'حجم الملف كبير جداً',
  [ErrorCodes.FILE_INVALID_TYPE]: 'نوع الملف غير مدعوم',
  [ErrorCodes.FILE_UPLOAD_FAILED]: 'فشل رفع الملف',
  [ErrorCodes.DB_ERROR]: 'خطأ في قاعدة البيانات',
  [ErrorCodes.NOT_FOUND]: 'العنصر غير موجود',
  [ErrorCodes.DUPLICATE]: 'العنصر موجود مسبقاً',
  [ErrorCodes.PERMISSION_DENIED]: 'ليس لديك صلاحية للقيام بهذا الإجراء',
  [ErrorCodes.FORBIDDEN]: 'غير مسموح',
  [ErrorCodes.UNKNOWN_ERROR]: 'حدث خطأ غير معروف',
}

/**
 * Create an AppError from an unknown error
 */
export function createAppError(
  error: unknown,
  code: ErrorCodes = ErrorCodes.UNKNOWN_ERROR,
  context?: Record<string, unknown>
): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(code, error.message, error, context)
  }

  return new AppError(code, String(error), error, context)
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return ErrorMessages[error.code as keyof typeof ErrorMessages] || error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return ErrorMessages[ErrorCodes.UNKNOWN_ERROR]
}

/**
 * Log error with context
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const appError = createAppError(error, ErrorCodes.UNKNOWN_ERROR, context)
  
  console.error('[AppError]', {
    code: appError.code,
    message: appError.message,
    details: appError.details,
    context: appError.context,
    stack: appError.stack,
  })

  // In production, you might want to send to error tracking service
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Example: Send to error tracking service
    // errorTrackingService.log(appError)
  }
}

/**
 * Handle error and show user-friendly message
 */
export async function handleError(
  error: unknown,
  options: {
    showToast?: boolean
    log?: boolean
    context?: Record<string, unknown>
  } = {}
): Promise<void> {
  const { showToast = true, log = true, context } = options

  const appError = createAppError(error, ErrorCodes.UNKNOWN_ERROR, context)
  const message = getErrorMessage(appError)

  if (log) {
    logError(appError, context)
  }

  if (showToast && typeof window !== 'undefined') {
    const { default: toast } = await import('react-hot-toast')
    toast.error(message)
  }
}

/**
 * Error boundary error handler
 */
export function handleErrorBoundaryError(
  error: Error,
  errorInfo: { componentStack: string }
): void {
  logError(error, {
    componentStack: errorInfo.componentStack,
    errorBoundary: true,
  })
}

/**
 * Check if error is a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCodes): boolean {
  if (error instanceof AppError) {
    return error.code === code
  }
  return false
}

/**
 * Extract error code from Supabase error
 */
export function extractSupabaseErrorCode(error: unknown): ErrorCodes {
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>
    
    // Check for specific Supabase error codes
    if (err.code === 'PGRST116') {
      return ErrorCodes.NOT_FOUND
    }
    if (err.code === '23505') {
      return ErrorCodes.DUPLICATE
    }
    if (err.code === '42501') {
      return ErrorCodes.PERMISSION_DENIED
    }
  }

  return ErrorCodes.UNKNOWN_ERROR
}
