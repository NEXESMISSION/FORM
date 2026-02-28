'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ChevronRight, ExternalLink, Upload, FileText, AlertCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import BottomNav from '@/components/BottomNav'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import {
  getDocumentSlots,
  getDocsForSlot,
  getSlotStatus,
  calculateAlerts,
  getAlertColors,
  getSlotColors,
  parseAdminMessage,
} from '@/lib/utils/documentStatus'
import { fileListToArray, validateFiles, formatFileSize } from '@/lib/utils/fileUpload'
import type { ApplicantDocument, DocumentSlot } from '@/lib/types/documents'

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المعالجة',
  in_progress: 'قيد المعالجة',
  documents_requested: 'طلب مستندات إضافية',
  documents_rejected: 'مستندات مرفوضة - مطلوب استبدال',
  approved: 'مقبول',
  rejected: 'مرفوض',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  in_progress: 'bg-primary-100 text-primary-800 border-primary-200',
  documents_requested: 'bg-orange-100 text-orange-800 border-orange-200',
  documents_rejected: 'bg-red-100 text-red-800 border-red-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
}

const MARITAL_LABELS: Record<string, string> = {
  single: 'أعزب',
  married: 'متزوج',
  divorced: 'مطلق',
  widowed: 'أرمل',
}

const DEFAULT_PROGRESS_STAGE_LABELS: Record<string, string> = {
  study: 'دراسة المشروع',
  design: 'التصميم',
  construction: 'البناء',
  finishing: 'التشطيب',
  ready: 'جاهز للتسليم',
}

const PROGRESS_STAGES_ORDER = ['study', 'design', 'construction', 'finishing', 'ready'] as const

export default function HousingApplicationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [app, setApp] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [progressStageLabels, setProgressStageLabels] = useState<Record<string, string>>(() => ({ ...DEFAULT_PROGRESS_STAGE_LABELS }))
  const [uploadingForDocType, setUploadingForDocType] = useState<string | null>(null)
  const [confirmUploadFor, setConfirmUploadFor] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ url: string; fileName: string } | null>(null)
  const [requiredDocTypes, setRequiredDocTypes] = useState<{ id: string; label_ar: string }[]>([])
  const [pendingByDocType, setPendingByDocType] = useState<Record<string, File[]>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})


  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      const [{ data: appData, error }, { data: docTypes }, { data: stages }] = await Promise.all([
        supabase.from('housing_applications').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
        supabase.from('required_document_types').select('id, label_ar').eq('active', true).order('sort_order', { ascending: true }),
        supabase.from('progress_stages').select('value, label_ar').not('value', 'is', null).order('sort_order', { ascending: true }),
      ])
      if (error || !appData) {
        toast.error('الطلب غير موجود')
        router.replace('/dashboard?view=requests')
        return
      }
      setApp(appData)
      setRequiredDocTypes(docTypes || [])
      if (stages?.length) {
        const fromDb = Object.fromEntries(stages.map((s: { value: string; label_ar: string }) => [s.value, s.label_ar]))
        setProgressStageLabels(prev => ({ ...DEFAULT_PROGRESS_STAGE_LABELS, ...fromDb }))
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  const handleFileSelectFor = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) {
      return
    }
    
    // Convert FileList to Array immediately and store in a variable
    // This ensures we capture the files before any potential re-renders
    const filesArray: File[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList.item(i)
      if (file) {
        filesArray.push(file)
      }
    }
    
    if (filesArray.length === 0) {
      return
    }
    
    // Update state with the files array
    setPendingByDocType((prev) => {
      const currentPending = prev[docType] || []
      const newPending = [...currentPending, ...filesArray]
      
      return {
        ...prev,
        [docType]: newPending,
      }
    })
    
    // Reset input value AFTER state update
    setTimeout(() => {
      if (e.target) {
        e.target.value = ''
      }
    }, 100)
  }

  const triggerFileInput = (docType: string) => {
    const input = fileInputRefs.current[docType]
    if (input) {
      input.click()
    }
  }

  const cancelPendingFor = (docType: string) => {
    setPendingByDocType((prev) => {
      const next = { ...prev }
      delete next[docType]
      return next
    })
  }

  const uploadForDocType = async (docType: string): Promise<boolean> => {
    const files = pendingByDocType[docType]
    
    if (!user || !app || !files?.length) {
      return false
    }
    
    const existing = Array.isArray(app.applicant_documents) ? app.applicant_documents : []
    setUploadingForDocType(docType)
    
    try {
      const uploaded: { id: string; docType: string; fileName: string; url: string; uploadedAt: string; status?: string }[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop() || 'bin'
        const path = `housing-documents/${user.id}/${app.id}/${Date.now()}-${i}.${ext}`
        
        const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) {
          throw upErr
        }
        
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
        
        uploaded.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          docType,
          fileName: file.name,
          url: publicUrl,
          uploadedAt: new Date().toISOString(),
          status: 'pending_review',
        })
      }
      
      const next = [...existing, ...uploaded]
      
      const { error } = await supabase.from('housing_applications').update({ applicant_documents: next }).eq('id', app.id).eq('user_id', user.id)
      if (error) {
        throw error
      }
      
      setApp((prev: any) => ({ ...prev, applicant_documents: next }))
      cancelPendingFor(docType)
      return true
    } catch (e: any) {
      toast.error(e?.message || 'فشل رفع المستند')
      return false
    } finally {
      setUploadingForDocType(null)
    }
  }

  // Get document slots using utility function
  const getDocSlots = (): DocumentSlot[] => {
    return getDocumentSlots(requiredDocTypes, app?.documents_requested_message)
  }

  // Helper to get documents for a slot using utility function
  const getDocsForSlotHelper = (slotLabel: string): ApplicantDocument[] => {
    const docs = (app?.applicant_documents && Array.isArray(app.applicant_documents)) 
      ? app.applicant_documents as ApplicantDocument[]
      : []
    return getDocsForSlot(docs, slotLabel)
  }

  if (loading || !app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gold-50">
        <div className="spinner w-8 h-8 text-gold-600" />
      </div>
    )
  }

  const statusClass = STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-800 border-gray-200'
  const docSlots = getDocSlots()
  const docsList = (app?.applicant_documents && Array.isArray(app.applicant_documents)) 
    ? app.applicant_documents as ApplicantDocument[]
    : []
  
  // Use utility functions for document status calculations
  const adminMessageInfo = parseAdminMessage(app?.documents_requested_message)
  const hasAdminRequest = adminMessageInfo.hasContent && !adminMessageInfo.isJustDocList
  const adminMessage = adminMessageInfo.formattedMessage
  
  // Calculate alerts using utility function
  const alerts = calculateAlerts(docsList, docSlots, app?.documents_requested_message, app.status, app.id)
  const hasAlert = alerts.length > 0
  
  // Filter alerts for display
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' || a.severity === 'warning')
  const showDocsAlert = criticalAlerts.length > 0 || alerts.some((a) => a.type === 'admin_request' && app.status !== 'approved')
  
  // Get specific alert types for easier access
  const missingAlert = alerts.find((a) => a.type === 'missing')
  const rejectedAlert = alerts.find((a) => a.type === 'rejected')
  const rejectedInfoAlert = alerts.find((a) => a.type === 'rejected_info')
  const adminRequestAlert = alerts.find((a) => a.type === 'admin_request')

  // Compute rejected slots and slots with rejected docs
  const rejectedSlots = docSlots.filter(slot => {
    const docs = getDocsForSlotHelper(slot.label)
    return docs.some((d: any) => d.status === 'rejected') && !docs.some((d: any) => d.status === 'accepted')
  })
  
  const slotsWithRejectedDocs = docSlots.filter(slot => {
    const docs = getDocsForSlotHelper(slot.label)
    return docs.some((d: any) => d.status === 'rejected') && docs.some((d: any) => d.status === 'accepted')
  })
  
  const missingSlots = docSlots.filter(slot => {
    const docs = getDocsForSlotHelper(slot.label)
    return docs.length === 0 || !docs.some((d: any) => d.status === 'accepted')
  })
  
  const hasMissing = missingAlert !== undefined

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-28">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-[28rem] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard?view=requests" className="p-2 -m-2 rounded-xl hover:bg-gray-100 flex items-center text-gray-600" aria-label="العودة">
            <ChevronRight className="w-5 h-5" />
          </Link>
          <span className="text-lg font-bold text-gray-900 flex-1">تفاصيل طلب السكن</span>
          {hasAlert && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              إجراء مطلوب
            </span>
          )}
        </div>
      </header>

      <main className="max-w-[28rem] mx-auto w-full px-4 py-5 flex-1 space-y-5">
        {/* بطاقة العنوان والحالة */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">طلب السكن</p>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className={`inline-flex px-4 py-2 rounded-xl text-base font-bold border-2 ${statusClass}`}>
              {STATUS_LABELS[app.status] || app.status}
            </span>
            <span className="text-sm text-gray-500">
              {new Date(app.created_at).toLocaleDateString('ar-TN', { dateStyle: 'long' })}
            </span>
          </div>
          {showDocsAlert && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-amber-900 mb-1">خطوتك التالية</p>
              <p className="text-sm text-amber-800">
                {rejectedSlots.length > 0
                  ? 'استبدال المستندات المرفوضة في قسم المستندات أدناه.'
                  : hasMissing
                    ? 'ارفع المستندات الناقصة في قسم المستندات أدناه.'
                    : 'راجع قسم المستندات أدناه حسب طلب الإدارة.'}
              </p>
            </div>
          )}
        </div>

        {/* تتبع التقدم — للموافَق عليهم فقط */}
        {app.status === 'approved' && (
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <h3 className="text-base font-bold text-gray-900 mb-1">تتبع تقدم طلبك</h3>
            <p className="text-sm text-gray-600 mb-4">تحديثات من الإدارة تظهر هنا.</p>

            {/* خطوات التقدم — مراحل مخصصة للطلب أو المراحل العامة */}
            <div className="space-y-2 mb-4">
              {(Array.isArray(app.custom_progress_stages) && app.custom_progress_stages.length > 0
                ? app.custom_progress_stages.map((l: string) => ({ key: l, label: l }))
                : PROGRESS_STAGES_ORDER.map(k => ({ key: k, label: progressStageLabels[k] || k }))
              ).map(({ key, label }: { key: string; label: string }, idx: number) => {
                const isCustom = Array.isArray(app.custom_progress_stages) && app.custom_progress_stages.length > 0
                const currentIndex = isCustom && app.progress_stage
                  ? app.custom_progress_stages.indexOf(app.progress_stage)
                  : app.progress_stage ? PROGRESS_STAGES_ORDER.indexOf(app.progress_stage as typeof PROGRESS_STAGES_ORDER[number]) : -1
                const isCompleted = currentIndex >= 0 && idx < currentIndex
                const isCurrent = app.progress_stage === key
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

            {/* نسبة الإنجاز */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col">
                  <p className="text-xs text-gray-500">نسبة الإنجاز</p>
                  {app.progress_stage && (
                    <p className="text-xs font-medium text-primary-700 mt-0.5">
                      {progressStageLabels[app.progress_stage] || app.progress_stage}
                    </p>
                  )}
                </div>
                <p className="text-sm font-bold text-primary-600">{app.progress_percentage ?? 0}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, app.progress_percentage ?? 0))}%` }}
                />
              </div>
            </div>

            {/* ملاحظات التحديث من الإدارة */}
            {app.progress_notes && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-600 mb-1">آخر تحديث من الإدارة</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{app.progress_notes}</p>
              </div>
            )}

            {/* تاريخ آخر تحديث */}
            {(app.progress_updated_at || (app.progress_stage && app.updated_at)) && (
              <p className="text-xs text-gray-400 mt-3">
                آخر تحديث: {new Date(app.progress_updated_at || app.updated_at).toLocaleDateString('ar-TN', { dateStyle: 'medium' })} — {new Date(app.progress_updated_at || app.updated_at).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}

        {/* المستندات */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">المستندات</h3>
              <p className="text-xs text-gray-500 mt-0.5">PDF أو صور · يمكنك رفع أكثر من ملف</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3 mb-4">
            ارفع كل مستند مطلوب أدناه. بعد الرفع تنتظر المراجعة من الإدارة.
          </p>
          {docSlots.length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد مستندات مطلوبة حالياً.</p>
          ) : (
            <ul className="space-y-3">
              {docSlots.map((slot, slotIdx) => {
                const docs = getDocsForSlotHelper(slot.label)
                const pending = pendingByDocType[slot.label]
                const uploading = uploadingForDocType === slot.label
                
                // Check document statuses
                const hasRejected = docs.some((d: any) => d.status === 'rejected')
                const hasAccepted = docs.some((d: any) => d.status === 'accepted')
                const hasPendingReview = docs.some((d: any) => d.status === 'pending_review' || !d.status)
                const allRejected = docs.length > 0 && docs.every((d: any) => d.status === 'rejected')
                
                // Determine slot color:
                // - Green: Has accepted documents (good) - PRIORITY
                // - Blue: Has pending review documents (calm, waiting)
                // - Purple/Indigo: Extra/admin requested slot with pending/accepted (calm, informational)
                // - Orange: Extra/admin requested slot without documents (needs attention)
                // - Red: ALL documents rejected AND no pending/accepted (needs action)
                // - Gray: Default (no documents)
                const slotColor = hasAccepted
                  ? 'border-green-300 bg-green-50/60' // Has accepted - green (best state)
                  : hasPendingReview && !hasAccepted
                    ? slot.isExtra
                      ? 'border-indigo-300 bg-indigo-50/60' // Admin requested + pending - calm indigo
                      : 'border-blue-300 bg-blue-50/60' // Pending review - calm blue
                    : allRejected && !hasPendingReview
                      ? 'border-red-300 bg-red-50/60' // All rejected, no replacement - red
                      : slot.isExtra
                        ? 'border-purple-300 bg-purple-50/70' // Admin requested, no docs yet - soft purple
                        : 'border-gray-100 bg-gray-50/50' // Default - gray


                const statusLabel = hasAccepted
                  ? 'مقبول'
                  : hasPendingReview && !hasAccepted
                    ? 'قيد المراجعة'
                    : allRejected
                      ? 'مرفوض'
                      : 'مطلوب'
                const statusPillClass = hasAccepted
                  ? 'bg-green-100 text-green-800'
                  : hasPendingReview && !hasAccepted
                    ? 'bg-blue-100 text-blue-800'
                    : allRejected
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'

                return (
                  <li
                    key={slot.label}
                    className={`rounded-xl border-2 p-4 ${slotColor}`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-gray-900">{slot.label}</p>
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${statusPillClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        {allRejected && docs.find((d: any) => d.status === 'rejected')?.rejectionReason && (
                          <p className="text-xs text-red-600 mt-1">سبب الرفض: {docs.find((d: any) => d.status === 'rejected')?.rejectionReason}</p>
                        )}
                        {getDocsForSlotHelper(slot.label).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                            {getDocsForSlotHelper(slot.label).map((d: any) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => setPreviewDoc({ url: d.url, fileName: d.fileName })}
                                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                {d.fileName}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col gap-2">
                        {pending?.length ? (
                          <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-3 flex flex-col gap-2">
                            <p className="text-xs text-gray-700">{pending.length} ملف جاهز للرفع</p>
                            <div className="flex flex-wrap gap-2">
                              <input
                                ref={(el) => { fileInputRefs.current[slot.label] = el }}
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                className="hidden"
                                onChange={(e) => handleFileSelectFor(slot.label, e)}
                                disabled={uploading}
                              />
                              <button
                                type="button"
                                onClick={() => triggerFileInput(slot.label)}
                                disabled={uploading}
                                className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                إضافة
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmUploadFor(slot.label)}
                                disabled={uploading}
                                className="py-2 px-4 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700"
                              >
                                {uploading ? 'جاري الرفع...' : `رفع (${pending.length})`}
                              </button>
                              <button type="button" onClick={() => cancelPendingFor(slot.label)} disabled={uploading} className="py-2 px-3 rounded-lg bg-gray-200 text-gray-700 text-xs hover:bg-gray-300">
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              ref={(el) => { fileInputRefs.current[slot.label] = el }}
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              className="hidden"
                              onChange={(e) => handleFileSelectFor(slot.label, e)}
                              disabled={uploading}
                            />
                            <button
                              type="button"
                              onClick={() => triggerFileInput(slot.label)}
                              disabled={uploading}
                              className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 shadow-sm"
                            >
                              <Upload className="w-4 h-4" />
                              {allRejected ? 'استبدال المستند' : 'رفع مستند'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ملخص الطلب */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">ملخص الطلب</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-gray-500 text-xs font-medium">الاسم</dt><dd className="font-medium text-gray-900 mt-0.5">{[app.first_name, app.last_name].filter(Boolean).join(' ') || '—'}</dd></div>
            {!(app.email && String(app.email).endsWith('@domobat.user')) && (
              <div><dt className="text-gray-500 text-xs font-medium">البريد</dt><dd className="font-medium text-gray-900 mt-0.5 truncate" title={app.email || ''}>{app.email || '—'}</dd></div>
            )}
            <div><dt className="text-gray-500 text-xs font-medium">رقم البطاقة</dt><dd className="font-medium text-gray-900 mt-0.5">{app.national_id || '—'}</dd></div>
            <div><dt className="text-gray-500 text-xs font-medium">تاريخ الولادة</dt><dd className="font-medium text-gray-900 mt-0.5">{app.date_of_birth ? new Date(app.date_of_birth).toLocaleDateString('ar-TN') : '—'}</dd></div>
            <div><dt className="text-gray-500 text-xs font-medium">الحالة الاجتماعية</dt><dd className="font-medium text-gray-900 mt-0.5">{MARITAL_LABELS[app.marital_status] || app.marital_status || '—'}</dd></div>
            {(app.number_of_children != null && app.number_of_children > 0) && <div><dt className="text-gray-500 text-xs font-medium">عدد الأطفال</dt><dd className="font-medium text-gray-900 mt-0.5">{app.number_of_children}</dd></div>}
            <div><dt className="text-gray-500 text-xs font-medium">الولاية</dt><dd className="font-medium text-gray-900 mt-0.5">{app.governorate || '—'}</dd></div>
            {app.net_monthly_income != null && <div><dt className="text-gray-500 text-xs font-medium">الدخل الشهري (د.ت)</dt><dd className="font-medium text-gray-900 mt-0.5">{app.net_monthly_income}</dd></div>}
            {app.maximum_budget != null && <div><dt className="text-gray-500 text-xs font-medium">القدرة على الدفع (د.ت)</dt><dd className="font-medium text-gray-900 mt-0.5">{app.maximum_budget}</dd></div>}
            {app.required_area != null && <div><dt className="text-gray-500 text-xs font-medium">المساحة (م²)</dt><dd className="font-medium text-gray-900 mt-0.5">{app.required_area}</dd></div>}
            {app.desired_housing_type && <div><dt className="text-gray-500 text-xs font-medium">نوع السكن</dt><dd className="font-medium text-gray-900 mt-0.5">{app.desired_housing_type === 'apartment' ? 'شقة' : app.desired_housing_type}</dd></div>}
          </dl>
        </div>
      </main>

      {/* معاينة المستند في نافذة منبثقة */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 shrink-0">
              <p className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">{previewDoc.fileName}</p>
              <div className="flex items-center gap-2 shrink-0">
                <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-4 h-4" /> فتح في تبويب جديد
                </a>
                <button type="button" onClick={() => setPreviewDoc(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="إغلاق">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto bg-gray-100 flex items-center justify-center p-4">
              {/\.(pdf)$/i.test(previewDoc.fileName) ? (
                <iframe src={previewDoc.url} title={previewDoc.fileName} className="w-full h-[70vh] min-h-[400px] rounded-lg bg-white" />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.fileName} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* تأكيد الرفع — حفظ ورفع مع عرض نوع المستند وأسماء الملفات */}
      {confirmUploadFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !uploadingForDocType && setConfirmUploadFor(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-900 mb-1">حفظ ورفع المستندات</p>
            <p className="text-xs text-gray-600 mb-2">نوع المستند: <strong>{confirmUploadFor}</strong></p>
            <ul className="text-xs text-gray-700 mb-4 max-h-32 overflow-y-auto space-y-1">
              {(pendingByDocType[confirmUploadFor] || []).map((f, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                  {f.name}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mb-4">سيتم رفع {pendingByDocType[confirmUploadFor]?.length || 0} ملف(ات) وحفظها. تأكيد؟</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmUploadFor(null)}
                disabled={!!uploadingForDocType}
                className="flex-1 py-2.5 rounded-xl bg-gray-200 text-gray-800 text-sm font-medium disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!!uploadingForDocType}
                onClick={async () => {
                  if (!confirmUploadFor || uploadingForDocType) return
                  const ok = await uploadForDocType(confirmUploadFor)
                  if (ok) {
                    setConfirmUploadFor(null)
                    toast.success('تم حفظ ورفع المستندات')
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {uploadingForDocType === confirmUploadFor ? 'جاري الحفظ...' : 'حفظ ورفع'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
