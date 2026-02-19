/**
 * Intelligent helper functions for smarter app behavior
 */

/**
 * Detect user's preferred language
 */
export function detectLanguage(): 'ar' | 'fr' | 'en' {
  if (typeof window === 'undefined') return 'ar'
  
  const browserLang = navigator.language || (navigator as any).userLanguage
  if (browserLang.startsWith('ar')) return 'ar'
  if (browserLang.startsWith('fr')) return 'fr'
  return 'en'
}

/**
 * Detect if user is on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

/**
 * Detect connection speed
 */
export function detectConnectionSpeed(): 'slow' | 'medium' | 'fast' {
  if (typeof window === 'undefined' || !('connection' in navigator)) {
    return 'medium'
  }

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  
  if (!connection) return 'medium'

  const effectiveType = connection.effectiveType
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow'
  if (effectiveType === '3g') return 'medium'
  return 'fast'
}

/**
 * Smart date formatting based on context
 */
export function smartDateFormat(date: Date | string, context: 'short' | 'long' | 'relative' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (context === 'relative') {
    if (diffMins < 1) return 'الآن'
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`
    if (diffHours < 24) return `منذ ${diffHours} ساعة`
    if (diffDays < 7) return `منذ ${diffDays} يوم`
  }

  if (context === 'short') {
    return d.toLocaleDateString('ar-TN', { day: 'numeric', month: 'short' })
  }

  return d.toLocaleDateString('ar-TN', { dateStyle: 'long' })
}

/**
 * Smart number formatting
 */
export function smartNumberFormat(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('ar-TN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/**
 * Smart file size formatting
 */
export function smartFileSize(bytes: number): string {
  if (bytes === 0) return '0 بايت'
  
  const k = 1024
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${smartNumberFormat(bytes / Math.pow(k, i), 2)} ${sizes[i]}`
}

/**
 * Calculate reading time for text
 */
export function calculateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const words = text.trim().split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

/**
 * Generate smart suggestions based on input
 */
export function generateSuggestions(
  input: string,
  options: string[],
  maxSuggestions: number = 5
): string[] {
  if (!input.trim()) return []

  const lowerInput = input.toLowerCase()
  const scored = options
    .map((option) => {
      const lowerOption = option.toLowerCase()
      let score = 0

      // Exact match
      if (lowerOption === lowerInput) score = 100
      // Starts with
      else if (lowerOption.startsWith(lowerInput)) score = 80
      // Contains
      else if (lowerOption.includes(lowerInput)) score = 60
      // Fuzzy match
      else {
        let matches = 0
        for (let i = 0; i < lowerInput.length; i++) {
          if (lowerOption.includes(lowerInput[i])) matches++
        }
        score = (matches / lowerInput.length) * 40
      }

      return { option, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .map((item) => item.option)

  return scored
}

/**
 * Detect if content should be lazy loaded based on connection speed
 */
export function shouldLazyLoad(): boolean {
  const speed = detectConnectionSpeed()
  return speed === 'slow'
}

/**
 * Get optimal image quality based on connection speed
 */
export function getOptimalImageQuality(): 'low' | 'medium' | 'high' {
  const speed = detectConnectionSpeed()
  if (speed === 'slow') return 'low'
  if (speed === 'medium') return 'medium'
  return 'high'
}

/**
 * Smart pagination - calculate optimal page size
 */
export function calculateOptimalPageSize(
  totalItems: number,
  defaultSize: number = 10
): number {
  const speed = detectConnectionSpeed()
  const isMobile = isMobileDevice()

  if (speed === 'slow') {
    return isMobile ? 5 : 10
  }
  if (speed === 'medium') {
    return isMobile ? 10 : 20
  }
  return isMobile ? 20 : defaultSize
}

/**
 * Debounce based on connection speed
 */
export function adaptiveDebounce(delay: number): number {
  const speed = detectConnectionSpeed()
  if (speed === 'slow') return delay * 1.5
  if (speed === 'fast') return delay * 0.7
  return delay
}
