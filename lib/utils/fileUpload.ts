/**
 * Utility functions for file upload handling
 * Provides robust error handling and state management
 */

export interface FileUploadOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  multiple?: boolean
}

export interface FileUploadResult {
  success: boolean
  files?: File[]
  error?: string
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options: FileUploadOptions = {}
): { valid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = options // Default 10MB

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2)
    return {
      valid: false,
      error: `حجم الملف كبير جداً. الحد الأقصى: ${maxSizeMB} ميجابايت`,
    }
  }

  // Check file type if restrictions are provided
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
      return {
        valid: false,
        error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.join(', ')}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  options: FileUploadOptions = {}
): { valid: boolean; validFiles: File[]; errors: string[] } {
  const validFiles: File[] = []
  const errors: string[] = []

  files.forEach((file) => {
    const validation = validateFile(file, options)
    if (validation.valid) {
      validFiles.push(file)
    } else {
      errors.push(`${file.name}: ${validation.error}`)
    }
  })

  return {
    valid: errors.length === 0,
    validFiles,
    errors,
  }
}

/**
 * Convert FileList to File array safely
 */
export function fileListToArray(fileList: FileList | null): File[] {
  if (!fileList) return []
  
  const files: File[] = []
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList.item(i)
    if (file) {
      files.push(file)
    }
  }
  
  return files
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 بايت'
  
  const k = 1024
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || getFileExtension(file.name) === 'pdf'
}

/**
 * Create a preview URL for an image file
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      reject(new Error('File is not an image'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Clean up preview URL to prevent memory leaks
 */
export function revokeImagePreview(url: string): void {
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    URL.revokeObjectURL(url)
  }
}
