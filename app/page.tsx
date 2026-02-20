import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100/50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80 shadow-sm">
        <div className="max-w-[28rem] mx-auto px-5 h-20 flex justify-between items-center">
          <div className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="DOMOBAT" 
              width={112} 
              height={112} 
              className="rounded-2xl"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href="/auth/login" 
              className="text-gray-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              دخول
            </Link>
            <Link 
              href="/auth/register" 
              className="bg-primary-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-primary-900/20 hover:bg-primary-900 hover:shadow-xl hover:shadow-primary-900/25 transition-all"
            >
              إنشاء حساب
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-[28rem] mx-auto px-5 pt-8 pb-20">
        {/* Hero Section */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 rounded-3xl blur-2xl opacity-15"></div>
          <div className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 rounded-3xl p-8 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-white/90 text-xs font-medium">منصة رقمية حديثة</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3 leading-tight tracking-tight">
                برنامج السكن الاقتصادي السريع
              </h1>
              <p className="text-white/95 text-sm leading-relaxed mb-6">
                استمارة رقمية لدراسة وضعيتكم السكنية والمالية واقتراح الحل الأنسب لكم.
              </p>
              <div className="flex flex-col gap-3">
                <Link 
                  href="/auth/register" 
                  className="w-full py-4 rounded-2xl bg-white text-primary-900 text-center font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span>تقديم طلب سكن</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link 
                  href="/auth/login" 
                  className="w-full py-4 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white text-center font-semibold hover:bg-white/20 transition-all"
                >
                  تسجيل الدخول
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-primary-800 to-primary-600 rounded-full"></div>
            <h2 className="text-lg font-bold text-gray-900">كيف تعمل المنصة</h2>
          </div>
          <div className="space-y-5">
            {[
              { n: '١', title: 'إنشاء حساب', desc: 'التسجيل والتحقق عبر SMS', icon: '📱' },
              { n: '٢', title: 'ملء الاستمارة', desc: 'حفظ تلقائي للتقدّم', icon: '📝' },
              { n: '٣', title: 'اقتراح الحل', desc: 'دراسة الملف واقتراح الأنسب', icon: '✨' },
            ].map(({ n, title, desc, icon }, idx) => (
              <div key={n} className="flex gap-4 items-start group">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-800 to-primary-700 text-white text-lg font-bold flex items-center justify-center shadow-lg shadow-primary-900/30 group-hover:scale-110 transition-transform duration-300">
                    {n}
                  </div>
                  {idx < 2 && (
                    <div className="absolute top-12 right-1/2 translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-primary-600 to-transparent"></div>
                  )}
                </div>
                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xl">{icon}</span>
                    <h3 className="font-bold text-gray-900 text-base">{title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 rounded-3xl p-6 text-center shadow-xl shadow-primary-900/20 mb-8">
          <h3 className="text-xl font-bold text-white mb-2">جاهز للبدء؟</h3>
          <p className="text-white/90 text-sm mb-5">انضم إلى آلاف العائلات التي وجدت حلاً سكنياً</p>
          <Link 
            href="/auth/register" 
            className="inline-block w-full py-4 rounded-2xl bg-white text-primary-900 font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            ابدأ الآن مجاناً
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 mt-12">
        <div className="max-w-[28rem] mx-auto px-5">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/logo.png" alt="DOMOBAT" width={32} height={32} className="rounded-lg" style={{ width: 'auto', height: 'auto' }} priority />
            <span className="text-sm font-semibold text-gray-700">DOMOBAT</span>
          </div>
          <p className="text-gray-400 text-xs text-center leading-relaxed">
            © {new Date().getFullYear()} DOMOBAT — برنامج السكن الاقتصادي السريع
          </p>
          <p className="text-gray-400 text-xs text-center mt-2">
            منصة رقمية معتمدة لخدمة المواطنين
          </p>
        </div>
      </footer>
    </div>
  )
}
