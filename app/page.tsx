import Link from 'next/link'
import Image from 'next/image'
import LandingVideo from '@/components/LandingVideo'

const LAYOUT_MAX = 'max-w-[28rem] mx-auto px-4 sm:px-5'
const LOGO_SIZE = 200

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-gold-50 flex flex-col">
      <nav className="sticky top-0 z-50 bg-gold-50/95 border-b-2 border-gold-300 flex items-center min-h-[8rem] safe-top">
        <div className={`${LAYOUT_MAX} w-full flex items-center justify-between gap-3`}>
          <Link href="/" className="flex items-center shrink-0 touch-manipulation" aria-label="DOMOBAT">
            <Image src="/logo.png" alt="DOMOBAT" width={LOGO_SIZE} height={LOGO_SIZE} className="rounded-2xl w-36 h-36 sm:w-40 sm:h-40 object-contain shrink-0 max-h-[8rem]" style={{ width: 'auto', height: 'auto' }} priority sizes="160px" />
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/auth/login" className="min-h-[2.75rem] min-w-[2.75rem] inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gold-900 hover:text-gold-950 active:bg-gold-100 transition-colors rounded-xl touch-manipulation">
              دخول
            </Link>
            <Link href="/auth/register" className="min-h-[2.75rem] min-w-[2.75rem] inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-b from-gold-400 to-gold-600 rounded-xl shadow-md hover:from-gold-500 hover:to-gold-700 hover:shadow-lg active:scale-[0.99] transition-all touch-manipulation">
              إنشاء حساب
            </Link>
          </div>
        </div>
      </nav>

      <main className={`${LAYOUT_MAX} flex-1 w-full pt-6 pb-12 sm:pt-8 sm:pb-14`}>
        <section className="text-center">
          <h1 className="text-lg font-bold text-gold-950 mb-1.5 px-1">برنامج السكن الاقتصادي السريع</h1>
          <p className="text-gold-900 text-xs leading-relaxed mb-5 max-w-[18rem] mx-auto px-1">استمارة رقمية لدراسة وضعيتكم السكنية والمالية واقتراح الحل الأنسب.</p>
          <LandingVideo />
          <div className="flex flex-col gap-3">
            <Link href="/auth/register" className="block w-full min-h-[2.75rem] py-3.5 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 text-white text-sm font-medium text-center shadow-md hover:from-gold-500 hover:to-gold-700 hover:shadow-lg active:scale-[0.99] transition-all touch-manipulation">
              تقديم طلب سكن
            </Link>
            <Link href="/auth/login" className="block w-full min-h-[2.75rem] py-3.5 rounded-xl border-2 border-gold-400 bg-white text-gold-900 text-sm font-medium text-center hover:bg-gold-50 hover:border-gold-500 active:scale-[0.99] transition-all touch-manipulation">
              تسجيل الدخول
            </Link>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t-2 border-gold-300 bg-gold-50/95 safe-bottom">
        <div className={`${LAYOUT_MAX} w-full py-4 flex justify-center items-center`}>
          <p className="text-gold-800 text-xs">© {new Date().getFullYear()} DOMOBAT</p>
        </div>
      </footer>
    </div>
  )
}
