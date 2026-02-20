/**
 * Central SEO config for domobat-tunisie.com
 * Single source of truth for site URL and default copy.
 */
export const SITE_URL = 'https://www.domobat-tunisie.com'

export const SEO_DEFAULTS = {
  title: 'DOMOBAT — برنامج السكن الاقتصادي السريع | تونس',
  shortTitle: 'DOMOBAT',
  description:
    'استمارة رقمية لدراسة الوضعية السكنية والمالية واقتراح الحل السكني الأنسب. تقديم طلب سكن اقتصادي، تسجيل وإنشاء حساب، متابعة الملفات في تونس.',
  keywords: [
    'سكن اقتصادي',
    'برنامج السكن الاقتصادي السريع',
    'استمارة سكنية تونس',
    'طلب سكن تونس',
    'DOMOBAT',
    'سكن تونس',
    'وزارة التجهيز تونس',
    'السكن الاقتصادي',
  ],
  locale: 'ar_TN',
  localeAlternate: ['fr_TN'],
  imagePath: '/logo.png',
  imageWidth: 512,
  imageHeight: 512,
} as const

export function absoluteUrl(path: string): string {
  const base = SITE_URL.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
