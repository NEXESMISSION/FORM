'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import HousingApplicationForm from '@/components/HousingApplicationForm'
import { FileText, LogOut, ChevronLeft, ChevronRight, ChevronDown, Upload, X, Home, ShoppingCart, HelpCircle, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '@/components/BottomNav'
import IntroOnboarding, { hasSeenIntro, resetIntro } from '@/components/IntroOnboarding'

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المعالجة',
  in_progress: 'قيد المعالجة',
  documents_requested: 'طلب مستندات إضافية',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

const PURCHASE_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  in_progress: 'قيد المتابعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

// Mock data for test-mode fake application
function buildMockApplicationPayload(userId: string): Record<string, unknown> {
  const firstNames = ['أحمد', 'محمد', 'فاطمة', 'علي', 'سارة', 'يوسف', 'نور', 'خالد']
  const lastNames = ['بن صالح', 'المنصوري', 'الجلاصي', 'الهمامي', 'الزيتوني', 'بن ناصر', 'الشابي', 'المرزوقي']
  const governorates = ['تونس', 'صفاقس', 'سوسة', 'نابل', 'بن عروس', 'أريانة', 'القيروان', 'القصرين']
  const f = firstNames[Math.floor(Math.random() * firstNames.length)]
  const l = lastNames[Math.floor(Math.random() * lastNames.length)]
  const gov = governorates[Math.floor(Math.random() * governorates.length)]
  const year = 1985 + Math.floor(Math.random() * 25)
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')
  const area = [60, 80, 100, 120][Math.floor(Math.random() * 4)]
  const income = 600 + Math.floor(Math.random() * 1400)
  const period = ['5', '10', '15', '20', '25'][Math.floor(Math.random() * 5)]
  return {
    user_id: userId,
    status: 'in_progress',
    first_name: f,
    last_name: l,
    national_id: `0${Math.floor(10000000 + Math.random() * 89999999)}`,
    date_of_birth: `${year}-${month}-${day}`,
    email: `test.${Date.now()}@example.com`,
    governorate: gov,
    current_address: gov,
    desired_housing_type: 'apartment',
    maximum_budget: 400 + Math.floor(Math.random() * 600),
    required_area: area,
    marital_status: ['single', 'married', 'divorced', 'widowed'][Math.floor(Math.random() * 4)],
    number_of_children: Math.floor(Math.random() * 5),
    net_monthly_income: income,
    total_monthly_obligations: Math.floor(income * 0.2),
    skills: 'اختبار، محاسبة، إعلام آلي',
    housing_type_model: Math.random() > 0.5 ? 'APARTMENT' : 'VILLA',
    housing_individual_collective: Math.random() > 0.5 ? 'فردي' : 'جماعي',
    housing_area: String(area),
    housing_area_custom: null,
    desired_total_area: `${area} م²`,
    number_of_rooms: String(2 + Math.floor(Math.random() * 3)),
    additional_components: [],
    housing_purpose: 'سكن عائلي',
    payment_type: 'تقسيط',
    payment_percentage: 20 + Math.floor(Math.random() * 30),
    installment_period: period,
    additional_info: 'طلب تجريبي (Test)',
    additional_info_type: 'نص',
    additional_info_voice_url: null,
  }
}

// Client-only URL params to avoid useSearchParams() running before navigation context is ready (fixes 500/useContext null)
function useClientSearchParams() {
  const [params, setParams] = useState<URLSearchParams | null>(null)
  useEffect(() => {
    const update = () => {
      const next = new URLSearchParams(window.location.search)
      setParams((prev) => (prev?.toString() === next.toString() ? prev : next))
    }
    update()
    window.addEventListener('popstate', update)
    const id = setInterval(update, 600)
    return () => {
      window.removeEventListener('popstate', update)
      clearInterval(id)
    }
  }, [])
  return params
}

function ApplicantDashboardContent() {
  const router = useRouter()
  const searchParams = useClientSearchParams()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [directPurchases, setDirectPurchases] = useState<{ purchase: any; projectName: string }[]>([])
  const [requiredDocTypes, setRequiredDocTypes] = useState<{ id: string; label_ar: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [uploadingForId, setUploadingForId] = useState<string | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [pendingListFiles, setPendingListFiles] = useState<{ appId: string; files: File[] } | null>(null)
  const [sendingTest, setSendingTest] = useState(false)
  const [showIntro, setShowIntro] = useState<boolean | null>(null)
  const [showAlertsPopup, setShowAlertsPopup] = useState(false)

  useEffect(() => {
    if (!searchParams) return
    if (searchParams.get('form') === '1') setShowForm(true)
    if (searchParams.get('tab') === 'profile') setShowHelp(false)
  }, [searchParams])

  useEffect(() => {
    checkUser()
    loadApplications()
    loadDirectPurchases()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const checkIntro = async () => {
      const seen = await hasSeenIntro()
      setShowIntro(!seen)
    }
    checkIntro()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (!profileData) {
        router.replace('/dashboard')
        return
      }
      if (profileData.role !== 'applicant') {
        if (profileData.role === 'admin') router.replace('/dashboard/admin')
        else router.replace('/dashboard')
        return
      }
      setUser(user)
      setProfile(profileData)
    } catch { router.push('/auth/login') }
    finally { setLoading(false) }
  }

  const loadApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data, error }, { data: docTypes }] = await Promise.all([
        supabase.from('housing_applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('required_document_types').select('id, label_ar').eq('active', true).order('sort_order', { ascending: true }),
      ])
      if (error) throw error
      setApplications(data || [])
      setRequiredDocTypes(docTypes || [])
    } catch { toast.error('فشل تحميل الطلبات') }
  }

  /** Document slots for one application (required + any extra from admin message). */
  const getDocSlotsForApp = (app: any): { label: string; isExtra?: boolean }[] => {
    const slots: { label: string; isExtra?: boolean }[] = (requiredDocTypes || []).map((d) => ({ label: d.label_ar }))
    const msg = app?.documents_requested_message
    if (msg) {
      const lines = msg.split(/\n/).map((s: string) => s.trim()).filter(Boolean)
      let afterHeader = false
      for (const line of lines) {
        if (line.startsWith('المطلوب') || line === 'المطلوب:') { afterHeader = true; continue }
        if (afterHeader && (line.startsWith('•') || line.startsWith('-'))) {
          const label = line.replace(/^[•\-]\s*/, '').trim()
          if (label && !slots.some((s) => s.label === label)) slots.push({ label, isExtra: true })
        }
      }
    }
    return slots
  }

  const getDocForSlot = (app: any, docType: string) => {
    const docs = (app?.applicant_documents && Array.isArray(app.applicant_documents)) ? app.applicant_documents : []
    const forType = docs.filter((d: any) => (d.docType || '').trim() === docType)
    const rejected = forType.find((d: any) => d.status === 'rejected')
    const accepted = forType.find((d: any) => d.status === 'accepted')
    const pending = forType.find((d: any) => !d.status || d.status === 'pending_review')
    return rejected || accepted || pending || null
  }

  const getDocsForSlot = (app: any, docType: string): any[] => {
    const docs = (app?.applicant_documents && Array.isArray(app.applicant_documents)) ? app.applicant_documents : []
    return docs.filter((d: any) => (d.docType || '').trim() === docType)
  }

  /** Missing document labels for this application (for display on card). */
  /** Documents with 'pending_review' status are NOT missing - they're uploaded and waiting for review */
  /** Rejected documents are NOT missing - they need replacement, shown separately */
  const getMissingDocLabelsForApp = (app: any): string[] => {
    const slots = getDocSlotsForApp(app)
    return slots.filter((slot) => {
      const docs = getDocsForSlot(app, slot.label)
      // Missing if: no documents at all (not rejected, not pending, not accepted)
      return docs.length === 0
    }).map((s) => s.label)
  }

  /** Get rejected document labels with reasons for this application */
  /** Only returns slots where ALL documents are rejected (no pending/accepted documents exist) */
  const getRejectedDocLabelsForApp = (app: any): Array<{ label: string; reason?: string }> => {
    const slots = getDocSlotsForApp(app)
    return slots
      .map((slot) => {
        const docs = getDocsForSlot(app, slot.label)
        if (docs.length === 0) return null // No docs = missing, not rejected
        
        // Check if there are any non-rejected documents
        const hasNonRejected = docs.some((d: any) => d.status !== 'rejected' && (d.status === 'pending_review' || d.status === 'accepted' || !d.status))
        
        // Only return as rejected if ALL documents are rejected
        if (hasNonRejected) return null
        
        const rejectedDoc = docs.find((d: any) => d.status === 'rejected')
        if (rejectedDoc) {
          return { label: slot.label, reason: rejectedDoc.rejectionReason }
        }
        return null
      })
      .filter((item): item is { label: string; reason?: string } => item !== null)
  }

  const loadDirectPurchases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: purchases, error: e1 } = await supabase
        .from('project_direct_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (e1) throw e1
      const projectIds = [...new Set((purchases || []).map((p: any) => p.project_id))]
      const { data: projects } = await supabase.from('projects').select('id, name').in('id', projectIds)
      const nameById = (projects || []).reduce((acc: Record<string, string>, p: any) => { acc[p.id] = p.name || '—'; return acc }, {})
      setDirectPurchases((purchases || []).map((p: any) => ({ purchase: p, projectName: nameById[p.project_id] || '—' })))
    } catch { /* non-blocking */ }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const closeForm = () => {
    setShowForm(false)
    loadApplications()
    loadDirectPurchases()
    router.replace('/dashboard/applicant')
  }

  const sendFakeApplication = async () => {
    if (!user || sendingTest) return
    setSendingTest(true)
    try {
      const payload = buildMockApplicationPayload(user.id)
      const { data: inserted, error } = await supabase
        .from('housing_applications')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      if (inserted?.id) {
        try {
          await supabase.rpc('calculate_application_score', { app_id: inserted.id })
        } catch (_) {}
      }
      toast.success('تم إرسال طلب تجريبي')
      loadApplications()
    } catch (e: any) {
      toast.error(e?.message || 'فشل إرسال الطلب التجريبي')
    } finally {
      setSendingTest(false)
    }
  }

  const uploadHousingDocs = async (appId: string, files: FileList | File[] | null): Promise<boolean> => {
    const fileArray = files ? (Array.isArray(files) ? files : Array.from(files)) : []
    if (!user || !fileArray.length) return false
    const app = applications.find((a: any) => a.id === appId)
    const existing = (app?.applicant_documents && Array.isArray(app.applicant_documents)) ? app.applicant_documents : []
    setUploadingFiles(true)
    try {
      const uploaded: { docType: string; fileName: string; url: string; uploadedAt: string }[] = []
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const ext = file.name.split('.').pop() || 'bin'
        const path = `housing-documents/${user.id}/${appId}/${Date.now()}-${i}.${ext}`
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
        uploaded.push({ docType: file.name, fileName: file.name, url: publicUrl, uploadedAt: new Date().toISOString() })
      }
      const next = [...existing, ...uploaded]
      const { error } = await supabase.from('housing_applications').update({ applicant_documents: next }).eq('id', appId).eq('user_id', user.id)
      if (error) throw error
      setUploadingForId(null)
      setPendingListFiles(null)
      loadApplications()
      return true
    } catch (e: any) {
      toast.error(e?.message || 'فشل رفع المستندات')
      return false
    } finally {
      setUploadingFiles(false)
    }
  }

  const latestApp = applications[0]
  const isProfileTab = searchParams?.get('tab') === 'profile'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="spinner w-8 h-8 text-primary-600" />
      </div>
    )
  }

  const firstName = profile?.name?.trim().split(/\s+/)[0] || (user?.user_metadata?.full_name as string)?.trim().split(/\s+/)[0] || null
  if (showIntro === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="spinner w-8 h-8 text-primary-600" />
      </div>
    )
  }
  if (showIntro === true) {
    return (
      <IntroOnboarding
        userName={firstName}
        onDone={() => setShowIntro(false)}
      />
    )
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <header className="sticky top-0 z-20 shrink-0 bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center gap-3">
            <button type="button" onClick={closeForm} className="p-2 -m-2 rounded-xl hover:bg-gray-100 flex items-center text-gray-600 touch-manipulation">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-semibold text-gray-900">الاستمارة</span>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-28 relative z-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="min-h-full pointer-events-auto">
            <HousingApplicationForm />
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (isProfileTab) {
    return (
      <div className="min-h-screen bg-surface flex flex-col pb-32">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center">
            <span className="text-lg font-semibold text-gray-900">الملف الشخصي</span>
          </div>
        </header>
        <main className="max-w-[28rem] mx-auto w-full px-4 pt-6 flex-1">
          <div className="card mb-4">
            <p className="text-xs font-medium text-gray-500 mb-3">المعلومات الشخصية</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">الاسم</p>
                <p className="font-medium text-gray-900">{profile?.name || user?.user_metadata?.full_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">البريد الإلكتروني</p>
                <p className="font-medium text-gray-900">{user?.email ?? profile?.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">رقم الهاتف</p>
                <p className="font-medium text-gray-900" dir="ltr">{profile?.phone_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الولاية</p>
                <p className="font-medium text-gray-900">{profile?.governorate || '—'}</p>
              </div>
            </div>
          </div>
          <div className="card mb-4">
            <p className="text-xs font-medium text-gray-500 mb-3">ملخص الطلبات</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-lg font-bold text-primary-600">{applications.length}</p>
                <p className="text-xs text-gray-600">طلب سكن</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-lg font-bold text-primary-600">{directPurchases.length}</p>
                <p className="text-xs text-gray-600">طلب شراء</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => { await resetIntro(); setShowIntro(true) }}
            className="card mb-4 w-full text-right border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
          >
            <p className="text-sm font-medium text-primary-700">شاهد التعريف بالمنصة مرة أخرى</p>
            <p className="text-xs text-gray-500 mt-1">شرح قصير لما تقدمه دوموبات وكيف تستخدم اللوحة.</p>
          </button>
          <div className="card mb-4 bg-primary-50 border-primary-100">
            <p className="text-sm text-primary-900">للتواصل أو تعديل بياناتك، تواصل مع الدعم الفني.</p>
            <ul className="mt-3 space-y-1.5 text-sm text-primary-800">
              <li><a href="tel:+21670123456" className="hover:underline" dir="ltr">+216 70 123 456</a></li>
              <li><a href="tel:+21671234567" className="hover:underline" dir="ltr">+216 71 234 567</a></li>
              <li><a href="tel:+21698123456" className="hover:underline" dir="ltr">+216 98 123 456</a></li>
            </ul>
          </div>
          <button type="button" onClick={handleLogout} className="btn-secondary w-full flex items-center justify-center gap-2 text-gray-700 py-3">
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </main>
        <BottomNav />
      </div>
    )
  }

  // Helper to check if admin message is just a document list
  const isJustDocList = (msg: string | null | undefined): boolean => {
    if (!msg?.trim()) return false
    const lines = msg.trim().split(/\n/).map((s) => s.trim()).filter(Boolean)
    let hasDocListHeader = false
    let docListLines = 0
    let otherContentLines = 0
    
    for (const line of lines) {
      if (line.startsWith('المطلوب') || line === 'المطلوب:') {
        hasDocListHeader = true
        continue
      }
      if (line.startsWith('•') || line.startsWith('-')) {
        docListLines++
      } else if (line) {
        otherContentLines++
      }
    }
    
    return hasDocListHeader && docListLines > 0 && otherContentLines === 0
  }

  const anyDocActionNeeded = applications.some((app: any) => {
    const isApproved = app.status === 'approved'
    const isDocsRequested = app.status === 'documents_requested'
    const hasRejectedDoc = (app.applicant_documents && Array.isArray(app.applicant_documents)) && (app.applicant_documents as any[]).some((d: any) => d.status === 'rejected')
    const adminMessage = app.documents_requested_message?.trim()
    const isJustDocListMsg = isJustDocList(adminMessage)
    const hasAdminMsg = adminMessage && adminMessage.length > 10 && !['good', 'ok', 'تم', 'done'].includes(adminMessage.toLowerCase()) && !isJustDocListMsg
    const missing = getMissingDocLabelsForApp(app).length > 0
    const rejectedDocs = getRejectedDocLabelsForApp(app)
    // Action needed ONLY if there are actual issues:
    // - Rejected docs (all rejected, no pending/accepted), OR 
    // - Missing docs, OR 
    // - Admin request (but not for approved apps, and not if it's just a doc list)
    // NOTE: Status "documents_requested" alone doesn't trigger - only if there are actual missing/rejected docs
    return rejectedDocs.length > 0 || missing || (hasAdminMsg && !isApproved)
  })

  type AlertItem = { type: 'missing' | 'admin_request' | 'rejected'; appId: string; date: string; text: string }
  const alertsList: AlertItem[] = []
  applications.forEach((app: any) => {
    const isApproved = app.status === 'approved'
    const missingLabels = getMissingDocLabelsForApp(app)
    const rejectedDocs = getRejectedDocLabelsForApp(app)
    const adminMessage = app.documents_requested_message?.trim()
    const isJustDocListMsg = isJustDocList(adminMessage)
    const hasAdminMsg = adminMessage && adminMessage.length > 10 && !['good', 'ok', 'تم', 'done'].includes(adminMessage.toLowerCase()) && !isJustDocListMsg
    const dateStr = new Date(app.created_at).toLocaleDateString('ar-TN', { dateStyle: 'long' })
    
    // Only add alerts for missing/rejected docs, or admin requests (but not for approved apps, and not if it's just a doc list)
    if (missingLabels.length > 0) {
      alertsList.push({
        type: 'missing',
        appId: app.id,
        date: dateStr,
        text: `ناقص: ${missingLabels.join('، ')}`,
      })
    }
    if (hasAdminMsg && !isApproved) {
      // Format message - remove doc list header if present
      let displayMsg = adminMessage
      if (adminMessage.includes('المطلوب:')) {
        const parts = adminMessage.split('المطلوب:')
        if (parts.length > 1) {
          displayMsg = parts.slice(1).join('المطلوب:').trim()
        }
      }
      alertsList.push({
        type: 'admin_request',
        appId: app.id,
        date: dateStr,
        text: `طلب من الإدارة: ${displayMsg.substring(0, 60)}${displayMsg.length > 60 ? '...' : ''}`,
      })
    }
    if (rejectedDocs.length > 0) {
      const rejectedText = rejectedDocs.map(d => d.label).join('، ')
      alertsList.push({
        type: 'rejected',
        appId: app.id,
        date: dateStr,
        text: `مستندات مرفوضة: ${rejectedText}`,
      })
    }
  })

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-32">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <Image src="/logo.png" alt="DOMOBAT" width={112} height={112} className="rounded-2xl shrink-0" style={{ width: 'auto', height: 'auto' }} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAlertsPopup(true)}
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl border transition-colors ${
                alertsList.length > 0
                  ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                  : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
              }`}
              title={alertsList.length > 0 ? `${alertsList.length} تنبيه` : 'عرض التنبيهات'}
              aria-label="التنبيهات"
            >
              <AlertCircle className="w-5 h-5" />
              {alertsList.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {alertsList.length > 9 ? '9+' : alertsList.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={sendFakeApplication}
              disabled={sendingTest}
              className="text-[10px] font-medium text-gray-400 hover:text-gray-600 py-1 px-2 rounded border border-gray-200 hover:border-gray-300"
              title="إرسال طلب تجريبي"
            >
              {sendingTest ? '...' : 'Test'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[28rem] mx-auto w-full px-4 pt-4 flex-1">
        {/* ملخص عدد الطلبات فقط — بدون زر مكرر */}
        {(applications.length > 0 || directPurchases.length > 0) && (
          <div className="mb-5 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
            <span className="text-sm text-gray-600">
              {applications.length > 0 && <><span className="font-semibold text-gray-900">{applications.length}</span> طلب سكن</>}
              {applications.length > 0 && directPurchases.length > 0 && ' · '}
              {directPurchases.length > 0 && <><span className="font-semibold text-gray-900">{directPurchases.length}</span> طلب شراء</>}
            </span>
          </div>
        )}

        {/* طلباتي — بطاقات موحّدة */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-3">طلباتي</h2>

          {applications.length === 0 && directPurchases.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
              <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">لا توجد طلبات بعد</p>
              <p className="text-sm text-gray-500 mb-5">ابدأ باستمارة طلب سكن أو طلب شراء وحدة.</p>
              <Link href="/dashboard/applicant?form=1" className="inline-block py-3 px-6 rounded-2xl bg-primary-600 text-white font-semibold hover:bg-primary-700 active:scale-[0.98]">بدء استمارة طلب السكن</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: any) => {
                const statusLabel = STATUS_LABELS[app.status] || app.status
                const isApproved = app.status === 'approved'
                const isRejected = app.status === 'rejected'
                const isDocsRequested = app.status === 'documents_requested'
                const hasRejectedDoc = (app.applicant_documents && Array.isArray(app.applicant_documents)) && (app.applicant_documents as any[]).some((d: any) => d.status === 'rejected')
                const missingLabels = getMissingDocLabelsForApp(app)
                const rejectedDocs = getRejectedDocLabelsForApp(app)
                const adminMessage = app.documents_requested_message?.trim()
                const isJustDocListMsg = isJustDocList(adminMessage)
                const hasAdminRequest = adminMessage && adminMessage.length > 10 && !['good', 'ok', 'تم', 'done'].includes(adminMessage.toLowerCase()) && !isJustDocListMsg
                // needsDocAction ONLY if there are actual issues:
                // - Has rejected docs (all rejected, no pending/accepted), OR 
                // - Has missing docs, OR 
                // - Has admin request (but not for approved apps)
                // NOTE: Status "documents_requested" alone doesn't trigger - only if there are actual missing/rejected docs
                const needsDocAction = rejectedDocs.length > 0 || missingLabels.length > 0 || (hasAdminRequest && !isApproved)
                const statusColor = isApproved ? 'bg-green-100 text-green-800 border-green-200' : isDocsRequested ? 'bg-amber-100 text-amber-800 border-amber-200' : isRejected ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                const cardState = isRejected ? 'rejected' : needsDocAction ? 'documents' : isApproved ? 'approved' : 'default'
                // Determine alert type for color coding
                const alertType = rejectedDocs.length > 0 ? 'rejected' : missingLabels.length > 0 ? 'missing' : hasAdminRequest ? 'admin' : 'documents'
                const cardBorder = cardState === 'rejected' ? 'border border-red-300 border-r-4 border-r-red-500' : 
                  cardState === 'documents' ? (
                    alertType === 'rejected' ? 'border border-red-300 border-r-4 border-r-red-500' :
                    alertType === 'missing' ? 'border border-amber-300 border-r-4 border-r-amber-500' :
                    'border border-blue-300 border-r-4 border-r-blue-500'
                  ) : 
                  cardState === 'approved' ? 'border border-green-300 border-r-4 border-r-green-500' : 'border border-gray-200'
                const cardBg = cardState === 'rejected' ? 'bg-red-50/40' : 
                  cardState === 'documents' ? (
                    alertType === 'rejected' ? 'bg-red-50/40' :
                    alertType === 'missing' ? 'bg-amber-50/50' :
                    'bg-blue-50/50'
                  ) : 
                  cardState === 'approved' ? 'bg-green-50/30' : 'bg-white'
                const iconBg = cardState === 'rejected' ? 'bg-red-100' : 
                  cardState === 'documents' ? (
                    alertType === 'rejected' ? 'bg-red-100' :
                    alertType === 'missing' ? 'bg-amber-100' :
                    'bg-blue-100'
                  ) : 
                  cardState === 'approved' ? 'bg-green-100' : 'bg-primary-50'
                const iconColor = cardState === 'rejected' ? 'text-red-600' : 
                  cardState === 'documents' ? (
                    alertType === 'rejected' ? 'text-red-600' :
                    alertType === 'missing' ? 'text-amber-600' :
                    'text-blue-600'
                  ) : 
                  cardState === 'approved' ? 'text-green-600' : 'text-primary-600'
                const hasAdminMsg = !!(app.documents_requested_message?.trim())
                return (
                  <div key={app.id} className="group relative bg-white rounded-3xl border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover:border-primary-200">
                    {/* Status indicator bar */}
                    <div className={`absolute top-0 right-0 left-0 h-1 ${
                      isApproved ? 'bg-gradient-to-r from-green-500 to-green-400' :
                      isRejected ? 'bg-gradient-to-r from-red-500 to-red-400' :
                      needsDocAction ? (
                        rejectedDocs.length > 0 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                        missingLabels.length > 0 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                        'bg-gradient-to-r from-blue-500 to-blue-400'
                      ) : 'bg-gradient-to-r from-gray-300 to-gray-200'
                    }`} />
                    
                    <Link href={`/dashboard/applicant/application/${app.id}`} className="block">
                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`shrink-0 w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center ${iconColor} shadow-sm transition-transform group-hover:scale-105`}>
                            <Home className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-lg text-gray-900">طلب سكن</h3>
                              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 group-hover:text-primary-600 transition-colors" />
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1.5">
                              <span>{new Date(app.created_at).toLocaleDateString('ar-TN', { dateStyle: 'long' })}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status and Info */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border-2 ${
                            isApproved ? 'bg-green-50 text-green-700 border-green-200' :
                            isRejected ? 'bg-red-50 text-red-700 border-red-200' :
                            isDocsRequested ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                            {statusLabel}
                          </span>
                          {isApproved && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200">
                              <span>عرض التقدم</span>
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          )}
                        </div>

                        {/* Alert Section */}
                        {needsDocAction && (
                          <div className={`mt-4 rounded-2xl border-2 p-4 ${
                            rejectedDocs.length > 0 
                              ? 'border-red-200 bg-gradient-to-br from-red-50 to-red-50/50' 
                              : missingLabels.length > 0 
                                ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-50/50' 
                                : 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50/50'
                          }`}>
                            <div className="flex items-start gap-2 mb-3">
                              <div className={`p-1.5 rounded-lg ${
                                rejectedDocs.length > 0 ? 'bg-red-100' :
                                missingLabels.length > 0 ? 'bg-amber-100' :
                                'bg-blue-100'
                              }`}>
                                <AlertCircle className={`w-4 h-4 ${
                                  rejectedDocs.length > 0 ? 'text-red-600' :
                                  missingLabels.length > 0 ? 'text-amber-600' :
                                  'text-blue-600'
                                }`} />
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm font-bold mb-1 ${
                                  rejectedDocs.length > 0 ? 'text-red-900' :
                                  missingLabels.length > 0 ? 'text-amber-900' :
                                  'text-blue-900'
                                }`}>
                                  {rejectedDocs.length > 0 
                                    ? 'مستندات مرفوضة — يرجى استبدالها' 
                                    : missingLabels.length > 0 
                                      ? 'مستندات ناقصة — يجب رفعها' 
                                      : 'تنبيه من الإدارة'}
                                </p>
                                <div className="space-y-2 text-xs mt-2">
                                  {rejectedDocs.length > 0 && (
                                    <ul className="space-y-1.5">
                                      {rejectedDocs.map((item) => (
                                        <li key={item.label} className="flex items-start gap-2 text-red-800">
                                          <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                                          <div className="flex-1">
                                            <span className="font-semibold">{item.label}</span>
                                            {item.reason && (
                                              <span className="block text-red-700 mt-0.5 text-xs">سبب الرفض: {item.reason}</span>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  {missingLabels.length > 0 && (
                                    <div className="text-amber-800">
                                      <p className="font-medium mb-1">المستندات المطلوبة:</p>
                                      <p>{missingLabels.join('، ')}</p>
                                    </div>
                                  )}
                                  {hasAdminRequest && adminMessage && (
                                    <div className="text-blue-800">
                                      <p className="font-semibold mb-1">طلب من الإدارة:</p>
                                      <div className="space-y-1">
                                        {adminMessage.split('\n').map((line, idx) => {
                                          const trimmed = line.trim()
                                          if (trimmed.startsWith('المطلوب') || trimmed === 'المطلوب:') {
                                            return null
                                          }
                                          if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                                            return (
                                              <div key={idx} className="flex items-start gap-2">
                                                <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                <span>{trimmed.replace(/^[•\-]\s*/, '')}</span>
                                              </div>
                                            )
                                          }
                                          return <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                    {/* Upload Section */}
                    {isDocsRequested && (app.documents_requested_message) && (
                      <div className="border-t-2 border-gray-100 bg-gray-50/50 px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-gray-900">المطلوب منك</p>
                          {(app.applicant_documents && (app.applicant_documents as any[]).length > 0) && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                              <span>✓</span>
                              تم رفع {(app.applicant_documents as any[]).length} مستنداً
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap line-clamp-2">{app.documents_requested_message}</p>
                        {uploadingForId === app.id ? (
                          <div className="space-y-3">
                            {pendingListFiles?.appId === app.id && pendingListFiles.files.length > 0 ? (
                              <>
                                <div className="bg-white rounded-xl border border-gray-200 p-3">
                                  <p className="text-xs font-semibold text-gray-700 mb-2">الملفات المحددة:</p>
                                  <ul className="space-y-1.5 max-h-24 overflow-y-auto">
                                    {pendingListFiles.files.map((f, i) => (
                                      <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                        <FileText className="w-3.5 h-3.5 shrink-0 text-primary-600" />
                                        <span className="truncate flex-1">{f.name}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="flex gap-2 items-center flex-wrap">
                                  <label htmlFor={`list-upload-more-${app.id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-gray-200 text-sm font-medium text-gray-700 cursor-pointer hover:border-primary-300 hover:bg-primary-50 transition-all">
                                    <Upload className="w-4 h-4" />
                                    إضافة ملفات
                                  </label>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const ok = await uploadHousingDocs(app.id, pendingListFiles!.files)
                                      if (ok) toast.success('تم حفظ ورفع المستندات')
                                    }}
                                    disabled={uploadingFiles}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold disabled:opacity-50 hover:from-primary-700 hover:to-primary-800 shadow-sm transition-all"
                                  >
                                    {uploadingFiles ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        جاري الحفظ...
                                      </>
                                    ) : (
                                      <>
                                        <span>حفظ ورفع</span>
                                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">({pendingListFiles.files.length})</span>
                                      </>
                                    )}
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => { setPendingListFiles(null); setUploadingForId(null); }} 
                                    disabled={uploadingFiles} 
                                    className="px-4 py-2 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-all"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                                <input
                                  id={`list-upload-more-${app.id}`}
                                  type="file"
                                  multiple
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (!e.target.files?.length) return
                                    setPendingListFiles((prev) => ({
                                      appId: app.id,
                                      files: [...(prev?.appId === app.id ? prev.files : []), ...Array.from(e.target.files!)],
                                    }))
                                    e.target.value = ''
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  multiple
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="w-full text-sm px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                  onChange={(e) => {
                                    if (!e.target.files?.length) return
                                    setPendingListFiles({ appId: app.id, files: Array.from(e.target.files!) })
                                    e.target.value = ''
                                  }}
                                  disabled={uploadingFiles}
                                />
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.preventDefault(); setUploadingForId(null); setPendingListFiles(null); }} 
                                  className="w-full mt-2 px-4 py-2 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all"
                                >
                                  إلغاء
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <button 
                            type="button" 
                            onClick={(e) => { e.preventDefault(); setUploadingForId(app.id); }} 
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold hover:from-primary-700 hover:to-primary-800 shadow-sm transition-all"
                          >
                            <Upload className="w-4 h-4" />
                            إرفاق مستندات
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {directPurchases.map(({ purchase, projectName }) => {
                const statusLabel = PURCHASE_STATUS_LABELS[purchase.status] || purchase.status
                const isApproved = purchase.status === 'approved' || purchase.status === 'in_progress'
                const isRejectedPurchase = purchase.status === 'rejected'
                const statusColor = purchase.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' : isRejectedPurchase ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                const purchaseCardBorder = isRejectedPurchase ? 'border border-red-300 border-r-4 border-r-red-500' : isApproved ? 'border border-green-300 border-r-4 border-r-green-500' : 'border border-gray-200'
                const purchaseCardBg = isRejectedPurchase ? 'bg-red-50/40' : isApproved ? 'bg-green-50/30' : 'bg-white'
                const purchaseIconBg = isRejectedPurchase ? 'bg-red-100' : isApproved ? 'bg-green-100' : 'bg-primary-50'
                const purchaseIconColor = isRejectedPurchase ? 'text-red-600' : isApproved ? 'text-green-600' : 'text-primary-600'
                return (
                  <div key={purchase.id} className="group relative bg-white rounded-3xl border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover:border-primary-200">
                    {/* Status indicator bar */}
                    <div className={`absolute top-0 right-0 left-0 h-1 ${
                      isApproved ? 'bg-gradient-to-r from-green-500 to-green-400' :
                      isRejectedPurchase ? 'bg-gradient-to-r from-red-500 to-red-400' :
                      'bg-gradient-to-r from-gray-300 to-gray-200'
                    }`} />
                    
                    <Link href={`/dashboard/applicant/purchase/${purchase.id}`} className="block">
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`shrink-0 w-14 h-14 rounded-2xl ${purchaseIconBg} flex items-center justify-center ${purchaseIconColor} shadow-sm transition-transform group-hover:scale-105`}>
                            <ShoppingCart className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-lg text-gray-900">{projectName}</h3>
                              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 group-hover:text-primary-600 transition-colors" />
                            </div>
                            <p className="text-sm text-gray-500 mb-3">{new Date(purchase.created_at).toLocaleDateString('ar-TN', { dateStyle: 'long' })}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border-2 ${statusColor}`}>
                                {statusLabel}
                              </span>
                              {isApproved && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200">
                                  <span>عرض التقدم</span>
                                  <ChevronRight className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                            {purchase.documents_note && (
                              <p className="text-xs text-gray-600 mt-2 line-clamp-1">{purchase.documents_note}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* مساعدة قصيرة */}
        <div className="mb-6">
          <button type="button" onClick={() => setShowHelp(!showHelp)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
            <HelpCircle className="w-4 h-4" />
            كيف أملأ الاستمارة؟
            <ChevronDown className={`w-4 h-4 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
          </button>
          {showHelp && (
            <div className="mt-2 rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 space-y-2">
              <p><span className="font-medium text-gray-900">١.</span> اضغط «استمارة جديدة» واملأ الأقسام (يُحفظ تلقائياً).</p>
              <p><span className="font-medium text-gray-900">٢.</span> اضغط «إرسال الطلب» في النهاية.</p>
              <p><span className="font-medium text-gray-900">٣.</span> اضغط على أي طلب أعلاه لرؤية التفاصيل والمستندات والتقدم.</p>
            </div>
          )}
        </div>

        <Link
          href="/dashboard/applicant?form=1"
          className="block w-full py-4 rounded-2xl bg-primary-600 text-white text-center font-semibold shadow-soft hover:bg-primary-700 active:scale-[0.98] transition-colors"
        >
          {applications.length > 0 || directPurchases.length > 0 ? 'استمارة جديدة' : 'بدء استمارة طلب السكن'}
        </Link>
      </main>

      {/* نافذة جميع التنبيهات */}
      {showAlertsPopup && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAlertsPopup(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-[28rem] w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                جميع التنبيهات
              </h2>
              <button type="button" onClick={() => setShowAlertsPopup(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600" aria-label="إغلاق">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {alertsList.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">لا توجد تنبيهات.</p>
              ) : (
                <ul className="space-y-3">
                  {alertsList.map((alert, idx) => (
                    <li key={`${alert.appId}-${alert.type}-${idx}`} className="rounded-xl border border-gray-200 overflow-hidden">
                      <Link
                        href={`/dashboard/applicant/application/${alert.appId}`}
                        onClick={() => setShowAlertsPopup(false)}
                        className="block p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg ${
                            alert.type === 'rejected' ? 'bg-red-100 text-red-600' :
                            alert.type === 'admin_request' ? 'bg-orange-100 text-orange-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            <AlertCircle className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 mb-0.5">طلب سكن — {alert.date}</p>
                            <p className="text-sm text-gray-900">{alert.text}</p>
                            <p className="text-xs text-primary-600 font-medium mt-1.5">فتح الطلب ←</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

// Render content only after mount so navigation hooks (usePathname/useSearchParams) never run during SSR (fixes 500/useContext null)
export default function ApplicantDashboard() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="spinner w-8 h-8 text-primary-600" />
      </div>
    )
  }
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <div className="spinner w-8 h-8 text-primary-600" />
        </div>
      }
    >
      <ApplicantDashboardContent />
    </Suspense>
  )
}
