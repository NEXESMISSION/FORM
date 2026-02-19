'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowRight, CheckCircle2, User, Mail, Phone, Shield, Lock, MapPin, FileText } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cin, setCin] = useState('')
  const [governorate, setGovernorate] = useState('')
  const [emailExists, setEmailExists] = useState(false)
  const [cinExists, setCinExists] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
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
    { num: 2, title: 'إرسال رمز التحقق', icon: Phone },
    { num: 3, title: 'التحقق من الهاتف', icon: Shield },
    { num: 4, title: 'كلمة المرور', icon: Lock },
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
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, phone_number')
        .eq('phone_number', formattedPhone)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking phone number:', checkError)
      }

      if (existingProfile) {
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
        throw new Error(data.error || 'Failed to send verification code')
      }

      setPhone(formattedPhone)
      toast.success('تم إرسال رمز التحقق. تحقق من هاتفك.')
      setStep(3)
    } catch (error: any) {
      console.error('SMS error:', error)
      toast.error(error.message || 'فشل إرسال رمز التحقق. حاول مرة أخرى.')
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
      setStep(4)
    } catch (error: any) {
      toast.error(error.message || 'رمز التحقق غير صحيح')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !email || !phone || !cin || !governorate) {
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

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, phone_number')
        .eq('phone_number', formattedPhone)
        .maybeSingle()

      if (existingProfile) {
        throw new Error('رقم الهاتف مسجّل مسبقاً. استخدم رقماً آخر أو سجّل الدخول.')
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
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
          throw new Error('البريد الإلكتروني مسجّل مسبقاً. سجّل الدخول بدلاً من ذلك.')
        } else if (authError.message?.includes('Invalid email')) {
          throw new Error('أدخل بريداً إلكترونياً صحيحاً.')
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
        role: role,
        country: 'Tunisia', // Always Tunisia
      }

      // Add optional fields safely
      if (name?.trim()) profileToInsert.name = name.trim()
      if (email?.trim()) profileToInsert.email = email.trim()
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
            // Another user has this phone number
            await supabase.auth.signOut()
            throw new Error('رقم الهاتف مسجّل مسبقاً. استخدم رقماً آخر أو سجّل الدخول.')
          } else {
            // Same user, profile might already exist - try to fetch it
            const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single()
            
            if (existingProfile && !fetchError) {
              // Profile exists, continue with registration
              toast.success('تم إنشاء الحساب بنجاح!')
              if (!authData.session) {
                router.push('/auth/login?message=confirm')
              } else {
                router.push('/dashboard/applicant?form=1')
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
              router.push('/dashboard/applicant?form=1')
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
        router.push('/dashboard/applicant?form=1')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'فشل إنشاء الحساب. حاول مرة أخرى.')
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
          <Image src="/logo.png" alt="DOMOBAT" width={112} height={112} className="rounded-2xl" style={{ width: 'auto', height: 'auto' }} priority />
          <div className="w-20"></div>
        </div>
      </nav>

      <main className="max-w-[28rem] mx-auto px-5 pt-12 pb-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">إنشاء حساب جديد</h1>
          <p className="text-gray-600 text-base">ابدأ رحلتك نحو السكن الاقتصادي</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-12">
          <div className="relative flex items-start justify-between mb-8">
            {steps.map((s, idx) => {
              const Icon = s.icon
              const isActive = step === s.num
              const isCompleted = step > s.num
              return (
                <div key={s.num} className="relative flex flex-col items-center flex-1 z-10">
                  {idx < steps.length - 1 && (
                    <div className={`absolute top-7 left-1/2 w-full h-0.5 transition-all duration-300 ${
                      step > s.num ? 'bg-primary-600' : 'bg-gray-200'
                    }`} style={{ width: 'calc(100% - 3rem)' }}></div>
                  )}
                  <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 mb-4 ${
                    isCompleted 
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' 
                      : isActive 
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-110' 
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : (
                      <Icon className="w-7 h-7" />
                    )}
                  </div>
                  <span className={`text-xs font-medium text-center leading-relaxed px-1 ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                    {s.title}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-2">
            <div 
              className="bg-gradient-to-r from-primary-600 to-primary-500 h-2 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-6">
          {step === 1 && (
            <form onSubmit={async (e) => { 
              e.preventDefault()
              if (emailExists || cinExists) {
                toast.error('يرجى إصلاح الأخطاء قبل المتابعة')
                return
              }
              if (!name || !email || !phone || !cin || !governorate) {
                toast.error('املأ جميع الحقول المطلوبة')
                return
              }
              setStep(2)
            }} className="space-y-5 animate-fade-in">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="form-label flex items-center gap-2">
                    <User className="w-4 h-4 text-primary-600" />
                    الاسم الكامل *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    placeholder="أدخل اسمك الكامل"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="form-label flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary-600" />
                    البريد الإلكتروني *
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={async (e) => {
                        const value = e.target.value.trim()
                        setEmail(value)
                        setEmailExists(false)
                        if (value && value.includes('@')) {
                          setCheckingEmail(true)
                          try {
                            const { data: existingProfile } = await supabase
                              .from('profiles')
                              .select('id')
                              .eq('email', value)
                              .maybeSingle()
                            if (existingProfile) {
                              setEmailExists(true)
                            }
                          } catch {}
                          finally { setCheckingEmail(false) }
                        }
                      }}
                      className={`form-input ${emailExists ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="your.email@example.com"
                      required
                    />
                    {checkingEmail && (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <div className="spinner w-4 h-4 text-primary-600"></div>
                      </div>
                    )}
                  </div>
                  {emailExists && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <span>⚠️</span>
                      البريد الإلكتروني مسجّل مسبقاً. سجّل الدخول بدلاً من ذلك.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="form-label flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary-600" />
                    رقم الهاتف *
                  </label>
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
                            let formattedPhone = value.trim()
                            if (!formattedPhone.startsWith('+')) {
                              if (formattedPhone.startsWith('216')) {
                                formattedPhone = '+' + formattedPhone
                              } else if (formattedPhone.startsWith('0')) {
                                formattedPhone = '+216' + formattedPhone.substring(1)
                              } else {
                                formattedPhone = '+216' + formattedPhone
                              }
                            }
                            const { data: existingProfile } = await supabase
                              .from('profiles')
                              .select('id')
                              .eq('phone_number', formattedPhone)
                              .maybeSingle()
                            if (existingProfile) setPhoneTaken(true)
                          } catch {}
                          finally { setCheckingPhone(false) }
                        }
                      }}
                      className={`form-input ${phoneTaken ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="+216 XX XXX XXX"
                      required
                    />
                    {checkingPhone && (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <div className="spinner w-4 h-4 text-primary-600"></div>
                      </div>
                    )}
                  </div>
                  {phoneTaken && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <span>⚠️</span>
                      رقم الهاتف مسجّل مسبقاً
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="cin" className="form-label flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-600" />
                    رقم بطاقة التعريف (CIN) *
                  </label>
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
                      className={`form-input ${cinExists ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="رقم البطاقة"
                      required
                    />
                    {checkingCin && (
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <div className="spinner w-4 h-4 text-primary-600"></div>
                      </div>
                    )}
                  </div>
                  {cinExists && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <span>⚠️</span>
                      رقم بطاقة التعريف مسجّل مسبقاً
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="governorate" className="form-label flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    الولاية *
                  </label>
                  <select
                    id="governorate"
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="form-input"
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
                disabled={phoneTaken || checkingPhone || emailExists || cinExists || checkingEmail || checkingCin}
                className="btn-primary py-4 text-base font-bold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all disabled:opacity-50"
              >
                {checkingPhone || checkingEmail || checkingCin 
                  ? 'جاري التحقق...' 
                  : phoneTaken || emailExists || cinExists
                    ? 'يرجى إصلاح الأخطاء'
                    : 'التالي: إرسال رمز التحقق'}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">إرسال رمز التحقق</h3>
                <p className="text-sm text-gray-600 mb-1">سنرسل رمز التحقق إلى:</p>
                <p className="text-base font-semibold text-primary-600">{phone}</p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); sendVerificationCode(); }} className="space-y-4">
                <button type="submit" disabled={loading} className="btn-primary py-4 text-base font-bold shadow-lg">
                  {loading ? <span className="spinner mx-auto" /> : 'إرسال رمز التحقق'}
                </button>
                <button type="button" onClick={() => setStep(1)} className="btn-secondary py-3">
                  رجوع
                </button>
              </form>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={(e) => { e.preventDefault(); verifyCode(); }} className="space-y-5 animate-fade-in">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">التحقق من الهاتف</h3>
                <p className="text-sm text-gray-600">تم إرسال رمز من 6 أرقام إلى:</p>
                <p className="text-base font-semibold text-primary-600 mb-4">{phone}</p>
              </div>
              <div>
                <label htmlFor="code" className="form-label text-center block mb-3">رمز التحقق</label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="form-input text-center text-3xl font-bold tracking-[0.5em]"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 py-3">
                  رجوع
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 text-base font-bold shadow-lg">
                  {loading ? <span className="spinner mx-auto" /> : 'تحقق'}
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <form onSubmit={handleRegister} className="space-y-5 animate-fade-in">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">إنشاء كلمة المرور</h3>
                <p className="text-sm text-gray-600">اختر كلمة مرور قوية لحماية حسابك</p>
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
                  placeholder="6 أحرف على الأقل"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="form-label">تأكيد كلمة المرور *</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  placeholder="أعد إدخال كلمة المرور"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="btn-secondary flex-1 py-3">
                  رجوع
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 text-base font-bold shadow-lg">
                  {loading ? <span className="spinner mx-auto" /> : 'إنشاء الحساب'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-gray-600 text-sm">
          لديك حساب؟{' '}
          <Link href="/auth/login" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
            تسجيل الدخول
          </Link>
        </p>
      </main>
    </div>
  )
}
