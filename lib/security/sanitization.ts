/**
 * Input sanitization and XSS prevention utilities
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML string to prevent XSS
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side: use DOMPurify
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    })
  }
  
  // Client-side: use DOMPurify
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

/**
 * Sanitize user input (remove HTML tags and dangerous characters)
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return String(input)
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')
  
  // Remove script tags and event handlers
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=/gi, '')
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  return sanitized
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key]) as T[Extract<keyof T, string>]
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      if (Array.isArray(sanitized[key])) {
        sanitized[key] = sanitized[key].map((item: any) =>
          typeof item === 'string' ? sanitizeInput(item) : item
        ) as T[Extract<keyof T, string>]
      } else {
        sanitized[key] = sanitizeObject(sanitized[key]) as T[Extract<keyof T, string>]
      }
    }
  }
  
  return sanitized
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null
  }

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Validate Tunisian phone format
  const phoneRegex = /^(\+216|216|0)?[0-9]{8}$/
  if (!phoneRegex.test(cleaned)) {
    return null
  }

  // Normalize to +216 format
  let normalized = cleaned
  if (normalized.startsWith('0')) {
    normalized = '+216' + normalized.substring(1)
  } else if (normalized.startsWith('216')) {
    normalized = '+' + normalized
  } else if (!normalized.startsWith('+')) {
    normalized = '+216' + normalized
  }

  return normalized
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const sanitized = email.trim().toLowerCase()
  
  if (!emailRegex.test(sanitized)) {
    return null
  }

  // Additional checks
  if (sanitized.length > 254) {
    return null // RFC 5321 limit
  }

  return sanitized
}

/**
 * Validate and sanitize ID card number
 */
export function sanitizeIdCard(idCard: string): string | null {
  if (!idCard || typeof idCard !== 'string') {
    return null
  }

  // Remove all non-digit characters
  const cleaned = idCard.replace(/\D/g, '')
  
  // Validate length (8 or 9 digits)
  if (cleaned.length !== 8 && cleaned.length !== 9) {
    return null
  }

  return cleaned
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return 'file'
  }

  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, '')
  sanitized = sanitized.replace(/[\/\\]/g, '_')
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_')
  
  // Limit length
  sanitized = sanitized.substring(0, 255)
  
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '')
  
  return sanitized || 'file'
}

/**
 * Validate SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(UNION|JOIN)\b)/i,
    /('|('')|;|--|\*|xp_|sp_)/i,
  ]

  return sqlPatterns.some((pattern) => pattern.test(input))
}

/**
 * Sanitize for SQL (use parameterized queries instead!)
 */
export function sanitizeForSql(input: string): string {
  if (containsSqlInjection(input)) {
    throw new Error('Potential SQL injection detected')
  }
  return input.replace(/'/g, "''") // Basic escaping, but use parameterized queries!
}
