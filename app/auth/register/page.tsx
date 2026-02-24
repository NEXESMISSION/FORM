'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowRight, User, Phone, Shield, Lock, MapPin, FileText } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cin, setCin] = useState('')
  const [governorate, setGovernorate] = useState('')
  const [cinExists, setCinExists] = useState(false)
  const [checkingCin, setCheckingCin] = useState(false)

  const tunisianGovernorates = [
    'أريانة', 'باجة', 'بن عروس', 'بنزرت', 'قابس', 'قفصة', 'جندوبة', 'القيروان',
    'القصرين', 'قبلي', 'الكاف', 'المهدية', 'منوبة', 'مدنين', 'المنستير', 'نابل',
    'صفاقس', 'سيدي بوزيد', 'سليانة', 'سوسة', 'تطاوين', 'توزر', 'تونس', 'زغوان'
  ]
  const role = 'applicant' as const
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [phoneTaken, setPhoneTaken] = useState(false)
  const [checkingPhone, setCheckingPhone] = useState(false)

  const steps = [
    { num: 1, title: 'المعلومات الشخصية', icon: User },
    { num: 2, title: 'التحقق من الهاتف', icon: Shield },
    { num: 3, title: 'كلمة المرور', icon: Lock },
  ]

  const sendVerificationCode = async () => {
    if (!phone) {
      toast.error('أدخل رقم هاتفك')
      return
    }

    let formattedPhone = phone.trim()
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('216')) {
        formattedPhone = '+' + formattedPhone
      } else if (formattedPhone.startsWith('0')) {
        formattedPhone = '+216' + formattedPhone.substring(1)
      } else {
        formattedPhone = '+216' + formattedPhone
      }
    }

    setLoading(true)
    try {
      const checkRes = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      })
      const checkData = await checkRes.json()
      if (checkData.taken) {
        toast.error('رقم الهاتف مسجّل مسبقاً. استخدم رقماً آخر أو سجّل الدخول.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || data.message || 'فشل إرسال رمز التحقق')
      }

      setPhone(formattedPhone)
      toast.success('تم إرسال رمز التحقق. تحقق من هاتفك.')
      setStep(2)
    } catch (error: any) {
      console.error('SMS error:', error)
      const msg = error?.message || 'فشل إرسال رمز التحقق. تحقق من الرقم وحاول مرة أخرى.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    if (!code || code.length !== 6) {
      toast.error('أدخل رمز التحقق المكوّن من 6 أرقام')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/sms/send', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }

      toast.success('تم التحقق من رقم الهاتف')
      setStep(3)
    } catch (error: any) {
      toast.error(error.message || 'رمز التحقق غير صحيح')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !phone || !cin || !governorate) {
      toast.error('املأ جميع الحقول المطلوبة')
      return
    }

    if (password !== confirmPassword) {
      toast.error('كلمة المرور غير متطابقة')
      return
    }

    if (password.length < 6) {
      toast.error('كلمة المرور 6 أحرف على الأقل')
      return
    }

    setLoading(true)
    try {
      let formattedPhone = phone.trim()
      if (!formattedPhone.startsWith('+')) {
        if (formattedPhone.startsWith('216')) {
          formattedPhone = '+' + formattedPhone
        } else if (formattedPhone.startsWith('0')) {
          formattedPhone = '+216' + formattedPhone.substring(1)
        } else {
          formattedPhone = '+216' + formattedPhone
        }
      }

      const checkRes = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      })
      const checkData = await checkRes.json()
      if (checkData.taken) {
        throw new Error('رقم الهاتف مسجّل مسبقاً. إن كان حسابك، جرّب تسجيل الدخول.')
      }

      const generatedEmail = formattedPhone.replace(/\D/g, '') + '@domobat.user'
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: generatedEmail,
        password,
        options: {
          data: {
            name: name.trim(),
            phone_number: formattedPhone,
            cin: cin,
            country: 'Tunisia',
            governorate: governorate || null,
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      })

      if (authError) {
        if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
          throw new Error('هذا الرقم مرتبط بحساب موجود. جرّب تسجيل الدخول.')
        } else if (authError.message?.includes('Password')) {
          throw new Error('كلمة المرور ضعيفة. استخدم كلمة مرور أقوى.')
        }
        throw new Error(authError.message || 'Failed to create account')
      }

      if (!authData.user) {
        throw new Error('فشل إنشاء الحساب. حاول مرة أخرى.')
      }

      // Build profile object - only include fields that exist in schema
      const profileToInsert: any = {
        id: authData.user.id,
        phone_number: formattedPhone,
        email: generatedEmail,
        role: role,
        country: 'Tunisia',
      }

      if (name?.trim()) profileToInsert.name = name.trim()
      if (cin?.trim()) profileToInsert.cin = cin.trim()
      // Add governorate (will be handled gracefully if column doesn't exist)
      if (governorate?.trim()) profileToInsert.governorate = governorate.trim()

      // Upsert so we don't fail if a trigger already created the profile (same id); avoids false "phone used" after signup
      const { error: profileError, data: createdProfile } = await supabase
        .from('profiles')
        .upsert(profileToInsert, { onConflict: 'id' })
        .select()
        .single()

      if (profileError) {
        console.error('Profile upsert error:', profileError)
        const errorMsg = (profileError.message || '').toLowerCase()
        const errorCode = profileError.code
        const statusCode = (profileError as any).status || (profileError as any).statusCode || errorCode
        
        // Handle 409 Conflict - profile might already exist, try to fetch it instead
        if (statusCode === 409 || statusCode === '409' || errorCode === '23505' || errorMsg.includes('conflict')) {
          // Check if it's a phone number conflict (another user) or just ID conflict (same user)
          const isDuplicatePhone = errorMsg.includes('phone_number') || errorMsg.includes('profiles_phone_number') || errorMsg.includes('unique constraint') && errorMsg.includes('phone')
          
          if (isDuplicatePhone) {
            await supabase.auth.signOut()
            throw new Error('رقم الهاتف مرتبط بحساب آخر. إن كان حسابك، جرّب تسجيل الدخول.')
          } else {
            // Same user, profile might already exist - try to fetch it
            const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single()
            
            if (existingProfile && !fetchError) {
              toast.success('تم إنشاء الحساب بنجاح!')
              if (!authData.session) {
                router.push('/auth/login?message=confirm')
              } else {
                if (typeof window !== 'undefined') sessionStorage.setItem('domobat_just_signed_up', '1')
                router.push('/dashboard?form=1')
              }
              setLoading(false)
              return
            }
          }
        }
        
        const isColumnError = errorCode === '42703' || errorCode === '42883' || errorMsg.includes('column') || errorMsg.includes('does not exist')

        if (isColumnError) {
          const profileWithoutGov = { ...profileToInsert }
          delete profileWithoutGov.governorate
          const { error: retryError, data: retryProfile } = await supabase
            .from('profiles')
            .upsert(profileWithoutGov, { onConflict: 'id' })
            .select()
            .single()

          if (retryError) {
            await supabase.auth.signOut()
            throw new Error('خطأ في قاعدة البيانات. يرجى تنفيذ ملف UPDATE_DATABASE_FULL.sql في Supabase.')
          }
          if (retryProfile) {
            toast.success('تم إنشاء الحساب (بدون الولاية - يرجى تحديث قاعدة البيانات)')
            if (!authData.session) {
              router.push('/auth/login?message=confirm')
            } else {
              if (typeof window !== 'undefined') sessionStorage.setItem('domobat_just_signed_up', '1')
              router.push('/dashboard?form=1')
            }
            setLoading(false)
            return
          }
        }

        await supabase.auth.signOut()
        throw new Error(`فشل إنشاء الملف: ${profileError.message || 'خطأ غير معروف'}. يرجى التحقق من قاعدة البيانات.`)
      }

      if (!createdProfile) {
        await supabase.auth.signOut()
        throw new Error('فشل إنشاء الملف. حاول مرة أخرى.')
      }

      toast.success('تم إنشاء الحساب بنجاح!')

      if (!authData.session) {
        toast.success('تحقق من بريدك لتفعيل الحساب قبل تسجيل الدخول.')
        router.push('/auth/login?message=confirm')
      } else {
        if (typeof window !== 'undefined') sessionStorage.setItem('domobat_just_signed_up', '1')
        router.push('/dashboard?form=1')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'فشل إنشاء الحساب. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  const LAYOUT_MAX = 'max-w-[28rem] mx-auto px-4 sm:px-5'
  const LOGO_SIZE = 120

  return (
    <div className="min-h-screen bg-gold-50 flex flex-col min-h-[100dvh]">
      <nav className="sticky top-0 z-50 bg-gold-50/95 border-b-2 border-gold-300 flex items-center min-h-[8rem] safe-top">
        <div className={`${LAYOUT_MAX} w-full flex items-center justify-between gap-3`}>
          <Link href="/" className="flex items-center shrink-0 touch-manipulation" aria-label="DOMOBAT">
            <Image src="/logo.png" alt="DOMOBAT" width={LOGO_SIZE} height={LOGO_SIZE} className="rounded-2xl w-[7.5rem] h-[7.5rem] object-contain" style={{ width: 'auto', height: 'auto' }} priority sizes="120px" />
          </Link>
          <Link href="/" className="flex items-center gap-2 min-h-[2.75rem] text-gold-900 hover:text-gold-950 text-sm font-medium touch-manipulation active:opacity-80">
            <ArrowRight className="w-4 h-4 shrink-0" />
            الرئيسية
          </Link>
        </div>
      </nav>

      <main className={`${LAYOUT_MAX} w-full pt-6 pb-28 flex-1 safe-bottom`}>
        <h1 className="text-lg font-bold text-gold-950 mb-0.5">إنشاء حساب</h1>
        <p className="text-gold-900 text-xs mb-5">المعلومات الشخصية ثم التحقق ثم كلمة المرور</p>

        <div className="w-full bg-gold-200 rounded-full h-1 mb-6">
          <div className="bg-gold-600 h-1 rounded-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        <div className="space-y-5 mb-6">
          {step === 1 && (
            <form onSubmit={async (e) => { 
              e.preventDefault()
              if (cinExists || phoneTaken) {
                toast.error('يرجى إصلاح الأخطاء قبل المتابعة')
                return
              }
              if (!name || !phone || !cin || !governorate) {
                toast.error('املأ جميع الحقول المطلوبة')
                return
              }
              await sendVerificationCode()
            }} className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                <div>
                  <label htmlFor="name" className="block text-xs font-medium text-gold-900 mb-1">الاسم الكامل *</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full min-h-[2.75rem] px-4 py-3 rounded-xl border-2 border-gold-300 bg-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 outline-none text-base placeholder:text-gold-400 touch-manipulation"
                    placeholder="أدخل اسمك الكامل"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-medium text-gold-900 mb-1">رقم الهاتف *</label>
                  <div className="relative">
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={async (e) => {
                        const value = e.target.value
                        setPhone(value)
                        setPhoneTaken(false)
                        if (value.trim().length >= 8) {
                          setCheckingPhone(true)
                          try {
                            const res = await fetch('/api/auth/check-phone', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ phone: value.trim() }),
                            })
                            const data = await res.json()
                            if (data.taken) setPhoneTaken(true)
                          } catch {
                            // ignore; keep phoneTaken false
                          } finally {
                            setCheckingPhone(false)
                          }
                        }
                      }} 
                      className={`w-full min-h-[2.75rem] px-4 py-3 rounded-xl border bg-white focus:ring-2 focus:ring-gold-400/40 focus:border-gold-500 outline-none text-base placeholder:text-gold-400 touch-manipulation ${phoneTaken ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gold-300'}`}
                      placeholder="+216 XX XXX XXX"
                      required
                    />
                    {checkingPhone && (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <div className="spinner w-4 h-4 text-gold-600"></div>
                      </div>
                    )}
                  </div>
                  {phoneTaken && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                      <span>⚠️</span>
                      رقم الهاتف مسجّل مسبقاً
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="cin" className="block text-xs font-medium text-gold-900 mb-1">رقم بطاقة التعريف (CIN) *</label>
                  <div className="relative">
                    <input
                      id="cin"
                      type="text"
                      value={cin}
                      onChange={async (e) => {
                        const value = e.target.value.trim()
                        setCin(value)
                        setCinExists(false)
                        if (value && value.length >= 4) {
                          setCheckingCin(true)
                          try {
                            const { data: existingProfile } = await supabase
                              .from('profiles')
                              .select('id')
                              .eq('cin', value)
                              .maybeSingle()
                            if (existingProfile) {
                              setCinExists(true)
                            }
                          } catch {}
                          finally { setCheckingCin(false) }
                        }
                      }} 
                      className={`w-full min-h-[2.75rem] px-4 py-3 rounded-xl border bg-white focus:ring-2 focus:ring-gold-400/40 focus:border-gold-500 outline-none text-base placeholder:text-gold-400 touch-manipulation ${cinExists ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gold-300'}`}
                      placeholder="رقم البطاقة"
                      required
                    />
                    {checkingCin && (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <div className="spinner w-4 h-4 text-gold-600"></div>
                      </div>
                    )}
                  </div>
                  {cinExists && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                      <span>⚠️</span>
                      رقم بطاقة التعريف مسجّل مسبقاً
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="governorate" className="block text-xs font-medium text-gold-900 mb-1">الولاية *</label>
                  <select
                    id="governorate"
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="w-full min-h-[2.75rem] px-4 py-3 rounded-xl border-2 border-gold-300 bg-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 outline-none text-base text-gold-900 touch-manipulation"
                    required
                  >
                    <option value="">اختر الولاية</option>
                    {tunisianGovernorates.map((gov) => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phoneTaken || checkingPhone || cinExists || checkingCin}
                className="w-full min-h-[2.75rem] py-3.5 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 text-white text-sm font-medium shadow-md hover:shadow-lg hover:from-gold-500 hover:to-gold-700 active:scale-[0.99] transition-all disabled:opacity-50 touch-manipulation"
              >
                {loading
                  ? <span className="spinner mx-auto" />
                  : checkingPhone || checkingCin
                    ? 'جاري التحقق...'
                    : phoneTaken || cinExists
                      ? 'يرجى إصلاح الأخطاء'
                      : 'التالي: إرسال رمز التحقق'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); verifyCode(); }} className="space-y-4">
              <p className="text-xs text-gold-900">تم إرسال رمز من 6 أرقام إلى <span className="font-medium text-gold-950">{phone}</span></p>
              <div>
                <label htmlFor="code" className="block text-xs font-medium text-gold-900 mb-1">رمز التحقق</label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full min-h-[2.75rem] px-4 py-3 rounded-xl border-2 border-gold-300 bg-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 outline-none text-base text-center text-2xl font-bold tracking-[0.4em] touch-manipulation"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 min-h-[2.75rem] py-2.5 rounded-xl border-2 border-gold-300 bg-white text-gold-900 text-sm font-medium hover:bg-gold-50 active:scale-[0.99] touch-manipulation">
                  رجوع
                </button>
                <button type="submit" disabled={loading} className="flex-1 min-h-[2.75rem] py-2.5 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 text-white text-sm font-medium hover:from-gold-500 hover:to-gold-700 disabled:opacity-50 active:scale-[0.99] transition-all touch-manipulation">
                  {loading ? <span className="spinner mx-auto" /> : 'تحقق'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleRegister} className="space-y-4">
              <p className="text-xs text-gold-900 mb-2">اختر كلمة مرور (6 أحرف على الأقل)</p>
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gold-900 mb-1">كلمة المرور *</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[2.75rem] px-4 py-3 rounded-xl border-2 border-gold-300 bg-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 outline-none text-base placeholder:text-gold-400 touch-manipulation"
                  placeholder="6 أحرف على الأقل"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-gold-900 mb-1">تأكيد كلمة المرور *</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full min-h-[2.75rem] px-4 py-3 rounded-xl border-2 border-gold-300 bg-white focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 outline-none text-base placeholder:text-gold-400 touch-manipulation"
                  placeholder="أعد إدخال كلمة المرور"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 min-h-[2.75rem] py-2.5 rounded-xl border-2 border-gold-300 bg-white text-gold-900 text-sm font-medium hover:bg-gold-50 active:scale-[0.99] touch-manipulation">
                  رجوع
                </button>
                <button type="submit" disabled={loading} className="flex-1 min-h-[2.75rem] py-2.5 rounded-xl bg-gradient-to-b from-gold-400 to-gold-600 text-white text-sm font-medium hover:from-gold-500 hover:to-gold-700 disabled:opacity-50 active:scale-[0.99] transition-all touch-manipulation">
                  {loading ? <span className="spinner mx-auto" /> : 'إنشاء الحساب'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm sm:text-base text-gold-950 pb-4 pt-2">
          <span className="font-medium">لديك حساب؟</span>{' '}
          <Link href="/auth/login" className="font-bold text-gold-700 underline underline-offset-2 decoration-2 hover:text-gold-900 decoration-gold-600">تسجيل الدخول</Link>
        </p>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-gold-600 to-gold-700 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.12)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
        <Link href="/auth/login" className="flex items-center justify-center w-full min-h-[3rem] py-3.5 text-white text-base font-semibold bg-gradient-to-t from-gold-600 to-gold-700 hover:from-gold-500 hover:to-gold-600 active:from-gold-700 active:to-gold-800 transition-all touch-manipulation safe-bottom">
          لديك حساب؟ تسجيل الدخول
        </Link>
      </div>
      <div className="h-16 shrink-0" aria-hidden="true" />
    </div>
  )
}
