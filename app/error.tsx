'use client'

import { useEffect } from 'react'

/**
 * Root error boundary. Does not use usePathname/useSearchParams so it never
 * triggers "Cannot read properties of null (reading 'useContext')".
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-6">
      <h1 className="text-xl font-bold text-gray-900 mb-2">حدث خطأ</h1>
      <p className="text-gray-600 text-sm text-center mb-6 max-w-sm">
        حدثت مشكلة أثناء تحميل الصفحة. يرجى المحاولة مرة أخرى.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-6 py-3 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
      >
        إعادة المحاولة
      </button>
      <a
        href="/"
        className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        العودة للرئيسية
      </a>
    </div>
  )
}
