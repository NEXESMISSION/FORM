'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ChevronRight, ExternalLink, Upload, File, X } from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '@/components/BottomNav'

const PURCHASE_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة',
  in_progress: 'قيد المتابعة',
  documents_requested: 'مطلوب إرفاق مستندات',
  documents_rejected: 'مستندات مرفوضة — يرجى الاستبدال',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

const PURCHASE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-primary-100 text-primary-800 border-primary-200',
  documents_requested: 'bg-amber-100 text-amber-800 border-amber-200',
  documents_rejected: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
}

const DEFAULT_PROGRESS_STAGE_LABELS: Record<string, string> = {
  study: 'دراسة المشروع',
  design: 'التصميم',
  construction: 'البناء',
  finishing: 'التشطيب',
  ready: 'جاهز للتسليم',
}
const PROGRESS_STAGES_ORDER = ['study', 'design', 'construction', 'finishing', 'ready'] as const

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function normalizePurchaseId(params: unknown): string | null {
  const raw = params && typeof params === 'object' && 'id' in params ? (params as { id?: unknown }).id : null
  const s = Array.isArray(raw) ? raw[0] : raw
  const id = typeof s === 'string' ? s.trim() : ''
  return id && UUID_REGEX.test(id) ? id : null
}

export default function DirectPurchaseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = normalizePurchaseId(params)
  const [purchase, setPurchase] = useState<any>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [projectCustomStages, setProjectCustomStages] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [progressStageLabels, setProgressStageLabels] = useState<Record<string, string>>(() => ({ ...DEFAULT_PROGRESS_STAGE_LABELS }))
  const [uploading, setUploading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<{ file: File; id: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      const { data: row, error } = await supabase
        .from('project_direct_purchases')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error || !row) {
        if (error) console.error('[purchase detail]', error.message, error.details)
        toast.error('الطلب غير موجود')
        router.replace('/dashboard?view=requests')
        return
      }
      setPurchase(row)
      if (row.project_id) {
        const { data: proj } = await supabase.from('projects').select('name, custom_progress_stages').eq('id', row.project_id).single()
        setProjectName(proj?.name || '—')
        setProjectCustomStages(Array.isArray(proj?.custom_progress_stages) ? proj.custom_progress_stages : null)
      }
      const { data: stages } = await supabase.from('progress_stages').select('value, label_ar').not('value', 'is', null).order('sort_order', { ascending: true })
      if (stages?.length) {
        const fromDb = Object.fromEntries(stages.map((s: { value: string; label_ar: string }) => [s.value, s.label_ar]))
        setProgressStageLabels(prev => ({ ...DEFAULT_PROGRESS_STAGE_LABELS, ...fromDb }))
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading || !purchase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="spinner w-8 h-8 text-primary-600" />
      </div>
    )
  }

  const isDocsRequested = purchase.status === 'documents_requested' || purchase.status === 'documents_rejected'
  const docs = (purchase.documents && Array.isArray(purchase.documents)) ? purchase.documents : []
  const docsParsed = docs.map((item: any) => typeof item === 'string' ? (() => { try { return JSON.parse(item) } catch { return {} } })() : item)
  const hasRejectedDoc = docsParsed.some((d: any) => d.status === 'rejected')
  const showUploadSection = isDocsRequested || hasRejectedDoc

  const statusClass = (() => {
    if (purchase.status === 'documents_requested' || purchase.status === 'documents_rejected') return 'bg-amber-100 text-amber-800 border-amber-200'
    return PURCHASE_STATUS_COLORS[purchase.status] || 'bg-gray-100 text-gray-800 border-gray-200'
  })()
  const formData = purchase.form_data && typeof purchase.form_data === 'object' ? purchase.form_data : {}

  const safePathSegment = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'doc'
  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setPendingFiles(prev => [...prev, ...files.map(f => ({ file: f, id: `${f.name}-${Date.now()}-${Math.random()}` }))])
    if (e.target) e.target.value = ''
  }
  const removePending = (id: string) => setPendingFiles(prev => prev.filter(p => p.id !== id))
  const uploadAndSave = async () => {
    if (pendingFiles.length === 0) {
      toast.error('اختر ملفات أولاً')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUploading(true)
    try {
      const existingRaw = Array.isArray(purchase.documents) ? purchase.documents : []
      const existingAsObjects = existingRaw.map((item: any) =>
        typeof item === 'string' ? (() => { try { return JSON.parse(item) } catch { return { url: item } } })() : (item && typeof item === 'object' ? item : { url: item })
      )
      const newEntries: any[] = []
      for (let i = 0; i < pendingFiles.length; i++) {
        const { file } = pendingFiles[i]
        const ext = file.name.split('.').pop() || 'bin'
        const name = safePathSegment(file.name.slice(0, 30))
        const path = `purchase-documents/${user.id}/${purchase.project_id}/${name}-${Date.now()}-${i}.${ext}`
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) throw new Error(`فشل رفع ${file.name}`)
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
        newEntries.push({
          docType: 'مستند مرفق',
          fileName: file.name,
          fileSize: file.size,
          url: publicUrl,
          uploadedAt: new Date().toISOString(),
          status: 'pending_review',
        })
      }
      const updatedDocs = [...existingAsObjects, ...newEntries]
      const documentsPayload = JSON.parse(JSON.stringify(updatedDocs)) as typeof updatedDocs
      const { error } = await supabase.from('project_direct_purchases').update({ documents: documentsPayload }).eq('id', purchase.id).eq('user_id', user.id)
      if (error) throw error
      setPurchase((prev: any) => ({ ...prev, documents: updatedDocs }))
      setPendingFiles([])
      toast.success('تم رفع المستندات. ستتم مراجعتها من الإدارة.')
    } catch (err: any) {
      if (err?.message) console.error('[purchase documents update]', err.message, err.details)
      toast.error(err?.message || 'فشل رفع المستندات')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-28">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard?view=requests" className="p-2 -m-2 rounded-xl hover:bg-gray-100 flex items-center text-gray-600">
            <ChevronRight className="w-5 h-5" />
          </Link>
          <span className="text-base font-semibold text-gray-900">تفاصيل طلب الشراء</span>
        </div>
      </header>

      <main className="max-w-[28rem] mx-auto w-full px-4 py-6 flex-1">
        {/* المشروع والحالة */}
        <div className={`mb-6 rounded-2xl border-2 p-4 ${statusClass}`}>
          <p className="text-xs font-medium opacity-90 mb-1">المشروع</p>
          <p className="text-xl font-bold">{projectName}</p>
          <p className="text-sm font-medium mt-2">{PURCHASE_STATUS_LABELS[purchase.status] || purchase.status}</p>
          <p className="text-sm opacity-80 mt-1">{new Date(purchase.created_at).toLocaleDateString('ar-TN', { dateStyle: 'long' })}</p>
        </div>

        {/* ملاحظة من الإدارة إن وجدت */}
        {(purchase.admin_notes || (showUploadSection && (purchase.documents_note || purchase.admin_notes))) && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-6">
            <p className="font-semibold text-amber-900 text-sm mb-2">ملاحظة من الإدارة</p>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{purchase.admin_notes || purchase.documents_note || ''}</p>
          </div>
        )}

        {/* إرفاق / استبدال المستندات عندما يُطلب من المستخدم */}
        {showUploadSection && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-5 mb-6">
            <h3 className="text-base font-bold text-amber-900 mb-1">إرفاق المستندات أو استبدال المرفوضة</h3>
            <p className="text-sm text-amber-800 mb-4">ارفع الملفات المطلوبة (PDF أو صور). يمكنك إرفاق عدة ملفات ثم الضغط على «إرسال».</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={addFiles}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 border-2 border-dashed border-amber-300 rounded-xl bg-white text-amber-800 font-medium flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              اختر ملفات
            </button>
            {pendingFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {pendingFiles.map(({ file, id }) => (
                  <div key={id} className="flex items-center gap-2 py-2 px-3 bg-white rounded-lg border border-amber-200">
                    <File className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-sm text-gray-800 flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    <button type="button" onClick={() => removePending(id)} className="p-1 rounded hover:bg-red-100 text-red-600" aria-label="إزالة">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={uploadAndSave}
                  disabled={uploading}
                  className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>جاري الرفع...</>
                  ) : (
                    <>إرسال المستندات</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* تتبع التقدم — للموافَق عليهم أو قيد المتابعة */}
        {(purchase.status === 'approved' || purchase.status === 'in_progress') && (
          <div className="card mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">تتبع تقدم طلبك</h3>
            <p className="text-xs text-gray-500 mb-4">تحديثات من الإدارة تظهر هنا فور رفعها.</p>

            <div className="space-y-2 mb-4">
              {(projectCustomStages && projectCustomStages.length > 0
                ? projectCustomStages.map((l: string) => ({ key: l, label: l }))
                : PROGRESS_STAGES_ORDER.map(k => ({ key: k, label: progressStageLabels[k] || k }))
              ).map(({ key, label }, idx) => {
                const isCustom = projectCustomStages && projectCustomStages.length > 0
                const currentIndex = isCustom && purchase.progress_stage
                  ? projectCustomStages.indexOf(purchase.progress_stage)
                  : purchase.progress_stage ? PROGRESS_STAGES_ORDER.indexOf(purchase.progress_stage as typeof PROGRESS_STAGES_ORDER[number]) : -1
                const isCompleted = currentIndex >= 0 && idx < currentIndex
                const isCurrent = purchase.progress_stage === key
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border-2 transition-colors ${
                      isCurrent ? 'border-primary-400 bg-primary-50' : isCompleted ? 'border-green-200 bg-green-50/80' : 'border-gray-100 bg-gray-50/50'
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isCurrent ? 'bg-primary-600 text-white' : isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? '✓' : idx + 1}
                    </span>
                    <span className={`text-sm font-medium ${isCurrent ? 'text-primary-900' : isCompleted ? 'text-green-800' : 'text-gray-600'}`}>
                      {label}
                    </span>
                    {isCurrent && <span className="text-xs text-primary-600 font-medium mr-auto">المرحلة الحالية</span>}
                  </div>
                )
              })}
            </div>

            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col">
                  <p className="text-xs text-gray-500">نسبة الإنجاز</p>
                  {purchase.progress_stage && (
                    <p className="text-xs font-medium text-primary-700 mt-0.5">
                      {progressStageLabels[purchase.progress_stage] || purchase.progress_stage}
                    </p>
                  )}
                </div>
                <p className="text-sm font-bold text-primary-600">{purchase.progress_percentage ?? 0}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, purchase.progress_percentage ?? 0))}%` }}
                />
              </div>
            </div>

            {purchase.progress_notes && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-1">آخر تحديث من الإدارة</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{purchase.progress_notes}</p>
              </div>
            )}

            {(purchase.progress_updated_at || (purchase.progress_stage && purchase.updated_at)) && (
              <p className="text-xs text-gray-400 mt-3">
                آخر تحديث: {new Date(purchase.progress_updated_at || purchase.updated_at).toLocaleDateString('ar-TN', { dateStyle: 'medium' })} — {new Date(purchase.progress_updated_at || purchase.updated_at).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}

        {/* المستندات المرفوعة */}
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">المستندات المرفوعة</h3>
          {docs.length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد مستندات مرفوعة.</p>
          ) : (
            <ul className="space-y-3">
              {docs.map((item: any, i: number) => {
                const parsed = typeof item === 'string' ? (() => { try { return JSON.parse(item) } catch { return { url: item, fileName: `مستند ${i + 1}` } } })() : item
                const url = parsed?.url || parsed
                const name = parsed?.fileName || parsed?.docType || `مستند ${i + 1}`
                const status = parsed?.status || 'pending_review'
                const isRejected = status === 'rejected'
                return (
                  <li key={i} className={`rounded-xl border p-3 ${isRejected ? 'border-red-200 bg-red-50/80' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-900 truncate block">{name}</span>
                        {parsed?.docType && parsed.docType !== name && <span className="text-xs text-gray-500">{parsed.docType}</span>}
                        {isRejected && parsed?.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1">سبب الرفض: {parsed.rejectionReason}</p>
                        )}
                        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs ${status === 'accepted' ? 'bg-green-100 text-green-800' : isRejected ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700'}`}>
                          {status === 'accepted' ? 'مقبول' : isRejected ? 'مرفوض — يرجى تحديث المستند' : 'قيد المراجعة'}
                        </span>
                      </div>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-sm flex items-center gap-1 shrink-0">
                          <ExternalLink className="w-4 h-4" /> فتح
                        </a>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* بيانات الطلب (form_data) */}
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">بيانات الطلب</h3>
          {Object.keys(formData).length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد بيانات إضافية.</p>
          ) : (
            <dl className="space-y-3 text-sm">
              {Object.entries(formData)
                .filter(([key, value]) => {
                  if (key !== 'email') return true
                  const v = value != null ? String(value) : ''
                  return !v || !v.includes('@domobat.user')
                })
                .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-gray-500">{key === 'full_name' ? 'الاسم' : key === 'phone' ? 'الهاتف' : key === 'cin' ? 'البطاقة' : key === 'email' ? 'البريد' : key === 'notes' ? 'ملاحظات' : key}</dt>
                  <dd className="font-medium text-gray-900">{String(value || '—')}</dd>
                </div>
              ))}
            </dl>
          )}
          {purchase.documents_note && (
            <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">{purchase.documents_note}</p>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
