'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Save, ArrowRight, ArrowLeft, Mic, MicOff, Trash2 } from 'lucide-react'

const STORAGE_KEY_PREFIX = 'housing_form_draft_'

// ولايات تونس الـ 24 (للعنوان الحالي)
const TUNISIAN_GOVERNORATES = [
  'أريانة', 'باجة', 'بن عروس', 'بنزرت', 'قابس', 'قفصة', 'جندوبة', 'القيروان', 'القصرين', 'قبلي', 'الكاف', 'المهدية', 'منوبة', 'مدنين', 'المنستير', 'نابل', 'صفاقس', 'سيدي بوزيد', 'سليانة', 'سوسة', 'تطاوين', 'توزر', 'تونس', 'زغوان',
]

// Form data type for استمارة برنامج السكن الاقتصادي السريع
export interface HousingFormData {
  // 1 المعطيات الشخصية
  full_name?: string
  national_id?: string
  date_of_birth?: string
  marital_status?: string
  family_count?: number
  children_ages?: string
  phone?: string
  email?: string
  current_address?: string

  // 2 الوضعية المهنية
  employment_status?: string // موظف قار، بعقد، عامل حر، صاحب مشروع، عاطل
  work_sector?: string // عمومي / خاص / غير منظم
  skills?: string // المهارات
  net_monthly_income?: number
  income_stable?: string // نعم / لا
  extra_income?: string

  // 3 الوضعية المالية
  has_financial_obligations?: string // نعم / لا
  total_monthly_obligations?: number
  max_monthly_payment?: number
  can_save_20_percent?: string // نعم / لا / جزئياً
  down_payment_value?: number

  // 4 الوضعية السكنية الحالية
  current_housing_type?: string // كراء، ملك، سكن عائلي، بدون سكن قار
  current_residence_duration?: string
  current_rent_value?: number
  housing_problems?: string[] // غلاء الكراء، ضيق المساحة، إلخ

  // 5 العقار
  owns_land?: string // نعم / لا
  // إذا نعم (مسار أرض المواطن):
  land_location?: string
  land_address_gps?: string
  land_area_sqm?: number
  land_nature?: string // داخل بلدية، خارج بلدية، فلاحية
  land_ownership_type?: string // ملك شخصي، مشترك، في طور التسوية
  land_registered?: string
  has_ownership_doc?: string
  has_building_permit?: string
  company_handle_permit?: string
  land_legal_issues?: string
  desired_housing_type_land?: string // اقتصادي أساسي/متوسط/مريح
  custom_design_or_ready?: string
  rooms_count_land?: number
  want_future_floor?: string
  service_type?: string // Gros œuvre, تشطيب متوسط, Clé en main
  pay_down_direct?: string
  want_installment_building_only?: string
  installment_years_land?: string // 5,10,15,20
  // إذا لا (مسار شراء أرض + بناء):
  company_provide_full_property?: string

  // 6 نموذج السكن المطلوب
  housing_type_model?: string // APARTMENT, VILLA, etc.
  housing_individual_collective?: string // فردي / جماعي
  housing_area?: string // 60, 80, 100, custom
  housing_area_custom?: number // Custom area value
  housing_model?: string // 60, 80, 100 m² (kept for backward compatibility)
  accept_area_adjustment?: string
  desired_total_area?: string // المساحة الجملية المرغوبة
  number_of_rooms?: string // عدد الغرف المطلوبة
  additional_components?: string[] // مكونات إضافية مرغوبة
  housing_purpose?: string // الهدف من السكن

  // 7 مدة التقسيط
  payment_type?: string // تقسيط / دفع كامل
  payment_percentage?: number // النسبة المدفوعة (1%-...)
  installment_period?: string // 5, 10, 15, 20, 25 سنوات

  // 8 الشراكة مع الدولة
  agree_state_referral?: string
  previous_social_housing?: string
  registered_social_affairs?: string
  accept_social_economic_housing?: string
  accept_followup_via_platform?: string

  // 9 معلومات إضافية
  additional_info?: string
  additional_info_type?: string // نص / صوت
  additional_info_voice_url?: string // رابط التسجيل الصوتي
}

const TOTAL_SECTIONS = 11

function getStorageKey(userId: string | null): string {
  return `${STORAGE_KEY_PREFIX}${userId || 'guest'}`
}

export default function HousingApplicationForm() {
  const router = useRouter()
  const formTopRef = useRef<HTMLDivElement>(null)
  const [currentSection, setCurrentSection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<HousingFormData>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [hydrationDone, setHydrationDone] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingStreamRef = useRef<MediaStream | null>(null)
  
  // Refs for form fields to focus on validation errors
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement | null>>({})

  // Load draft from localStorage on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const uid = user?.id || null
        setUserId(uid)
        const key = getStorageKey(uid)
        const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { formData?: Partial<HousingFormData>; currentSection?: number }
            if (parsed.formData) setFormData(parsed.formData)
            if (typeof parsed.currentSection === 'number' && parsed.currentSection >= 1 && parsed.currentSection <= TOTAL_SECTIONS) {
              setCurrentSection(parsed.currentSection)
            }
          } catch (_) {}
        }
      } catch (_) {}
      setHydrationDone(true)
    }
    loadDraft()
  }, [])

  // Persist draft to localStorage (formData + currentSection + last answer)
  const saveDraft = useCallback(() => {
    if (!hydrationDone || typeof window === 'undefined') return
    const key = getStorageKey(userId)
    try {
      localStorage.setItem(key, JSON.stringify({
        formData,
        currentSection,
        lastSaved: new Date().toISOString(),
      }))
    } catch (_) {}
  }, [formData, currentSection, userId, hydrationDone])

  useEffect(() => {
    if (!hydrationDone) return
    saveDraft()
  }, [formData, currentSection, hydrationDone, saveDraft])

  // Save on page close/refresh
  useEffect(() => {
    if (!hydrationDone) return
    const onBeforeUnload = () => saveDraft()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveDraft, hydrationDone])

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [mediaRecorder])

  const updateFormData = (field: keyof HousingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Comprehensive validation function
  const validateForm = (): { isValid: boolean; section: number; field: string; message: string } => {
    // Section 1: المعطيات الشخصية
    if (!(formData.full_name || '').trim()) {
      return { isValid: false, section: 1, field: 'full_name', message: 'يرجى إدخال الاسم واللقب' }
    }
    if (!(formData.current_address || '').trim()) {
      return { isValid: false, section: 1, field: 'current_address', message: 'يرجى اختيار الولاية' }
    }
    if (!(formData.national_id || '').trim()) {
      return { isValid: false, section: 1, field: 'national_id', message: 'يرجى إدخال رقم بطاقة التعريف الوطنية' }
    }
    if (!formData.date_of_birth) {
      return { isValid: false, section: 1, field: 'date_of_birth', message: 'يرجى إدخال تاريخ الولادة' }
    }
    if (!formData.marital_status) {
      return { isValid: false, section: 1, field: 'marital_status', message: 'يرجى اختيار الحالة الاجتماعية' }
    }
    if (formData.family_count === undefined || formData.family_count === null) {
      return { isValid: false, section: 1, field: 'family_count', message: 'يرجى إدخال عدد أفراد العائلة' }
    }
    if (!(formData.phone || '').trim()) {
      return { isValid: false, section: 1, field: 'phone', message: 'يرجى إدخال رقم الهاتف' }
    }
    // Email validation - check if we have email in form or will get from auth
    // We'll validate this in handleSubmit since we need user object

    // Section 2: الوضعية المهنية
    if (!formData.employment_status) {
      return { isValid: false, section: 2, field: 'employment_status', message: 'يرجى اختيار الوضعية المهنية' }
    }
    if (!formData.work_sector) {
      return { isValid: false, section: 2, field: 'work_sector', message: 'يرجى اختيار قطاع العمل' }
    }
    if (formData.net_monthly_income === undefined || formData.net_monthly_income === null) {
      return { isValid: false, section: 2, field: 'net_monthly_income', message: 'يرجى إدخال الدخل الشهري الصافي' }
    }
    if (!formData.income_stable) {
      return { isValid: false, section: 2, field: 'income_stable', message: 'يرجى الإجابة عن سؤال استقرار الدخل' }
    }

    // Section 3: الوضعية المالية
    if (!formData.has_financial_obligations) {
      return { isValid: false, section: 3, field: 'has_financial_obligations', message: 'يرجى الإجابة عن سؤال الالتزامات المالية' }
    }
    // Only require total_monthly_obligations if user has obligations
    if (formData.has_financial_obligations === 'نعم') {
      if (formData.total_monthly_obligations === undefined || formData.total_monthly_obligations === null || formData.total_monthly_obligations < 0) {
        return { isValid: false, section: 3, field: 'total_monthly_obligations', message: 'يرجى إدخال قيمة الالتزامات الشهرية' }
      }
    }
    if (formData.max_monthly_payment === undefined || formData.max_monthly_payment === null) {
      return { isValid: false, section: 3, field: 'max_monthly_payment', message: 'يرجى إدخال القدرة القصوى على الدفع الشهري' }
    }
    if (!formData.can_save_20_percent) {
      return { isValid: false, section: 3, field: 'can_save_20_percent', message: 'يرجى الإجابة عن سؤال التسبقة' }
    }

    // Section 4: الوضعية السكنية الحالية
    if (!formData.current_housing_type) {
      return { isValid: false, section: 4, field: 'current_housing_type', message: 'يرجى اختيار نوع السكن الحالي' }
    }

    // Section 5: العقار
    if (!formData.owns_land) {
      return { isValid: false, section: 5, field: 'owns_land', message: 'يرجى الإجابة عن سؤال ملكية الأرض' }
    }
    if (formData.owns_land === 'نعم') {
      if (!(formData.land_location || '').trim()) {
        return { isValid: false, section: 5, field: 'land_location', message: 'يرجى إدخال موقع الأرض' }
      }
      if (formData.land_area_sqm === undefined || formData.land_area_sqm === null) {
        return { isValid: false, section: 5, field: 'land_area_sqm', message: 'يرجى إدخال مساحة الأرض' }
      }
      if (!formData.land_nature) {
        return { isValid: false, section: 5, field: 'land_nature', message: 'يرجى اختيار طبيعة الأرض' }
      }
      if (!formData.land_ownership_type) {
        return { isValid: false, section: 5, field: 'land_ownership_type', message: 'يرجى اختيار نوع الملكية' }
      }
    }

    // Section 6: نموذج السكن المطلوب
    if (!formData.housing_type_model) {
      return { isValid: false, section: 6, field: 'housing_type_model', message: 'يرجى اختيار نوع السكن' }
    }
    if (!formData.housing_individual_collective) {
      return { isValid: false, section: 6, field: 'housing_individual_collective', message: 'يرجى اختيار النوع (فردي/جماعي)' }
    }
    if (!formData.housing_area && !formData.housing_model) {
      return { isValid: false, section: 6, field: 'housing_area', message: 'يرجى اختيار المساحة الجملية المرغوبة' }
    }
    if (formData.housing_area === 'custom' && (formData.housing_area_custom === undefined || formData.housing_area_custom === null)) {
      return { isValid: false, section: 6, field: 'housing_area_custom', message: 'يرجى إدخال المساحة المخصصة' }
    }

    // Section 7: مدة التقسيط
    if (!formData.payment_type) {
      return { isValid: false, section: 7, field: 'payment_type', message: 'يرجى اختيار نوع الدفع' }
    }
    if (formData.payment_type === 'تقسيط' && !formData.installment_period) {
      return { isValid: false, section: 7, field: 'installment_period', message: 'يرجى اختيار مدة التقسيط' }
    }

    return { isValid: true, section: 0, field: '', message: '' }
  }

  const focusField = (fieldName: string, section: number) => {
    // Navigate to the section first
    setCurrentSection(section)
    
    // Scroll to top and then focus the field
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      
      // Focus the field after a short delay to ensure it's rendered
      setTimeout(() => {
        const fieldElement = fieldRefs.current[fieldName]
        if (!fieldElement) return
        
        // For input/select/textarea elements, focus them
        if (fieldElement instanceof HTMLInputElement || fieldElement instanceof HTMLSelectElement || fieldElement instanceof HTMLTextAreaElement) {
          fieldElement.focus()
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Add a visual highlight
          fieldElement.style.borderColor = '#ef4444'
          fieldElement.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)'
          setTimeout(() => {
            fieldElement.style.borderColor = ''
            fieldElement.style.boxShadow = ''
          }, 3000)
        } else {
          // For div elements (radio button groups), just scroll to them
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Add a visual highlight to the container
          const originalBorder = fieldElement.style.border
          const originalBoxShadow = fieldElement.style.boxShadow
          fieldElement.style.border = '2px solid #ef4444'
          fieldElement.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)'
          setTimeout(() => {
            fieldElement.style.border = originalBorder
            fieldElement.style.boxShadow = originalBoxShadow
          }, 3000)
        }
      }, 300)
    }, 100)
  }

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      router.push('/auth/login')
      return
    }

    // Comprehensive validation
    const validation = validateForm()
    if (!validation.isValid) {
      focusField(validation.field, validation.section)
      toast.error(validation.message)
      return
    }

    setLoading(true)
    try {
      const maritalMap: Record<string, string> = { أعزب: 'single', متزوج: 'married', مطلق: 'divorced', أرمل: 'widowed' }
      const first = (formData.full_name || '').trim().split(/\s+/)[0] || ''
      const last = (formData.full_name || '').trim().split(/\s+/).slice(1).join(' ') || ''

      // Calculate required_area from new fields or old field
      let requiredArea: number | null = null
      if (formData.housing_area_custom) {
        requiredArea = formData.housing_area_custom
      } else if (formData.housing_area && formData.housing_area !== 'custom') {
        requiredArea = parseInt(formData.housing_area, 10)
      } else if (formData.housing_model) {
        requiredArea = parseInt(formData.housing_model, 10)
      }

      // Get user email from auth if not provided in form
      const userEmail = formData.email?.trim() || user.email || ''
      if (!userEmail) {
        toast.error('يرجى إدخال البريد الإلكتروني')
        focusField('email', 1)
        setLoading(false)
        return
      }

      const payload: any = {
        user_id: user.id,
        status: 'in_progress',
        first_name: first || '—',
        last_name: last || '—',
        national_id: formData.national_id || '',
        date_of_birth: formData.date_of_birth || new Date().toISOString().slice(0, 10),
        email: userEmail,
        phone: formData.phone || null,
        marital_status: (formData.marital_status && maritalMap[formData.marital_status]) ? maritalMap[formData.marital_status] : 'single',
        number_of_children: formData.family_count ?? 0,
        family_count: formData.family_count ?? 0,
        children_ages: formData.children_ages || null,
        current_address: formData.current_address || '', // Required field
        governorate: formData.current_address || '', // Also set governorate for compatibility
        net_monthly_income: formData.net_monthly_income ?? null,
        // Set total_monthly_obligations to 0 if user has no obligations, null otherwise
        total_monthly_obligations: formData.has_financial_obligations === 'لا' 
          ? 0 
          : (formData.total_monthly_obligations ?? null),
        desired_housing_type: 'apartment' as const,
        maximum_budget: formData.max_monthly_payment ?? null,
        required_area: requiredArea,
        // Section 2 fields
        employment_status: formData.employment_status || null,
        work_sector: formData.work_sector || null,
        skills: formData.skills || null,
        income_stable: formData.income_stable || null,
        extra_income: formData.extra_income || null,
        // Section 3 fields
        has_financial_obligations: formData.has_financial_obligations || null,
        max_monthly_payment: formData.max_monthly_payment ?? null,
        can_save_20_percent: formData.can_save_20_percent || null,
        down_payment_value: formData.down_payment_value ?? null,
        // Section 4 fields
        current_housing_type: formData.current_housing_type || null,
        current_residence_duration: formData.current_residence_duration || null,
        current_rent_value: formData.current_rent_value ?? null,
        housing_problems: formData.housing_problems || [],
        // Section 5 fields
        owns_land: formData.owns_land || null,
        land_location: formData.land_location || null,
        land_address_gps: formData.land_address_gps || null,
        land_area_sqm: formData.land_area_sqm ?? null,
        land_nature: formData.land_nature || null,
        land_ownership_type: formData.land_ownership_type || null,
        land_registered: formData.land_registered || null,
        has_ownership_doc: formData.has_ownership_doc || null,
        has_building_permit: formData.has_building_permit || null,
        company_handle_permit: formData.company_handle_permit || null,
        land_legal_issues: formData.land_legal_issues || null,
        desired_housing_type_land: formData.desired_housing_type_land || null,
        custom_design_or_ready: formData.custom_design_or_ready || null,
        rooms_count_land: formData.rooms_count_land ?? null,
        want_future_floor: formData.want_future_floor || null,
        service_type: formData.service_type || null,
        pay_down_direct: formData.pay_down_direct || null,
        want_installment_building_only: formData.want_installment_building_only || null,
        installment_years_land: formData.installment_years_land || null,
        company_provide_full_property: formData.company_provide_full_property || null,
        // Section 6 fields
        housing_type_model: formData.housing_type_model || null,
        housing_individual_collective: formData.housing_individual_collective || null,
        housing_area: formData.housing_area || null,
        housing_area_custom: formData.housing_area_custom ?? null,
        housing_model: formData.housing_model || null,
        accept_area_adjustment: formData.accept_area_adjustment || null,
        desired_total_area: formData.desired_total_area || null,
        number_of_rooms: formData.number_of_rooms || null,
        additional_components: formData.additional_components || [],
        housing_purpose: formData.housing_purpose || null,
        // Section 7 fields
        payment_type: formData.payment_type || null,
        payment_percentage: formData.payment_percentage ?? null,
        installment_period: formData.installment_period || null,
        // Section 8 fields
        agree_state_referral: formData.agree_state_referral || null,
        previous_social_housing: formData.previous_social_housing || null,
        registered_social_affairs: formData.registered_social_affairs || null,
        accept_social_economic_housing: formData.accept_social_economic_housing || null,
        accept_followup_via_platform: formData.accept_followup_via_platform || null,
        // Section 9 fields
        additional_info: formData.additional_info || null,
        additional_info_type: formData.additional_info_type || null,
        additional_info_voice_url: formData.additional_info_voice_url || null,
      }

      const { data: inserted, error } = await supabase
        .from('housing_applications')
        .insert(payload)
        .select()
        .single()

      if (error) {
        console.error('Application submission error:', error)
        
        // Parse error to find which field is missing
        let errorMessage = 'فشل إرسال الطلب'
        let errorSection = 1
        let errorField = ''
        
        if (error.message) {
          // Check for common database constraint errors
          if (error.message.includes('current_address') || error.message.includes('governorate')) {
            errorMessage = 'يرجى اختيار الولاية'
            errorSection = 1
            errorField = 'current_address'
          } else if (error.message.includes('email')) {
            errorMessage = 'يرجى إدخال البريد الإلكتروني'
            errorSection = 1
            errorField = 'email'
          } else if (error.message.includes('total_monthly_obligations') || error.message.includes('monthly_obligations')) {
            errorMessage = 'يرجى إدخال قيمة الالتزامات الشهرية'
            errorSection = 3
            errorField = 'total_monthly_obligations'
          } else if (error.message.includes('first_name') || error.message.includes('last_name')) {
            errorMessage = 'يرجى إدخال الاسم واللقب'
            errorSection = 1
            errorField = 'full_name'
          } else if (error.message.includes('national_id')) {
            errorMessage = 'يرجى إدخال رقم بطاقة التعريف الوطنية'
            errorSection = 1
            errorField = 'national_id'
          } else if (error.message.includes('date_of_birth')) {
            errorMessage = 'يرجى إدخال تاريخ الولادة'
            errorSection = 1
            errorField = 'date_of_birth'
          } else {
            errorMessage = error.message || 'فشل إرسال الطلب'
          }
        }
        
        // Focus on the error field instead of resetting to section 1
        if (errorField) {
          focusField(errorField, errorSection)
        } else {
          formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        
        toast.error(errorMessage)
        setLoading(false)
        return
      }

      if (inserted?.id) {
        try {
          await supabase.rpc('calculate_application_score', { app_id: inserted.id })
        } catch (_) {}
      }

      const key = getStorageKey(user.id)
      try {
        localStorage.removeItem(key)
      } catch (_) {}

      // Reset loading state before redirect
      setLoading(false)
      
      toast.success('تم إرسال الطلب بنجاح')
      
      // Use a small delay to ensure toast is shown, then redirect
      // Use window.location for more reliable redirect
      setTimeout(() => {
        window.location.href = '/dashboard/applicant'
      }, 800)
    } catch (error: any) {
      // Error handling is done in the if (error) block above
      // This catch is for unexpected errors
      console.error('Unexpected error:', error)
      toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.')
      setLoading(false)
    }
  }

  const nextSection = () => {
    if (currentSection < TOTAL_SECTIONS) setCurrentSection(currentSection + 1)
    else handleSubmit()
  }

  const prevSection = () => {
    if (currentSection > 1) setCurrentSection(currentSection - 1)
  }

  const toggleProblem = (value: string) => {
    const arr = formData.housing_problems || []
    const next = arr.includes(value) ? arr.filter(p => p !== value) : [...arr, value]
    updateFormData('housing_problems', next)
  }

  if (!hydrationDone) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    )
  }

  return (
    <div ref={formTopRef} className="max-w-[28rem] mx-auto px-4 py-6 pb-32 touch-manipulation" style={{ touchAction: 'manipulation' }}>
      <div className="card rounded-3xl shadow-soft relative bg-white">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">استمارة رقمية</h1>
          <p className="text-base font-medium text-gray-700 mb-1">تطبيق برنامج السكن الاقتصادي السريع</p>
          <p className="text-gray-600 text-sm mb-2">تهدف هذه الاستمارة إلى دراسة وضعيتكم السكنية والمالية بدقة، قصد اقتراح الحل السكني الأنسب لكم.</p>
          <p className="text-primary-600 text-xs font-medium">يتم حفظ تقدّمك تلقائياً — يمكنك إكمال الاستمارة لاحقاً من حيث توقّفت.</p>
        </div>

        {/* Progress — bar + section label only */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-xs font-medium text-gray-500">القسم {currentSection} من {TOTAL_SECTIONS}</span>
            <select
              value={currentSection}
              onChange={(e) => setCurrentSection(Number(e.target.value))}
              className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary-500"
            >
              {Array.from({ length: TOTAL_SECTIONS }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>القسم {s}</option>
              ))}
            </select>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentSection / TOTAL_SECTIONS) * 100}%` }}
            />
          </div>
        </div>

        {/* Section 1: المعطيات الشخصية */}
        {currentSection === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100">1️⃣ المعطيات الشخصية</h2>
            <div className="space-y-4">
              <div>
                <label className="form-label">الاسم واللقب</label>
                <input 
                  ref={(el) => { fieldRefs.current['full_name'] = el }}
                  type="text" 
                  value={formData.full_name || ''} 
                  onChange={(e) => updateFormData('full_name', e.target.value)} 
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">رقم بطاقة التعريف الوطنية</label>
                <input 
                  ref={(el) => { fieldRefs.current['national_id'] = el }}
                  type="text" 
                  value={formData.national_id || ''} 
                  onChange={(e) => updateFormData('national_id', e.target.value)} 
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">تاريخ الولادة</label>
                <input 
                  ref={(el) => { fieldRefs.current['date_of_birth'] = el }}
                  type="date" 
                  value={formData.date_of_birth || ''} 
                  onChange={(e) => updateFormData('date_of_birth', e.target.value)} 
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">الحالة الاجتماعية</label>
                <select 
                  ref={(el) => { fieldRefs.current['marital_status'] = el }}
                  value={formData.marital_status || ''} 
                  onChange={(e) => updateFormData('marital_status', e.target.value)} 
                  className="form-input"
                >
                  <option value="">اختر...</option>
                  <option value="أعزب">أعزب</option>
                  <option value="متزوج">متزوج</option>
                  <option value="مطلق">مطلق</option>
                  <option value="أرمل">أرمل</option>
                </select>
              </div>
              <div>
                <label className="form-label">عدد أفراد العائلة</label>
                <input 
                  ref={(el) => { fieldRefs.current['family_count'] = el }}
                  type="number" 
                  min={0} 
                  value={formData.family_count ?? ''} 
                  onChange={(e) => updateFormData('family_count', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} 
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">أعمار الأطفال (إن وجدوا)</label>
                <input type="text" value={formData.children_ages || ''} onChange={(e) => updateFormData('children_ages', e.target.value)} className="form-input" placeholder="مثال: 5، 8، 12" />
              </div>
              <div>
                <label className="form-label">رقم الهاتف</label>
                <input 
                  ref={(el) => { fieldRefs.current['phone'] = el }}
                  type="tel" 
                  value={formData.phone || ''} 
                  onChange={(e) => updateFormData('phone', e.target.value)} 
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">البريد الإلكتروني (اختياري)</label>
                <input 
                  ref={(el) => { fieldRefs.current['email'] = el }}
                  type="email" 
                  value={formData.email || ''} 
                  onChange={(e) => updateFormData('email', e.target.value)} 
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">العنوان الحالي (ولاية)</label>
                <select 
                  ref={(el) => { fieldRefs.current['current_address'] = el }}
                  value={formData.current_address || ''} 
                  onChange={(e) => updateFormData('current_address', e.target.value)} 
                  className="form-input"
                >
                  <option value="">اختر الولاية...</option>
                  {TUNISIAN_GOVERNORATES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: الوضعية المهنية */}
        {currentSection === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">2️⃣ الوضعية المهنية</h2>
            <div>
              <label className="form-label">الوضعية المهنية:</label>
              <select 
                ref={(el) => { fieldRefs.current['employment_status'] = el }}
                value={formData.employment_status || ''} 
                onChange={(e) => updateFormData('employment_status', e.target.value)} 
                className="form-input"
              >
                <option value="">اختر...</option>
                <option value="موظف قار">موظف قار</option>
                <option value="موظف بعقد">موظف بعقد</option>
                <option value="عامل حر">عامل حر</option>
                <option value="صاحب مشروع">صاحب مشروع</option>
                <option value="عاطل عن العمل">عاطل عن العمل</option>
              </select>
            </div>
            <div>
              <label className="form-label">قطاع العمل (عمومي / خاص / غير منظم)</label>
              <select 
                ref={(el) => { fieldRefs.current['work_sector'] = el }}
                value={formData.work_sector || ''} 
                onChange={(e) => updateFormData('work_sector', e.target.value)} 
                className="form-input"
              >
                <option value="">اختر...</option>
                <option value="عمومي">عمومي</option>
                <option value="خاص">خاص</option>
                <option value="غير منظم">غير منظم</option>
              </select>
            </div>
            <div>
              <label className="form-label">الدخل الشهري الصافي التقريبي</label>
              <input 
                ref={(el) => { fieldRefs.current['net_monthly_income'] = el }}
                type="number" 
                min={0} 
                step={0.01} 
                value={formData.net_monthly_income ?? ''} 
                onChange={(e) => updateFormData('net_monthly_income', e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                className="form-input" 
              />
            </div>
            <div>
              <label className="form-label">هل الدخل قار؟ (نعم / لا)</label>
              <select 
                ref={(el) => { fieldRefs.current['income_stable'] = el }}
                value={formData.income_stable || ''} 
                onChange={(e) => updateFormData('income_stable', e.target.value)} 
                className="form-input"
              >
                <option value="">اختر...</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
              </select>
            </div>
            <div>
              <label className="form-label">مداخيل إضافية (إن وجدت)</label>
              <input type="text" value={formData.extra_income || ''} onChange={(e) => updateFormData('extra_income', e.target.value)} className="form-input" placeholder="اختياري" />
            </div>
            <div>
              <label className="form-label">المهارات (اختياري)</label>
              <textarea 
                value={formData.skills || ''} 
                onChange={(e) => updateFormData('skills', e.target.value)} 
                className="form-input" 
                rows={3}
                placeholder="اذكر مهاراتك المهنية أو الحرفية..."
              />
            </div>
          </div>
        )}

        {/* Section 3: الوضعية المالية */}
        {currentSection === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">3️⃣ الوضعية المالية</h2>
            <div>
              <label className="form-label">هل لديك التزامات مالية حالية؟ (قروض / كراء / أخرى)</label>
              <select 
                ref={(el) => { fieldRefs.current['has_financial_obligations'] = el }}
                value={formData.has_financial_obligations || ''} 
                onChange={(e) => updateFormData('has_financial_obligations', e.target.value)} 
                className="form-input"
              >
                <option value="">اختر...</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
              </select>
            </div>
            <div>
              <label className="form-label">القيمة الجملية للالتزامات الشهرية (د.ت)</label>
              <input 
                ref={(el) => { fieldRefs.current['total_monthly_obligations'] = el }}
                type="number" 
                min={0} 
                step={0.01} 
                value={formData.total_monthly_obligations ?? ''} 
                onChange={(e) => updateFormData('total_monthly_obligations', e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                className="form-input" 
              />
            </div>
            <div>
              <label className="form-label">القدرة القصوى على الدفع الشهري للسكن (د.ت)</label>
              <input 
                ref={(el) => { fieldRefs.current['max_monthly_payment'] = el }}
                type="number" 
                min={0} 
                step={0.01} 
                value={formData.max_monthly_payment ?? ''} 
                onChange={(e) => updateFormData('max_monthly_payment', e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                className="form-input" 
              />
            </div>
            <div>
              <label className="form-label">هل يمكنك توفير تسبقة في حدود 20%؟ (نعم / لا / جزئياً)</label>
              <select 
                ref={(el) => { fieldRefs.current['can_save_20_percent'] = el }}
                value={formData.can_save_20_percent || ''} 
                onChange={(e) => updateFormData('can_save_20_percent', e.target.value)} 
                className="form-input"
              >
                <option value="">اختر...</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
                <option value="جزئياً">جزئياً</option>
              </select>
            </div>
            <div>
              <label className="form-label">القيمة التقريبية للتسبقة المتوفرة (د.ت)</label>
              <input type="number" min={0} step={0.01} value={formData.down_payment_value ?? ''} onChange={(e) => updateFormData('down_payment_value', e.target.value === '' ? undefined : parseFloat(e.target.value))} className="form-input" />
            </div>
          </div>
        )}

        {/* Section 4: الوضعية السكنية الحالية */}
        {currentSection === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">4️⃣ الوضعية السكنية الحالية</h2>
            <div>
              <label className="form-label">نوع السكن الحالي:</label>
              <select 
                ref={(el) => { fieldRefs.current['current_housing_type'] = el }}
                value={formData.current_housing_type || ''} 
                onChange={(e) => updateFormData('current_housing_type', e.target.value)} 
                className="form-input"
              >
                <option value="">اختر...</option>
                <option value="كراء">كراء</option>
                <option value="ملك">ملك</option>
                <option value="سكن عائلي">سكن عائلي</option>
                <option value="بدون سكن قار">بدون سكن قار</option>
              </select>
            </div>
            <div>
              <label className="form-label">مدة الإقامة في السكن الحالي</label>
              <input type="text" value={formData.current_residence_duration || ''} onChange={(e) => updateFormData('current_residence_duration', e.target.value)} className="form-input" placeholder="مثال: 3 سنوات" />
            </div>
            <div>
              <label className="form-label">قيمة الكراء (إن وجد) (د.ت)</label>
              <input type="number" min={0} value={formData.current_rent_value ?? ''} onChange={(e) => updateFormData('current_rent_value', e.target.value === '' ? undefined : parseFloat(e.target.value))} className="form-input" />
            </div>
            <div>
              <label className="form-label">أبرز المشاكل (اختر ما ينطبق)</label>
              <div className="space-y-2">
                {['غلاء الكراء', 'ضيق المساحة', 'خطر الإخلاء', 'بعد السكن عن العمل', 'أخرى'].map((p) => (
                  <label key={p} className="flex items-center gap-2">
                    <input type="checkbox" checked={(formData.housing_problems || []).includes(p)} onChange={() => toggleProblem(p)} className="rounded" />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 5: العقار */}
        {currentSection === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">5️⃣ العقار</h2>
            <div>
              <label className="form-label">هل تملك أرضاً صالحة للبناء؟</label>
              <select 
                ref={(el) => { fieldRefs.current['owns_land'] = el }}
                value={formData.owns_land || ''} 
                onChange={(e) => updateFormData('owns_land', e.target.value)} 
                className="form-input"
              >
                <option value="">اختر...</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
              </select>
            </div>

            {formData.owns_land === 'نعم' && (
              <>
                <div className="rounded-lg bg-primary-50 p-4 my-4">
                  <p className="text-sm text-primary-800 font-medium">هذا المسار مخصص للمواطن الذي يملك قطعة أرض ويرغب في أن تتولى الشركة بناء المسكن عليها.</p>
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-4 mb-2">🔹 تفاصيل الأرض</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="form-label">موقع الأرض بالتفصيل (ولاية / معتمدية / عمادة)</label>
                    <input 
                      ref={(el) => { fieldRefs.current['land_location'] = el }}
                      type="text" 
                      value={formData.land_location || ''} 
                      onChange={(e) => updateFormData('land_location', e.target.value)} 
                      className="form-input" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">عنوان تقريبي أو نقطة GPS (اختياري)</label>
                    <input type="text" value={formData.land_address_gps || ''} onChange={(e) => updateFormData('land_address_gps', e.target.value)} className="form-input" placeholder="اختياري" />
                  </div>
                  <div>
                    <label className="form-label">مساحة الأرض بالمتر المربع</label>
                    <input 
                      ref={(el) => { fieldRefs.current['land_area_sqm'] = el }}
                      type="number" 
                      min={0} 
                      value={formData.land_area_sqm ?? ''} 
                      onChange={(e) => updateFormData('land_area_sqm', e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                      className="form-input" 
                    />
                  </div>
                  <div>
                    <label className="form-label">طبيعة الأرض</label>
                    <select 
                      ref={(el) => { fieldRefs.current['land_nature'] = el }}
                      value={formData.land_nature || ''} 
                      onChange={(e) => updateFormData('land_nature', e.target.value)} 
                      className="form-input"
                    >
                      <option value="">اختر...</option>
                      <option value="داخل منطقة بلدية">داخل منطقة بلدية</option>
                      <option value="خارج المنطقة البلدية">خارج المنطقة البلدية</option>
                      <option value="منطقة فلاحية">منطقة فلاحية</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">نوع الملكية</label>
                    <select 
                      ref={(el) => { fieldRefs.current['land_ownership_type'] = el }}
                      value={formData.land_ownership_type || ''} 
                      onChange={(e) => updateFormData('land_ownership_type', e.target.value)} 
                      className="form-input"
                    >
                      <option value="">اختر...</option>
                      <option value="ملك شخصي">ملك شخصي</option>
                      <option value="ملك مشترك">ملك مشترك</option>
                      <option value="في طور التسوية">في طور التسوية</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">هل الأرض مسجلة بالرسم العقاري؟ (نعم / لا)</label>
                    <select value={formData.land_registered || ''} onChange={(e) => updateFormData('land_registered', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="نعم">نعم</option>
                      <option value="لا">لا</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">هل تتوفر وثيقة ملكية أو عقد شراء؟ (نعم / لا)</label>
                    <select value={formData.has_ownership_doc || ''} onChange={(e) => updateFormData('has_ownership_doc', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="نعم">نعم</option>
                      <option value="لا">لا</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-gray-800 mt-4 mb-2">🔹 الوضعية القانونية والإدارية</p>
                  </div>
                  <div>
                    <label className="form-label">هل توجد رخصة بناء حالياً؟ (نعم / لا)</label>
                    <select value={formData.has_building_permit || ''} onChange={(e) => updateFormData('has_building_permit', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="نعم">نعم</option>
                      <option value="لا">لا</option>
                    </select>
                  </div>
                  {formData.has_building_permit === 'لا' && (
                    <div>
                      <label className="form-label">إذا لا: هل ترغب أن تتولى الشركة إعداد ملف الرخصة؟ (نعم / لا)</label>
                      <select value={formData.company_handle_permit || ''} onChange={(e) => updateFormData('company_handle_permit', e.target.value)} className="form-input">
                        <option value="">اختر...</option>
                        <option value="نعم">نعم</option>
                        <option value="لا">لا</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="form-label">هل توجد قيود قانونية أو نزاع على الأرض؟ (نعم / لا)</label>
                    <select value={formData.land_legal_issues || ''} onChange={(e) => updateFormData('land_legal_issues', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="نعم">نعم</option>
                      <option value="لا">لا</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-gray-800 mt-4 mb-2">🔹 تفاصيل المشروع المطلوب</p>
                  </div>
                  <div>
                    <label className="form-label">نوع المسكن المرغوب</label>
                    <select value={formData.desired_housing_type_land || ''} onChange={(e) => updateFormData('desired_housing_type_land', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="اقتصادي أساسي">اقتصادي أساسي</option>
                      <option value="اقتصادي متوسط">اقتصادي متوسط</option>
                      <option value="اقتصادي مريح">اقتصادي مريح</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">هل ترغب في تصميم خاص أم نموذج جاهز؟</label>
                    <select value={formData.custom_design_or_ready || ''} onChange={(e) => updateFormData('custom_design_or_ready', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="تصميم خاص">تصميم خاص</option>
                      <option value="نموذج جاهز">نموذج جاهز</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">عدد الغرف المطلوبة</label>
                    <input type="number" min={0} value={formData.rooms_count_land ?? ''} onChange={(e) => updateFormData('rooms_count_land', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">هل ترغب في طابق إضافي مستقبلاً؟ (نعم / لا)</label>
                    <select value={formData.want_future_floor || ''} onChange={(e) => updateFormData('want_future_floor', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="نعم">نعم</option>
                      <option value="لا">لا</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-gray-800 mt-4 mb-2">🔹 نوع خدمة الشركة</p>
                    <label className="form-label">اختر الخدمة المطلوبة</label>
                    <select value={formData.service_type || ''} onChange={(e) => updateFormData('service_type', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="بناء الهيكل فقط (Gros œuvre)">بناء الهيكل فقط (Gros œuvre)</option>
                      <option value="بناء مع التشطيب المتوسط">بناء مع التشطيب المتوسط</option>
                      <option value="مسكن جاهز للسكن (Clé en main)">مسكن جاهز للسكن (Clé en main)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-gray-800 mt-4 mb-2">🔹 التمويل</p>
                  </div>
                  <div>
                    <label className="form-label">هل ستدفع التسبقة (20%) مباشرة؟ (نعم / لا / جزئياً)</label>
                    <select value={formData.pay_down_direct || ''} onChange={(e) => updateFormData('pay_down_direct', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="نعم">نعم</option>
                      <option value="لا">لا</option>
                      <option value="جزئياً">جزئياً</option>
                    </select>
                  </div>
            <div>
              <label className="form-label">هل ترغب في تقسيط تكلفة البناء فقط؟ (نعم / لا)</label>
              <select value={formData.want_installment_building_only || ''} onChange={(e) => updateFormData('want_installment_building_only', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="نعم">نعم</option>
                      <option value="لا">لا</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">مدة التقسيط المقترحة</label>
                    <select value={formData.installment_years_land || ''} onChange={(e) => updateFormData('installment_years_land', e.target.value)} className="form-input">
                      <option value="">اختر...</option>
                      <option value="5">5 سنوات</option>
                      <option value="10">10 سنوات</option>
                      <option value="15">15 سنة</option>
                      <option value="20">20 سنة</option>
                    </select>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-4 mb-2">🔹 الوثائق المطلوبة لهذا المسار</p>
                <p className="text-sm text-gray-600">يرجى تحميل: وثيقة ملكية الأرض، مخطط موقع الأرض، نسخة بطاقة التعريف، رخصة البناء إن وجدت.</p>
              </>
            )}

            {formData.owns_land === 'لا' && (
              <div>
                <label className="form-label">هل ترغب أن توفّر الشركة العقار كاملاً؟ (مسار شراء أرض + بناء)</label>
                <select value={formData.company_provide_full_property || ''} onChange={(e) => updateFormData('company_provide_full_property', e.target.value)} className="form-input">
                  <option value="">اختر...</option>
                  <option value="نعم">نعم</option>
                  <option value="لا">لا</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Section 6: نموذج السكن المطلوب */}
        {currentSection === 6 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">6️⃣ معلومات حول نوع السكن المطلوب</h2>
            <p className="text-sm text-gray-600 mb-4">يرجى من المترشح اختيار نوع السكن الذي يتناسب مع احتياجاته العائلية وقدرته التمويلية:</p>
            
            <div>
              <label className="form-label">نوع السكن *</label>
              <select 
                ref={(el) => { fieldRefs.current['housing_type_model'] = el }}
                value={formData.housing_type_model || ''} 
                onChange={(e) => updateFormData('housing_type_model', e.target.value)} 
                className="form-input" 
                required
              >
                <option value="">اختر...</option>
                <option value="شقة">شقة (APARTMENT)</option>
                <option value="فيلا اقتصادية">فيلا اقتصادية (VILLA)</option>
                <option value="مسكن فردي مستقل">مسكن فردي مستقل</option>
                <option value="شقة ضمن عمارة">شقة ضمن عمارة (سكن جماعي)</option>
                <option value="مسكن قابل للتوسعة">مسكن قابل للتوسعة مستقبلاً</option>
              </select>
            </div>

            <div>
              <label className="form-label">النوع: فردي / جماعي *</label>
              <select 
                ref={(el) => { fieldRefs.current['housing_individual_collective'] = el }}
                value={formData.housing_individual_collective || ''} 
                onChange={(e) => updateFormData('housing_individual_collective', e.target.value)} 
                className="form-input" 
                required
              >
                <option value="">اختر...</option>
                <option value="فردي">فردي</option>
                <option value="جماعي">جماعي</option>
              </select>
            </div>

            <div>
              <label className="form-label">المساحة الجملية المرغوبة *</label>
              <div className="space-y-2" ref={(el) => { fieldRefs.current['housing_area'] = el as any }}>
                <div className="grid grid-cols-2 gap-2">
                  {['60', '80', '100', 'أكثر من 100'].map((area) => {
                    const value = area === 'أكثر من 100' ? 'custom' : area
                    const isChecked = formData.housing_area === value || (!formData.housing_area && formData.housing_model === area)
                    return (
                      <label key={area} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-primary-400 cursor-pointer">
                        <input 
                          type="radio" 
                          name="housing_area" 
                          value={value}
                          checked={isChecked}
                          onChange={(e) => {
                            updateFormData('housing_area', e.target.value)
                            if (e.target.value !== 'custom') updateFormData('housing_model', area)
                          }}
                          className="text-primary-600"
                        />
                        <span className="text-sm">{area === 'أكثر من 100' ? 'أكثر من 100 م²' : `${area} م²`}</span>
                      </label>
                    )
                  })}
                </div>
                {formData.housing_area === 'custom' && (
                  <div className="mt-2">
                    <label className="form-label text-sm">المساحة المخصصة (م²)</label>
                    <input 
                      ref={(el) => { fieldRefs.current['housing_area_custom'] = el }}
                      type="number" 
                      min={100} 
                      value={formData.housing_area_custom ?? ''} 
                      onChange={(e) => updateFormData('housing_area_custom', e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                      className="form-input" 
                      placeholder="مثال: 120"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">عدد الغرف المطلوبة</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['غرفة نوم واحدة', 'غرفتان', 'ثلاث غرف', 'أكثر'].map((rooms) => (
                  <label key={rooms} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-primary-400 cursor-pointer">
                    <input 
                      type="radio" 
                      name="number_of_rooms" 
                      value={rooms}
                      checked={formData.number_of_rooms === rooms}
                      onChange={(e) => updateFormData('number_of_rooms', e.target.value)}
                      className="text-primary-600"
                    />
                    <span className="text-sm">{rooms}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">مكونات إضافية مرغوبة</label>
              <div className="space-y-2 mt-2">
                {['مطبخ مستقل', 'شرفة', 'حديقة صغيرة', 'مكان لوقوف السيارة', 'إمكانية التوسعة لاحقاً'].map((comp) => (
                  <label key={comp} className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={(formData.additional_components || []).includes(comp)}
                      onChange={() => {
                        const arr = formData.additional_components || []
                        const next = arr.includes(comp) ? arr.filter(c => c !== comp) : [...arr, comp]
                        updateFormData('additional_components', next)
                      }}
                      className="rounded text-primary-600"
                    />
                    <span className="text-sm">{comp}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">الهدف من السكن</label>
              <div className="space-y-2 mt-2">
                {['سكن رئيسي', 'استثمار', 'سكن لعائلة مستقبلية'].map((purpose) => (
                  <label key={purpose} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-primary-400 cursor-pointer">
                    <input 
                      type="radio" 
                      name="housing_purpose" 
                      value={purpose}
                      checked={formData.housing_purpose === purpose}
                      onChange={(e) => updateFormData('housing_purpose', e.target.value)}
                      className="text-primary-600"
                    />
                    <span className="text-sm">{purpose}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">هل تقبل بتعديل المساحة حسب قدرتك المالية؟ (نعم / لا)</label>
              <select value={formData.accept_area_adjustment || ''} onChange={(e) => updateFormData('accept_area_adjustment', e.target.value)} className="form-input">
                <option value="">اختر...</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
              </select>
            </div>
          </div>
        )}

        {/* Section 7: مدة التقسيط */}
        {currentSection === 7 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">7️⃣ مدة التقسيط وطريقة الدفع</h2>
            
            <div>
              <label className="form-label">نوع الدفع *</label>
              <select 
                ref={(el) => { fieldRefs.current['payment_type'] = el }}
                value={formData.payment_type || ''} 
                onChange={(e) => updateFormData('payment_type', e.target.value)} 
                className="form-input" 
                required
              >
                <option value="">اختر...</option>
                <option value="تقسيط">تقسيط</option>
                <option value="دفع كامل">دفع كامل</option>
              </select>
            </div>

            {formData.payment_type === 'تقسيط' && (
              <>
                <div>
                  <label className="form-label">النسبة المدفوعة مسبقاً (%)</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={100} 
                    step={1}
                    value={formData.payment_percentage ?? ''} 
                    onChange={(e) => updateFormData('payment_percentage', e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                    className="form-input" 
                    placeholder="مثال: 20"
                  />
                  <p className="text-xs text-gray-500 mt-1">أدخل النسبة المئوية التي يمكنك دفعها مسبقاً (من 1% إلى 100%)</p>
                </div>

                <div>
                  <label className="form-label">مدة التقسيط (سنوات) *</label>
                  <select 
                    ref={(el) => { fieldRefs.current['installment_period'] = el }}
                    value={formData.installment_period || ''} 
                    onChange={(e) => updateFormData('installment_period', e.target.value)} 
                    className="form-input" 
                    required
                  >
                    <option value="">اختر...</option>
                    <option value="5">5 سنوات</option>
                    <option value="10">10 سنوات</option>
                    <option value="15">15 سنة</option>
                    <option value="20">20 سنة</option>
                    <option value="25">25 سنة</option>
                  </select>
                </div>
              </>
            )}

            {formData.payment_type === 'دفع كامل' && (
              <div className="rounded-xl bg-primary-50 border border-primary-200 p-4">
                <p className="text-sm text-primary-900 font-medium">سيتم التواصل معك لتحديد طريقة الدفع الكامل والتفاصيل.</p>
              </div>
            )}
          </div>
        )}

        {/* Section 8: الشراكة مع الدولة */}
        {currentSection === 8 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">8️⃣ الشراكة مع الدولة والسكن الاجتماعي</h2>
            <div>
              <label className="form-label">هل توافق على إحالة ملفك إلى هياكل الدولة أو ديوان السكن في حال استوجب الأمر؟</label>
              <select value={formData.agree_state_referral || ''} onChange={(e) => updateFormData('agree_state_referral', e.target.value)} className="form-input">
                <option value="">اختر...</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
              </select>
            </div>
            <div>
              <label className="form-label">هل سبق لك الانتفاع ببرنامج سكن اجتماعي أو FOPROLOS؟</label>
              <select value={formData.previous_social_housing || ''} onChange={(e) => updateFormData('previous_social_housing', e.target.value)} className="form-input">
                <option value="">اختر...</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
              </select>
            </div>
            <div>
              <label className="form-label">هل أنت مسجّل لدى الشؤون الاجتماعية أو ضمن قائمة الأولويات؟</label>
              <select value={formData.registered_social_affairs || ''} onChange={(e) => updateFormData('registered_social_affairs', e.target.value)} className="form-input">
                <option value="">اختر...</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
              </select>
            </div>
            <div>
              <label className="form-label">هل تقبل بحلول سكن اجتماعي أو اقتصادي مدعّم؟</label>
              <select value={formData.accept_social_economic_housing || ''} onChange={(e) => updateFormData('accept_social_economic_housing', e.target.value)} className="form-input">
                <option value="">اختر...</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
              </select>
            </div>
            <div>
              <label className="form-label">في حال قبول ملفك ضمن برنامج السكن الاجتماعي، هل توافق على المتابعة الإدارية عبر المنصة؟</label>
              <select value={formData.accept_followup_via_platform || ''} onChange={(e) => updateFormData('accept_followup_via_platform', e.target.value)} className="form-input">
                <option value="">اختر...</option>
                <option value="نعم">نعم</option>
                <option value="لا">لا</option>
              </select>
            </div>
          </div>
        )}

        {/* Section 9: معلومات إضافية */}
        {currentSection === 9 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">9️⃣ معلومات إضافية</h2>
            
            <div>
              <label className="form-label">اختر طريقة الشرح</label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => updateFormData('additional_info_type', 'text')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.additional_info_type === 'text' || !formData.additional_info_type
                      ? 'border-primary-600 bg-primary-50 text-primary-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium">📝 نص</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData('additional_info_type', 'voice')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.additional_info_type === 'voice'
                      ? 'border-primary-600 bg-primary-50 text-primary-900'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium">🎤 صوت</span>
                </button>
              </div>
            </div>

            {(formData.additional_info_type === 'text' || !formData.additional_info_type) && (
              <div>
                <label className="form-label">صف وضعيتك أو مشكلتك السكنية بإيجاز</label>
                <textarea 
                  rows={5} 
                  value={formData.additional_info || ''} 
                  onChange={(e) => updateFormData('additional_info', e.target.value)} 
                  className="form-input" 
                  placeholder="اشرح وضعيتك السكنية والمشاكل التي تواجهها..."
                />
              </div>
            )}

            {formData.additional_info_type === 'voice' && (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-gray-200 p-6">
                  {formData.additional_info_voice_url ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">تم تسجيل الصوت</span>
                        <div className="flex gap-2">
                          <audio ref={audioRef} src={formData.additional_info_voice_url} controls className="h-8" />
                          <button
                            type="button"
                            onClick={async () => {
                              if (formData.additional_info_voice_url) {
                                try {
                                  const path = formData.additional_info_voice_url.split('/').slice(-3).join('/')
                                  await supabase.storage.from('documents').remove([path])
                                } catch (_) {}
                              }
                              updateFormData('additional_info_voice_url', undefined)
                            }}
                            className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <p className="text-sm text-gray-600">اضغط على الزر لتسجيل صوتك وشرح وضعيتك</p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (isRecording) {
                            // Stop recording
                            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                              mediaRecorder.stop()
                            }
                            setIsRecording(false)
                            if (recordingTimerRef.current) {
                              clearInterval(recordingTimerRef.current)
                              setRecordingTime(0)
                            }
                          } else {
                            // Start recording
                            try {
                              // Check if mediaDevices is available
                              if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                                toast.error('المتصفح لا يدعم التسجيل الصوتي')
                                return
                              }

                              // Check permission first
                              let permissionStatus: PermissionStatus | null = null
                              try {
                                permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
                              } catch (permError) {
                                // Permission API not supported, continue anyway
                              }

                              if (permissionStatus?.state === 'denied') {
                                toast.error('تم رفض الوصول إلى الميكروفون. يرجى تفعيله من إعدادات المتصفح.')
                                return
                              }

                              // Request microphone access
                              const stream = await navigator.mediaDevices.getUserMedia({ 
                                audio: {
                                  echoCancellation: true,
                                  noiseSuppression: true,
                                  autoGainControl: true
                                } 
                              })

                              // Check if MediaRecorder is supported
                              if (!MediaRecorder.isTypeSupported('audio/webm')) {
                                toast.error('نوع التسجيل غير مدعوم في هذا المتصفح')
                                stream.getTracks().forEach(track => track.stop())
                                return
                              }

                              const recorder = new MediaRecorder(stream, {
                                mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
                              })
                              const chunks: Blob[] = []
                              
                              recorder.ondataavailable = (e) => {
                                if (e.data && e.data.size > 0) {
                                  chunks.push(e.data)
                                }
                              }
                              
                              recorder.onerror = (e) => {
                                console.error('Recording error:', e)
                                toast.error('حدث خطأ أثناء التسجيل')
                                setIsRecording(false)
                                if (recordingTimerRef.current) {
                                  clearInterval(recordingTimerRef.current)
                                  setRecordingTime(0)
                                }
                                stream.getTracks().forEach(track => track.stop())
                              }
                              
                              recorder.onstop = async () => {
                                try {
                                  const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
                                  
                                  if (audioBlob.size === 0) {
                                    toast.error('التسجيل فارغ. حاول مرة أخرى.')
                                    stream.getTracks().forEach(track => track.stop())
                                    recordingStreamRef.current = null
                                    return
                                  }
                                  
                                  // Upload to Supabase
                                  if (userId) {
                                    const fileName = `voice-notes/${userId}/${Date.now()}.webm`
                                    const { error: uploadError, data } = await supabase.storage
                                      .from('documents')
                                      .upload(fileName, audioBlob, { contentType: recorder.mimeType || 'audio/webm' })
                                    
                                    if (!uploadError && data) {
                                      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
                                      updateFormData('additional_info_voice_url', publicUrl)
                                      toast.success('تم حفظ التسجيل بنجاح')
                                    } else {
                                      console.error('Upload error:', uploadError)
                                      toast.error('فشل رفع التسجيل: ' + (uploadError?.message || 'خطأ غير معروف'))
                                    }
                                  } else {
                                    toast.error('يرجى تسجيل الدخول أولاً')
                                  }
                                } catch (uploadErr: any) {
                                  console.error('Upload error:', uploadErr)
                                  toast.error('فشل حفظ التسجيل')
                                } finally {
                                  stream.getTracks().forEach(track => track.stop())
                                  recordingStreamRef.current = null
                                }
                              }
                              
                              recorder.start(1000) // Collect data every second
                              setMediaRecorder(recorder)
                              recordingStreamRef.current = stream
                              setIsRecording(true)
                              
                              // Timer
                              let time = 0
                              recordingTimerRef.current = setInterval(() => {
                                time += 1
                                setRecordingTime(time)
                              }, 1000)
                            } catch (error: any) {
                              console.error('Microphone access error:', error)
                              setIsRecording(false)
                              
                              // Better error messages
                              if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                                toast.error('تم رفض الوصول إلى الميكروفون. يرجى السماح بالوصول من إعدادات المتصفح.')
                              } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                                toast.error('لم يتم العثور على ميكروفون. تأكد من توصيله.')
                              } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                                toast.error('الميكروفون مستخدم من قبل تطبيق آخر. أغلق التطبيقات الأخرى وحاول مرة أخرى.')
                              } else {
                                toast.error('فشل الوصول إلى الميكروفون: ' + (error.message || 'خطأ غير معروف'))
                              }
                            }
                          }
                        }}
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all ${
                          isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-primary-800 hover:bg-primary-900'
                        }`}
                      >
                        {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                      </button>
                      {isRecording && (
                        <p className="text-sm text-gray-600">
                          جاري التسجيل... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 10: وثائق (informational) */}
        {currentSection === 10 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">9️⃣1️⃣ وثائق السكن الاجتماعي المطلوبة (عند الاقتضاء)</h2>
            <p className="text-gray-600">في حال الترشح لبرنامج السكن الاجتماعي أو السكن المدعّم، يرجى تحميل الوثائق التالية عبر التطبيق:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>نسخة من بطاقة التعريف الوطنية</li>
              <li>شهادة دخل أو شهادة عدم دخل</li>
              <li>شهادة في الوضعية العائلية</li>
              <li>شهادة تسجيل لدى الشؤون الاجتماعية (إن وجدت)</li>
              <li>شهادة طبية أو بطاقة إعاقة (عند الاقتضاء)</li>
              <li>وثيقة تثبت عدم امتلاك مسكن (عند الاقتضاء)</li>
              <li>عقد كراء أو ما يثبت الوضعية السكنية الحالية</li>
            </ul>
          </div>
        )}

        {/* Section 11: التصريح والموافقة */}
        {currentSection === 11 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b pb-2">🔟 التصريح والموافقة</h2>
            <p className="text-gray-700">
              أصرّح بصحة المعلومات المصرّح بها، وأوافق على دراستها واقتراح الحل السكني الأنسب لي، مع إمكانية التنسيق مع هياكل الدولة عند الاقتضاء.
            </p>
            <p className="text-sm font-medium text-gray-800">☑️ أوافق</p>
            <p className="text-sm text-gray-600">بالضغط على &quot;إرسال الطلب&quot; فإنك توافق على الشروط أعلاه.</p>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-800 mb-2">📌 بعد إرسال الاستمارة:</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>يتم تصنيف الملف (A / B / C)</li>
                <li>يتم الاتصال بصاحب الطلب</li>
                <li>اقتراح حل سكني مناسب</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100 touch-manipulation">
          <button
            type="button"
            onClick={prevSection}
            disabled={currentSection === 1}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl disabled:opacity-50 min-h-[48px]"
          >
            <ArrowRight className="w-4 h-4" />
            السابق
          </button>
          <button
            type="button"
            onClick={nextSection}
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl shadow-soft min-h-[48px]"
          >
            {currentSection === TOTAL_SECTIONS ? (
              <>
                {loading ? <span className="spinner ml-2"></span> : <Save className="w-4 h-4 ml-2" />}
                إرسال الطلب
              </>
            ) : (
              <>
                التالي
                <ArrowLeft className="w-4 h-4 mr-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
