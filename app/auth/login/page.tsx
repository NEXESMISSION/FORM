'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const input = phone.trim()
    if (!input || !password) {
      toast.error('أدخل رقم الهاتف أو البريد الإلكتروني وكلمة المرور')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrEmail: input, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'فشل تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.')
        setLoading(false)
        return
      }
      if (!data.session) {
        toast.error('فشل تسجيل الدخول.')
        setLoading(false)
        return
      }
      const { error: setError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      if (setError) {
        toast.error(setError.message || 'فشل تسجيل الدخول.')
        setLoading(false)
        return
      }
      toast.success('تم تسجيل الدخول')
      // Redirect admins to admin panel, others to projects
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .maybeSingle()
      if (profile?.role === 'admin') {
        router.push('/dashboard/admin')
      } else {
        router.push('/projects')
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  const LAYOUT_MAX = 'max-w-[28rem] mx-auto px-4 sm:px-5'
  const LOGO_SIZE = 200

  return (
    <div className="min-h-screen bg-gold-50 flex flex-col min-h-[100dvh]">
      <nav className="sticky top-0 z-50 bg-gold-50/95 border-b-2 border-gold-300 flex items-center min-h-[8rem] safe-top">
        <div className={`${LAYOUT_MAX} w-full flex items-center justify-between gap-3`}>
          <Link href="/" className="flex items-center shrink-0 touch-manipulation" aria-label="DOMOBAT">
            <Image src="/logo.png" alt="DOMOBAT" width={LOGO_SIZE} height={LOGO_SIZE} className="rounded-2xl w-36 h-36 sm:w-40 sm:h-40 object-contain shrink-0 max-h-[8rem]" style={{ width: 'auto', height: 'auto' }} priority sizes="160px" />
          </Link>
          <Link href="/" className="flex items-center gap-2 min-h-[2.75rem] text-gold-900 hover:text-gold-950 text-sm font-medium touch-manipulation active:opacity-80">
            <ArrowRight className="w-4 h-4 shrink-0" />
            الرئيسية
          </Link>
        </div>
      </nav>

      <main className={`${LAYOUT_MAX} w-full pt-6 pb-10 flex-1 flex flex-col items-center`}>
        <div className="w-full max-w-[22rem] mx-auto text-center">
          <h1 className="text-lg font-bold text-gold-950 mb-0.5">تسجيل الدخول</h1>
          <p className="text-gold-900 text-xs mb-5">رقم الهاتف أو البريد الإلكتروني وكلمة المرور</p>

          <form onSubmit={handleLogin} className="space-y-4 text-start">
            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-gold-900 mb-1">رقم الهاتف أو البريد الإلكتروني</label>
              <input
                id="phone"
                type="text"
                inputMode="text"
                autoComplete="username"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[2.75rem] px-4 py-3 rounded-xl border-2 border-gold-300 bg-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 outline-none text-base placeholder:text-gold-400 touch-manipulation"
                placeholder="+216 XX XXX XXX أو بريدك الإلكتروني"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gold-900 mb-1">كلمة المرور</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[2.75rem] px-4 py-3 rounded-xl border-2 border-gold-300 bg-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 outline-none text-base placeholder:text-gold-400 touch-manipulation"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[2.75rem] py-3.5 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 text-white text-sm font-medium text-center shadow-md hover:from-gold-500 hover:to-gold-700 hover:shadow-lg active:scale-[0.99] disabled:opacity-50 transition-all touch-manipulation"
            >
              {loading ? <span className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'دخول'}
            </button>
          </form>

          <p className="text-gold-900 text-xs mt-6">
            لا تملك حساباً؟{' '}
            <Link href="/auth/register" className="text-gold-950 font-medium hover:underline touch-manipulation">إنشاء حساب</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
