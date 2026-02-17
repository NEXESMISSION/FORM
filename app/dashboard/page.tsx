'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { FileText, Home, TrendingUp, LogOut, User, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const hasRedirected = useRef(false)

  useEffect(() => {
    checkUser()
  }, [])

  // Redirect based on role after profile is loaded
  useEffect(() => {
    if (!loading && profile && !hasRedirected.current) {
      const role = profile.role
      if (role === 'applicant' || role === 'admin') {
        hasRedirected.current = true
        setTimeout(() => {
          if (role === 'applicant') {
            router.replace('/dashboard/applicant')
          } else if (role === 'admin') {
            router.replace('/dashboard/admin')
          }
        }, 0)
      }
    }
  }, [profile, loading, router])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      // Get profile (use maybeSingle so 0 rows returns null instead of error)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        toast.error('تعذر تحميل الملف الشخصي. حدّث الصفحة أو تواصل مع الدعم.')
        return
      }

      if (profileData) {
        setProfile(profileData)
        return
      }

      // No profile row for this user — try to create one (phone_number is NOT NULL in DB)
      const phone = user.user_metadata?.phone_number || user.phone || ''
      const profileToInsert = {
        id: user.id,
        phone_number: phone || `+216000000000-${user.id}`,
        email: user.email || '',
        role: (user.user_metadata?.role as any) || 'applicant',
      }

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert(profileToInsert)
        .select()
        .maybeSingle()

      if (!createError && newProfile) {
        setProfile(newProfile)
        return
      }

      if (createError?.code === '23505') {
        const msg = (createError.message || '').toLowerCase()
        const isDuplicatePhone = msg.includes('phone_number') || msg.includes('profiles_phone_number_key')

        if (isDuplicatePhone) {
          toast.error('رقم الهاتف هذا مرتبط بحساب آخر. سجّل الدخول بالحساب المرتبط بهذا الرقم أو تواصل مع الدعم.')
          // Try unique placeholder so this session can still use the app (one profile per auth user)
          const placeholderPhone = `+216000000000-${user.id}`
          const { data: fallbackProfile, error: fallbackError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              phone_number: placeholderPhone,
              email: user.email || '',
              role: (user.user_metadata?.role as any) || 'applicant',
            })
            .select()
            .maybeSingle()

          if (!fallbackError && fallbackProfile) {
            setProfile(fallbackProfile)
            toast.success('تم إنشاء ملف شخصي مؤقت لهذه الجلسة. يفضّل توحيد الحسابات مع الدعم.')
            return
          }
        }

        // Duplicate primary key: profile might have been created by trigger — fetch again
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (existingProfile) {
          setProfile(existingProfile)
          return
        }
      }

      toast.error('تعذر إنشاء الملف الشخصي. تواصل مع الدعم.')
    } catch (error: any) {
      console.error('Dashboard error:', error)
      toast.error(error.message || 'Failed to load profile')
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    )
  }

  // Show loading while redirecting
  if (profile.role === 'applicant' || profile.role === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to Domobat</h1>
          <p className="text-gray-600">Please select your role</p>
        </div>
      </div>
    </div>
  )
}
