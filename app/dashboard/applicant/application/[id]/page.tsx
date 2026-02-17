'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ChevronRight, ExternalLink, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '@/components/BottomNav'

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المعالجة',
  in_progress: 'قيد المعالجة',
  documents_requested: 'طلب مستندات إضافية',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  documents_requested: 'bg-orange-100 text-orange-800 border-orange-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
}

export default function HousingApplicationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [app, setApp] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingForId, setUploadingForId] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      const { data, error } = await supabase
        .from('housing_applications')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error || !data) {
        toast.error('الطلب غير موجود')
        router.replace('/dashboard/applicant')
        return
      }
      setApp(data)
      setLoading(false)
    }
    load()
  }, [id, router])

  const uploadDocs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !app || !e.target.files?.length) return
    const existing = Array.isArray(app.applicant_documents) ? app.applicant_documents : []
    setUploadingForId(true)
    try {
      const uploaded: { docType: string; fileName: string; url: string; uploadedAt: string }[] = []
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i]
        const ext = file.name.split('.').pop() || 'bin'
        const path = `housing-documents/${user.id}/${app.id}/${Date.now()}-${i}.${ext}`
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
        uploaded.push({ docType: file.name, fileName: file.name, url: publicUrl, uploadedAt: new Date().toISOString() })
      }
      const next = [...existing, ...uploaded]
      const { error } = await supabase.from('housing_applications').update({ applicant_documents: next }).eq('id', app.id).eq('user_id', user.id)
      if (error) throw error
      setApp((prev: any) => ({ ...prev, applicant_documents: next }))
      toast.success('تم رفع المستندات')
    } catch (e: any) {
      toast.error(e?.message || 'فشل رفع المستندات')
    } finally {
      setUploadingForId(false)
      e.target.value = ''
    }
  }

  if (loading || !app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="spinner w-8 h-8 text-primary-600" />
      </div>
    )
  }

  const docs = (app.applicant_documents && Array.isArray(app.applicant_documents)) ? app.applicant_documents : []
  const statusClass = STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-800 border-gray-200'

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-28">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard/applicant" className="p-2 -m-2 rounded-xl hover:bg-gray-100 flex items-center text-gray-600">
            <ChevronRight className="w-5 h-5" />
          </Link>
          <span className="text-base font-semibold text-gray-900">تفاصيل طلب السكن</span>
        </div>
      </header>

      <main className="max-w-[28rem] mx-auto w-full px-4 py-6 flex-1">
        {/* الحالة */}
        <div className={`mb-6 rounded-2xl border-2 p-4 ${statusClass}`}>
          <p className="text-xs font-medium opacity-90 mb-1">الحالة</p>
          <p className="text-xl font-bold">{STATUS_LABELS[app.status] || app.status}</p>
          <p className="text-sm opacity-80 mt-1">{new Date(app.created_at).toLocaleDateString('ar-TN', { dateStyle: 'long' })}</p>
        </div>

        {/* طلب مستندات جديدة من الإدارة */}
        {app.status === 'documents_requested' && app.documents_requested_message && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-6">
            <p className="font-semibold text-amber-900 text-sm mb-2">مستندات مطلوبة من الإدارة</p>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{app.documents_requested_message}</p>
            <label className="mt-3 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-100 text-amber-900 text-sm font-medium cursor-pointer hover:bg-amber-200">
              <Upload className="w-4 h-4" />
              {uploadingForId ? 'جاري الرفع...' : 'إرفاق مستندات'}
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={uploadDocs} disabled={uploadingForId} />
            </label>
          </div>
        )}

        {/* المستندات التي أرسلتها */}
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">المستندات المرفوعة</h3>
          {docs.length === 0 ? (
            <p className="text-sm text-gray-500">لم يتم رفع مستندات بعد.</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700 truncate">{d.fileName || d.docType || `مستند ${i + 1}`}</span>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-sm flex items-center gap-1 shrink-0">
                    <ExternalLink className="w-4 h-4" /> فتح
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* بيانات الطلب */}
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">بيانات الطلب</h3>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-gray-500">الاسم</dt><dd className="font-medium text-gray-900">{[app.first_name, app.last_name].filter(Boolean).join(' ') || '—'}</dd></div>
            <div><dt className="text-gray-500">البريد</dt><dd className="font-medium text-gray-900">{app.email || '—'}</dd></div>
            <div><dt className="text-gray-500">رقم البطاقة</dt><dd className="font-medium text-gray-900">{app.national_id || '—'}</dd></div>
            <div><dt className="text-gray-500">تاريخ الولادة</dt><dd className="font-medium text-gray-900">{app.date_of_birth ? new Date(app.date_of_birth).toLocaleDateString('ar-TN') : '—'}</dd></div>
            <div><dt className="text-gray-500">الولاية</dt><dd className="font-medium text-gray-900">{app.governorate || '—'}</dd></div>
            {app.net_monthly_income != null && <div><dt className="text-gray-500">الدخل الشهري (د.ت)</dt><dd className="font-medium text-gray-900">{app.net_monthly_income}</dd></div>}
            {app.maximum_budget != null && <div><dt className="text-gray-500">القدرة على الدفع (د.ت)</dt><dd className="font-medium text-gray-900">{app.maximum_budget}</dd></div>}
            {app.required_area != null && <div><dt className="text-gray-500">المساحة المطلوبة (م²)</dt><dd className="font-medium text-gray-900">{app.required_area}</dd></div>}
          </dl>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
