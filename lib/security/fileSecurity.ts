/**
 * File upload security utilities
 */

export interface FileSecurityOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  allowedExtensions?: string[]
  scanForMalware?: boolean // Would require external service
}

export interface FileSecurityResult {
  safe: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate file type by extension
 */
export function validateFileExtension(
  fileName: string,
  allowedExtensions: string[]
): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (!extension) return false
  
  return allowedExtensions.includes(extension)
}

/**
 * Validate file type by MIME type
 */
export function validateMimeType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.some((type) => {
    if (type.includes('*')) {
      // Wildcard match (e.g., 'image/*')
      const baseType = type.split('/')[0]
      return mimeType.startsWith(baseType + '/')
    }
    return mimeType === type
  })
}

/**
 * Check for dangerous file types
 */
export function isDangerousFileType(fileName: string, mimeType: string): boolean {
  const dangerousExtensions = [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
    'app', 'deb', 'pkg', 'rpm', 'msi', 'dmg',
  ]
  
  const dangerousMimeTypes = [
    'application/x-msdownload',
    'application/x-executable',
    'application/x-msdos-program',
    'application/x-ms-installer',
    'application/javascript',
    'application/x-javascript',
  ]

  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension && dangerousExtensions.includes(extension)) {
    return true
  }

  if (dangerousMimeTypes.includes(mimeType)) {
    return true
  }

  return false
}

/**
 * Check file content for suspicious patterns
 */
export async function scanFileContent(file: File): Promise<{
  suspicious: boolean
  reasons: string[]
}> {
  const reasons: string[] = []
  let suspicious = false

  // Check file size (too small might be suspicious)
  if (file.size < 100) {
    reasons.push('File size is suspiciously small')
    suspicious = true
  }

  // Read first bytes to check magic numbers
  const buffer = await file.slice(0, 512).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // Check for executable signatures
  const executableSignatures = [
    [0x4d, 0x5a], // MZ (PE executable)
    [0x7f, 0x45, 0x4c, 0x46], // ELF
    [0xca, 0xfe, 0xba, 0xbe], // Java class
  ]

  for (const signature of executableSignatures) {
    let match = true
    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) {
        match = false
        break
      }
    }
    if (match) {
      reasons.push('File contains executable signature')
      suspicious = true
      break
    }
  }

  // Check for script tags in text files
  if (file.type.startsWith('text/') || file.type === 'application/json') {
    const text = await file.slice(0, 1024).text()
    if (text.includes('<script') || text.includes('javascript:')) {
      reasons.push('File contains script tags')
      suspicious = true
    }
  }

  return { suspicious, reasons }
}

/**
 * Comprehensive file security check
 */
export async function checkFileSecurity(
  file: File,
  options: FileSecurityOptions = {}
): Promise<FileSecurityResult> {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [],
    allowedExtensions = [],
    scanForMalware = false,
  } = options

  const errors: string[] = []
  const warnings: string[] = []

  // Size check
  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum allowed size of ${(maxSize / (1024 * 1024)).toFixed(2)}MB`)
  }

  // Extension check
  if (allowedExtensions.length > 0) {
    if (!validateFileExtension(file.name, allowedExtensions)) {
      errors.push(`File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`)
    }
  }

  // MIME type check
  if (allowedTypes.length > 0) {
    if (!validateMimeType(file.type, allowedTypes)) {
      errors.push(`File type not allowed. Allowed: ${allowedTypes.join(', ')}`)
    }
  }

  // Dangerous file type check
  if (isDangerousFileType(file.name, file.type)) {
    errors.push('File type is potentially dangerous')
  }

  // Content scanning
  if (scanForMalware || errors.length === 0) {
    const scanResult = await scanFileContent(file)
    if (scanResult.suspicious) {
      warnings.push(...scanResult.reasons)
    }
  }

  return {
    safe: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Safe file name generation
 */
export function generateSafeFileName(originalName: string, userId: string): string {
  const sanitized = originalName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100)
  
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  
  return `${userId}/${timestamp}-${random}-${sanitized}`
}

/**
 * Allowed file types for document uploads
 */
export const DOCUMENT_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export const DOCUMENT_ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp']

export const DOCUMENT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
