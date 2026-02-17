'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import HousingApplicationForm from '@/components/HousingApplicationForm'
import { FileText, LogOut, ChevronLeft, ChevronRight, ChevronDown, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '@/components/BottomNav'

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

function ApplicantDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [directPurchases, setDirectPurchases] = useState<{ purchase: any; projectName: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [uploadingForId, setUploadingForId] = useState<string | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)

  useEffect(() => {
    if (searchParams.get('form') === '1') setShowForm(true)
    if (searchParams.get('tab') === 'profile') setShowHelp(false)
  }, [searchParams])

  useEffect(() => {
    checkUser()
    loadApplications()
    loadDirectPurchases()
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
      const { data, error } = await supabase
        .from('housing_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setApplications(data || [])
    } catch { toast.error('فشل تحميل الطلبات') }
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

  const uploadHousingDocs = async (appId: string, files: FileList | null) => {
    if (!user || !files?.length) return
    const app = applications.find((a: any) => a.id === appId)
    const existing = (app?.applicant_documents && Array.isArray(app.applicant_documents)) ? app.applicant_documents : []
    setUploadingFiles(true)
    try {
      const uploaded: { docType: string; fileName: string; url: string; uploadedAt: string }[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
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
      toast.success('تم رفع المستندات')
      setUploadingForId(null)
      loadApplications()
    } catch (e: any) {
      toast.error(e?.message || 'فشل رفع المستندات')
    } finally {
      setUploadingFiles(false)
    }
  }

  const latestApp = applications[0]
  const isProfileTab = searchParams.get('tab') === 'profile'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="spinner w-8 h-8 text-primary-600" />
      </div>
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
          <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">الملف الشخصي</span>
            <Link href="/dashboard/applicant" className="text-primary-600 text-sm font-medium">تم</Link>
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
                <p className="font-medium text-gray-900">{profile?.phone_number || '—'}</p>
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
          <div className="card mb-4 bg-primary-50 border-primary-100">
            <p className="text-sm text-primary-900">للتواصل أو تعديل بياناتك، تواصل مع الدعم الفني.</p>
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

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-32">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center justify-between">
          <Image src="/logo.png" alt="DOMOBAT" width={112} height={112} className="rounded-2xl" style={{ width: 'auto', height: 'auto' }} />
          <Link href="/dashboard/applicant?form=1" className="text-sm font-medium text-primary-600 py-1.5 px-3 rounded-lg hover:bg-primary-50">
            استمارة جديدة
          </Link>
        </div>
      </header>

      <main className="max-w-[28rem] mx-auto w-full px-4 pt-4 flex-1">
        {/* حالة أحدث طلب سكن فقط */}
        <div className="card-gradient mb-4">
          <p className="text-white/90 text-xs font-medium mb-0.5">أحدث طلب سكن</p>
          {!latestApp ? (
            <p className="text-lg font-bold text-white">لا يوجد طلب</p>
          ) : (
            <>
              <p className="text-lg font-bold text-white">{STATUS_LABELS[latestApp.status] || latestApp.status}</p>
              <p className="text-white/80 text-xs">{new Date(latestApp.created_at).toLocaleDateString('ar-TN')}</p>
            </>
          )}
        </div>

        {/* طلباتي: تفصيل */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">طلباتي</h2>

          {/* طلبات السكن */}
          <div className="card mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">طلب السكن (استمارة)</p>
            {applications.length === 0 ? (
              <p className="text-sm text-gray-600">لا توجد استمارات بعد.</p>
            ) : (
              <ul className="space-y-3">
                {applications.map((app: any) => (
                  <li key={app.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <Link href={`/dashboard/applicant/application/${app.id}`} className="block flex justify-between items-start gap-2 hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{STATUS_LABELS[app.status] || app.status}</p>
                        <p className="text-xs text-gray-500">{new Date(app.created_at).toLocaleDateString('ar-TN')}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    </Link>
                    {app.status === 'documents_requested' && (app.documents_requested_message) && (
                      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 p-2">
                        <p className="text-xs font-medium text-amber-900">المطلوب منك:</p>
                        <p className="text-xs text-amber-800 whitespace-pre-wrap mt-0.5">{app.documents_requested_message}</p>
                        {uploadingForId === app.id ? (
                          <div className="mt-2 space-y-2">
                            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="text-xs" onChange={(e) => uploadHousingDocs(app.id, e.target.files)} disabled={uploadingFiles} />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setUploadingForId(null)} className="text-xs text-gray-600">إلغاء</button>
                              {uploadingFiles && <span className="text-xs text-gray-500">جاري الرفع...</span>}
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setUploadingForId(app.id)} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary-600">
                            <Upload className="w-3.5 h-3.5" /> إرفاق مستندات
                          </button>
                        )}
                        {(app.applicant_documents && (app.applicant_documents as any[]).length > 0) && (
                          <p className="text-xs text-green-700 mt-1">تم رفع {(app.applicant_documents as any[]).length} مستنداً.</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* طلبات الشراء المباشر */}
          <div className="card mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">طلب شراء مباشر</p>
            {directPurchases.length === 0 ? (
              <p className="text-sm text-gray-600">لا توجد طلبات شراء.</p>
            ) : (
              <ul className="space-y-3">
                {directPurchases.map(({ purchase, projectName }) => (
                  <li key={purchase.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <Link href={`/dashboard/applicant/purchase/${purchase.id}`} className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{projectName}</p>
                          <p className="text-xs text-gray-500">{PURCHASE_STATUS_LABELS[purchase.status] || purchase.status} · {new Date(purchase.created_at).toLocaleDateString('ar-TN')}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      </div>
                      {purchase.documents_note && (
                        <p className="text-xs text-gray-600 mt-1">{purchase.documents_note}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* مساعدة مطوية */}
        <button type="button" onClick={() => setShowHelp(!showHelp)} className="flex items-center gap-2 text-gray-500 text-xs mb-4">
          <ChevronDown className={`w-4 h-4 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
          كيف أملأ الاستمارة؟
        </button>
        {showHelp && (
          <div className="card mb-6 bg-gray-50 border-gray-100">
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600">
              <li>اضغط «استمارة جديدة» أعلى الصفحة واملأ الأقسام (يُحفظ تلقائياً).</li>
              <li>اضغط «إرسال الطلب» في النهاية.</li>
              <li>اضغط على أي طلب في «طلباتي» لرؤية التفاصيل والمستندات.</li>
            </ol>
          </div>
        )}

        <Link
          href="/dashboard/applicant?form=1"
          className="block w-full py-4 rounded-2xl bg-primary-600 text-white text-center font-semibold shadow-soft active:scale-[0.98]"
        >
          {latestApp ? 'استمارة جديدة' : 'بدء استمارة طلب السكن'}
        </Link>
      </main>

      <BottomNav />
    </div>
  )
}

export default function ApplicantDashboard() {
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
