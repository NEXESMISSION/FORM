'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowRight, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('أدخل البريد الإلكتروني وكلمة المرور')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        if (error.message?.includes('Invalid login credentials')) throw new Error('البريد أو كلمة المرور غير صحيحة.')
        if (error.message?.includes('Email not confirmed')) throw new Error('يرجى تفعيل حسابك عبر البريد أولاً.')
        throw error
      }
      if (!data.user) throw new Error('فشل تسجيل الدخول.')
      toast.success('تم تسجيل الدخول')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'فشل تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/20">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
        <div className="max-w-[28rem] mx-auto px-5 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowRight className="w-5 h-5" />
            <span className="text-sm font-medium">الرئيسية</span>
          </Link>
          <Image src="/logo.png" alt="DOMOBAT" width={112} height={112} className="rounded-2xl w-auto h-auto" priority />
          <div className="w-20"></div>
        </div>
      </nav>

      <main className="max-w-[28rem] mx-auto px-5 pt-12 pb-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">تسجيل الدخول</h1>
          <p className="text-gray-600 text-base">أدخل بياناتك للدخول إلى حسابك</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-6 animate-fade-in">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="form-label flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-600" />
                البريد الإلكتروني *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="your.email@example.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary-600" />
                كلمة المرور *
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary py-4 text-base font-bold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all"
            >
              {loading ? <span className="spinner mx-auto" /> : 'دخول'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm">
          لا تملك حساباً؟{' '}
          <Link href="/auth/register" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
            إنشاء حساب
          </Link>
        </p>
      </main>
    </div>
  )
}
